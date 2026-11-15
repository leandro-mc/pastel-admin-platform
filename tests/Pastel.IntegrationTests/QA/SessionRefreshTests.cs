using System.Collections.Concurrent;
using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Npgsql;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Features.Refresh;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Xunit;

namespace Pastel.IntegrationTests.QA;

/// <summary>
/// Casos F0-S203 a F0-S205 sobre la rotación del refresh token. Las pruebas de ventana de gracia y reutilización
/// ejercen <see cref="RefreshHandler"/> en ámbitos separados (equivalen a peticiones distintas); el conflicto de
/// serialización se simula con un interceptor de EF Core y se comprueba por HTTP.
/// </summary>
[Collection(IdentityApiCollection.Name)]
public sealed class SessionRefreshTests : IClassFixture<IdentityApiFactory>
{
    private const string MemberEmail = "test.member@pastel.local";
    private const string MemberPassword = "Local-Only-Test-Member-2026!";

    private readonly IdentityApiFactory _factory;

    public SessionRefreshTests(IdentityApiFactory factory) => _factory = factory;

    // ---------------------------------------------------------------- F0-S203

    [Trait("RequirementId", "F0-S203")]
    [RequiresPostgresFact]
    public async Task S203_a_second_refresh_with_the_same_token_inside_the_grace_window_gets_the_same_valid_session()
    {
        var userId = await CreateUserAsync();
        var token = await IssueRefreshTokenAsync(_factory, userId);
        var versionBefore = await TokenVersionAsync(userId);

        var first = await RefreshAsync(_factory, token);
        var second = await RefreshAsync(_factory, token);

        Assert.False(first.IsFailure);
        Assert.False(second.IsFailure);
        Assert.Equal(first.Value.RefreshToken, second.Value.RefreshToken);
        Assert.Equal(versionBefore, await TokenVersionAsync(userId));
        Assert.Equal(0, await CountAuditAsync(userId, "auth.refresh.reuse-detected"));
        Assert.Equal(1, await CountAuditAsync(userId, "auth.refresh.grace-reused"));
        Assert.Equal(1, await CountUnrevokedTokensAsync(userId));
    }

    [Trait("RequirementId", "F0-S203")]
    [RequiresPostgresFact]
    public async Task S203_two_tabs_refreshing_at_the_same_time_both_succeed_and_no_session_is_revoked()
    {
        var userId = await CreateUserAsync();
        var token = await IssueRefreshTokenAsync(_factory, userId);
        var versionBefore = await TokenVersionAsync(userId);

        var results = await Task.WhenAll(RefreshAsync(_factory, token), RefreshAsync(_factory, token));

        Assert.All(results, result => Assert.False(result.IsFailure));
        Assert.Equal(versionBefore, await TokenVersionAsync(userId));
        Assert.Equal(0, await CountAuditAsync(userId, "auth.refresh.reuse-detected"));
    }

    // ---------------------------------------------------------------- F0-S204

    [Trait("RequirementId", "F0-S204")]
    [RequiresPostgresFact]
    public async Task S204_reusing_a_rotated_token_after_the_grace_window_revokes_every_session_and_warns()
    {
        var logs = new CapturingLoggerProvider();
        using var host = CreateHost(logs);
        var userId = await CreateUserAsync();
        var token = await IssueRefreshTokenAsync(host, userId);
        var other = await IssueRefreshTokenAsync(host, userId);
        var versionBefore = await TokenVersionAsync(userId);

        var rotated = await RefreshAsync(host, token);
        Assert.False(rotated.IsFailure);
        await ExpireGraceWindowAsync(token);

        var reuse = await RefreshAsync(host, token);

        Assert.True(reuse.IsFailure);
        Assert.True(await TokenVersionAsync(userId) > versionBefore, "TokenVersion debe aumentar.");
        Assert.Equal(0, await CountUnrevokedTokensAsync(userId));
        Assert.Equal(1, await CountAuditAsync(userId, "auth.refresh.reuse-detected"));
        var captured = logs.Messages.ToArray();
        Assert.Contains(captured, line => line.Contains("|Warning|", StringComparison.Ordinal)
            && line.Contains("Se reutilizó un refresh token", StringComparison.Ordinal));
        foreach (var secret in new[] { token, other, rotated.Value.RefreshToken })
        {
            Assert.DoesNotContain(secret, string.Join("\n", captured), StringComparison.Ordinal);
        }
    }

    // ---------------------------------------------------------------- F0-S205

    [Trait("RequirementId", "F0-S205")]
    [RequiresPostgresFact]
    public async Task S205_a_simulated_serialization_conflict_is_retried_and_an_exhausted_one_is_never_a_500()
    {
        var conflicts = new SerializationConflictInterceptor();
        using var host = CreateHost(logs: null, conflicts);
        using var client = host.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = true,
            AllowAutoRedirect = false,
        });
        await LoginAsync(client);

        // Un conflicto: se reintenta y la renovación termina bien.
        conflicts.Arm(1);
        var retried = await RefreshOverHttpAsync(client);
        Assert.Equal(HttpStatusCode.OK, retried);
        Assert.Equal(1, conflicts.Triggered);

        // Conflicto en todos los intentos: respuesta controlada (409 o 503), nunca 500.
        conflicts.Arm(100);
        var exhausted = await RefreshOverHttpAsync(client);
        Assert.NotEqual(HttpStatusCode.InternalServerError, exhausted);
        Assert.Contains(exhausted, new[] { HttpStatusCode.Conflict, HttpStatusCode.ServiceUnavailable });
        Assert.Equal(1 + 3, conflicts.Triggered);

        // Sin más conflictos, la sesión sigue siendo recuperable: no quedó nada a medias.
        conflicts.Arm(0);
        Assert.Equal(HttpStatusCode.OK, await RefreshOverHttpAsync(client));
    }

    // ---------------------------------------------------------------- Infraestructura de prueba

    private sealed class SerializationConflictInterceptor : SaveChangesInterceptor
    {
        private int _remaining;
        private int _triggered;

        public int Triggered => Volatile.Read(ref _triggered);

        public void Arm(int conflicts) => Volatile.Write(ref _remaining, conflicts);

        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            var rotating = eventData.Context is { } context
                && context.ChangeTracker.Entries<RefreshToken>().Any(entry => entry.State == EntityState.Modified);
            if (rotating && Interlocked.Decrement(ref _remaining) >= 0)
            {
                Interlocked.Increment(ref _triggered);
                throw new PostgresException(
                    "conflicto de serialización simulado", "ERROR", "ERROR", PostgresErrorCodes.SerializationFailure);
            }

            return base.SavingChangesAsync(eventData, result, cancellationToken);
        }
    }

    private sealed class CapturingLoggerProvider : ILoggerProvider
    {
        public ConcurrentQueue<string> Messages { get; } = new();

        public ILogger CreateLogger(string categoryName) => new CapturingLogger(categoryName, Messages);

        public void Dispose()
        {
        }

        private sealed class CapturingLogger(string category, ConcurrentQueue<string> sink) : ILogger
        {
            public IDisposable? BeginScope<TState>(TState state)
                where TState : notnull => null;

            public bool IsEnabled(LogLevel logLevel) => true;

            public void Log<TState>(
                LogLevel logLevel,
                EventId eventId,
                TState state,
                Exception? exception,
                Func<TState, Exception?, string> formatter)
            {
                var text = $"{category}|{logLevel}|{eventId.Id}|{formatter(state, exception)}";
                if (state is IEnumerable<KeyValuePair<string, object?>> pairs)
                {
                    text += "|" + string.Join(",", pairs.Select(pair => $"{pair.Key}={pair.Value}"));
                }

                sink.Enqueue(text);
            }
        }
    }

    /// <summary>Host derivado con registro de logs capturado (niveles de producción) y/o un interceptor de EF Core.</summary>
    private WebApplicationFactory<global::Program> CreateHost(
        CapturingLoggerProvider? logs,
        SerializationConflictInterceptor? interceptor = null)
    {
        var factory = _factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            if (logs is not null)
            {
                services.AddSingleton<ILoggerFactory>(_ => LoggerFactory.Create(logging => logging
                    .SetMinimumLevel(LogLevel.Information)
                    .AddFilter("Microsoft.AspNetCore", LogLevel.Warning)
                    .AddFilter("Microsoft.EntityFrameworkCore", LogLevel.Warning)
                    .AddProvider(logs)));
            }

            if (interceptor is not null)
            {
                var connectionString = Environment.GetEnvironmentVariable("PASTEL_TEST_CONNECTION_STRING")!;
                services.RemoveAll<DbContextOptions<IdentityDbContext>>();
                services.RemoveAll<IdentityDbContext>();
                services.AddDbContext<IdentityDbContext>(options => options
                    .UseNpgsql(
                        connectionString,
                        npgsql => npgsql
                            .MigrationsHistoryTable("__EFMigrationsHistory", IdentityDbContext.Schema)
                            .MigrationsAssembly(typeof(IdentityDbContext).Assembly.GetName().Name))
                    .AddInterceptors(interceptor));
            }
        }));
        _ = factory.Server;
        return factory;
    }

    private static IServiceScope CreateScope(WebApplicationFactory<global::Program> factory)
    {
        _ = factory.Server;
        return factory.Services.CreateScope();
    }

    private async Task<Guid> CreateUserAsync()
    {
        using var scope = CreateScope(_factory);
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<AppUser>>();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"qa.refresh.{suffix}@pastel.test";
        var now = DateTimeOffset.UtcNow;
        var user = new AppUser
        {
            Email = email,
            NormalizedEmail = email.ToUpperInvariant(),
            DisplayName = "QA refresco",
            IsActive = true,
            MustChangePassword = false,
            CreatedAt = now,
            UpdatedAt = now,
        };
        user.PasswordHash = hasher.HashPassword(user, $"Qa-Refresh-{suffix}-Passphrase-2026!");
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user.Id;
    }

    /// <summary>Emite una sesión como lo haría el inicio de sesión y devuelve el refresh token en claro.</summary>
    private static async Task<string> IssueRefreshTokenAsync(WebApplicationFactory<global::Program> factory, Guid userId)
    {
        using var scope = CreateScope(factory);
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var issuer = scope.ServiceProvider.GetRequiredService<SessionIssuer>();
        var user = await db.Users.SingleAsync(item => item.Id == userId);
        var session = issuer.Issue(user);
        await db.SaveChangesAsync();
        return session.RefreshToken;
    }

    private static async Task<Pastel.SharedKernel.Result<IssuedSession>> RefreshAsync(
        WebApplicationFactory<global::Program> factory,
        string token)
    {
        using var scope = CreateScope(factory);
        var handler = scope.ServiceProvider.GetRequiredService<RefreshHandler>();
        return await handler.HandleAsync(token, CancellationToken.None);
    }

    private async Task ExpireGraceWindowAsync(string token)
    {
        using var scope = CreateScope(_factory);
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var hash = TokenSecrets.Hash(token);
        var stored = await db.RefreshTokens.SingleAsync(item => item.TokenHash == hash);
        stored.GraceUntil = DateTimeOffset.UtcNow.AddMinutes(-1);
        await db.SaveChangesAsync();
    }

    private async Task<int> TokenVersionAsync(Guid userId)
    {
        using var scope = CreateScope(_factory);
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        return await db.Users.Where(user => user.Id == userId).Select(user => user.TokenVersion).SingleAsync();
    }

    private async Task<int> CountAuditAsync(Guid userId, string action)
    {
        using var scope = CreateScope(_factory);
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        return await db.AuditLogs.CountAsync(entry => entry.TargetUserId == userId && entry.Action == action);
    }

    private async Task<int> CountUnrevokedTokensAsync(Guid userId)
    {
        using var scope = CreateScope(_factory);
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        return await db.RefreshTokens.CountAsync(token => token.UserId == userId && token.RevokedAt == null);
    }

    private static async Task<string> CsrfTokenAsync(HttpClient client)
    {
        using var response = await client.GetAsync("/api/auth/csrf");
        response.EnsureSuccessStatusCode();
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.GetProperty("csrfToken").GetString()!;
    }

    private static async Task LoginAsync(HttpClient client)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = System.Net.Http.Json.JsonContent.Create(new { email = MemberEmail, password = MemberPassword }),
        };
        request.Headers.Add("X-CSRF-TOKEN", await CsrfTokenAsync(client));
        using var response = await client.SendAsync(request);
        if (response.StatusCode != HttpStatusCode.OK)
        {
            Assert.Fail($"El inicio de sesión devolvió {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        }
    }

    private static async Task<HttpStatusCode> RefreshOverHttpAsync(HttpClient client)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
        request.Headers.Add("X-CSRF-TOKEN", await CsrfTokenAsync(client));
        using var response = await client.SendAsync(request);
        return response.StatusCode;
    }
}
