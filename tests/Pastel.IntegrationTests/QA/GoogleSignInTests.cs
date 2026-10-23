using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Web;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Features.GoogleComplete;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Xunit;

namespace Pastel.IntegrationTests.QA;

/// <summary>
/// Casos F0-G02, G03, G05 a G10. El proveedor de Google no se contacta nunca: la lógica de vinculación se
/// ejerce directamente sobre <see cref="GoogleCompleteHandler"/> y el flujo HTTP se prueba hasta la redirección
/// a Google y el retorno manipulado, con credenciales ficticias que solo existen durante el arranque del host.
/// </summary>
[Collection(IdentityApiCollection.Name)]
public sealed class GoogleSignInTests : IClassFixture<IdentityApiFactory>
{
    private const string GoogleClientId = "qa-client-id.apps.googleusercontent.com";
    private const string GoogleClientSecret = "qa-client-secret-SENTINEL-4f81";
    private const string CodeSentinel = "CODE_SENTINEL_67890";
    private const string StateSentinel = "STATE_SENTINEL_12345";

    private readonly IdentityApiFactory _factory;

    public GoogleSignInTests(IdentityApiFactory factory) => _factory = factory;

    // ---------------------------------------------------------------- F0-G02 (variante automatizada)

    [Trait("RequirementId", "F0-G02")]
    [RequiresPostgresFact]
    public async Task G02_google_links_the_existing_account_invalidates_the_password_and_is_audited()
    {
        var suffix = Suffix();
        var email = $"qa.google.link.{suffix}@pastel.test";
        const string oldPassword = "Contrasena-Temporal-Anterior-2026!";
        var userId = await CreateUserAsync(email, oldPassword, mustChangePassword: true);
        var tokenVersionBefore = await TokenVersionAsync(userId);
        var subject = $"qa-sub-{suffix}";

        var outcome = await RunHandlerAsync(_factory, new GoogleIdentity(subject, email, true, "Cuenta QA"));

        Assert.NotNull(outcome.Session);
        Assert.Null(outcome.ErrorCode);
        using (var scope = CreateScope(_factory))
        {
            var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
            var user = await db.Users.AsNoTracking().SingleAsync(item => item.Id == userId);
            Assert.Null(user.PasswordHash);
            Assert.False(user.MustChangePassword);
            Assert.True(user.TokenVersion > tokenVersionBefore, "El vínculo debe invalidar los tokens vigentes.");
            var links = await db.ExternalLogins.AsNoTracking().Where(item => item.UserId == userId).ToListAsync();
            var link = Assert.Single(links);
            Assert.Equal(subject, link.ProviderSubject);
            Assert.Equal(ExternalLogin.GoogleProvider, link.Provider);
            var audit = await db.AuditLogs.AsNoTracking()
                .Where(item => item.TargetUserId == userId && item.Action == "auth.google.linked").ToListAsync();
            Assert.Contains(audit, entry => entry.DetailsJson is not null
                && entry.DetailsJson.Contains("passwordInvalidated", StringComparison.Ordinal));
        }

        // La contraseña anterior ya no sirve para entrar.
        using var client = NewClient(_factory, allowRedirect: true);
        var login = await PostJsonAsync(client, "/api/auth/login", new { email, password = oldPassword });
        Assert.Equal(HttpStatusCode.Unauthorized, login);
    }

    // ---------------------------------------------------------------- F0-G06, G07, G08

    [Trait("RequirementId", "F0-G06")]
    [RequiresPostgresFact]
    public async Task G06_unverified_google_email_is_rejected_and_creates_nothing()
    {
        var suffix = Suffix();
        var email = $"qa.google.unverified.{suffix}@pastel.test";
        var deniedBefore = await CountAuditAsync("auth.google.denied");

        var outcome = await RunHandlerAsync(_factory, new GoogleIdentity($"qa-sub-{suffix}", email, false, "Sin verificar"));

        Assert.Null(outcome.Session);
        Assert.Equal("email_unverified", outcome.ErrorCode);
        Assert.False(await UserExistsAsync(email));
        Assert.Equal(0, await CountLinksAsync($"qa-sub-{suffix}"));
        Assert.True(await CountAuditAsync("auth.google.denied") > deniedBefore, "El rechazo debe quedar auditado.");
    }

    [Trait("RequirementId", "F0-G07")]
    [RequiresPostgresFact]
    public async Task G07_blocked_or_inactive_accounts_get_the_generic_account_disabled_code()
    {
        var suffix = Suffix();

        // a) Cuenta ya vinculada que fue desactivada.
        var linkedEmail = $"qa.google.linked.{suffix}@pastel.test";
        var linkedUser = await CreateUserAsync(linkedEmail, "Contrasena-QA-Anterior-2026!", mustChangePassword: false);
        var linkedSubject = $"qa-sub-linked-{suffix}";
        var first = await RunHandlerAsync(_factory, new GoogleIdentity(linkedSubject, linkedEmail, true, "Vinculada"));
        Assert.NotNull(first.Session);
        await SetActiveAsync(linkedUser, false);
        var second = await RunHandlerAsync(_factory, new GoogleIdentity(linkedSubject, linkedEmail, true, "Vinculada"));
        Assert.Null(second.Session);
        Assert.Equal("account_disabled", second.ErrorCode);

        // b) Cuenta inactiva que aún no estaba vinculada: se rechaza sin crear el vínculo.
        var inactiveEmail = $"qa.google.inactive.{suffix}@pastel.test";
        var inactiveUser = await CreateUserAsync(inactiveEmail, "Contrasena-QA-Anterior-2026!", mustChangePassword: false);
        await SetActiveAsync(inactiveUser, false);
        var inactiveSubject = $"qa-sub-inactive-{suffix}";
        var third = await RunHandlerAsync(_factory, new GoogleIdentity(inactiveSubject, inactiveEmail, true, "Inactiva"));
        Assert.Null(third.Session);
        Assert.Equal("account_disabled", third.ErrorCode);
        Assert.Equal(0, await CountLinksAsync(inactiveSubject));
    }

    [Trait("RequirementId", "F0-G08")]
    [RequiresPostgresFact]
    public async Task G08_new_email_is_rejected_when_sign_up_is_closed_and_registered_as_member_when_open()
    {
        var suffix = Suffix();
        var closedEmail = $"qa.google.closed.{suffix}@pastel.test";
        var closed = await RunHandlerAsync(
            _factory,
            new GoogleIdentity($"qa-sub-closed-{suffix}", closedEmail, true, "Registro cerrado"),
            allowSignUp: false);

        Assert.Null(closed.Session);
        Assert.Equal("signup_closed", closed.ErrorCode);
        Assert.False(await UserExistsAsync(closedEmail));

        // Control: con el registro abierto el mismo tipo de correo nuevo sí se crea, solo con el rol Member.
        var openEmail = $"qa.google.open.{suffix}@pastel.test";
        var open = await RunHandlerAsync(
            _factory,
            new GoogleIdentity($"qa-sub-open-{suffix}", openEmail, true, "Registro abierto"),
            allowSignUp: true);
        Assert.NotNull(open.Session);
        Assert.Equal(new[] { "MEMBER" }, await RoleNamesOfAsync(openEmail));
    }

    // ---------------------------------------------------------------- F0-G03 y F0-G05 (HTTP, hasta Google)

    [Trait("RequirementId", "F0-G03")]
    [RequiresPostgresFact]
    public async Task G03_start_sends_the_exact_redirect_uri_with_state_and_pkce_and_no_secret()
    {
        using var google = CreateGoogleFactory();
        using var client = NewClient(google, allowRedirect: false);

        var response = await client.GetAsync("/api/auth/google/start?returnUrl=%2Fcosecha");

        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        var location = response.Headers.Location ?? throw new InvalidOperationException("Sin cabecera Location.");
        Assert.Equal("accounts.google.com", location.Host);
        var query = HttpUtility.ParseQueryString(location.Query);
        var publicBase = google.Services.GetRequiredService<IConfiguration>()["App:PublicBaseUrl"]!.TrimEnd('/');
        Assert.Equal($"{publicBase}/api/auth/google/callback", query["redirect_uri"]);
        Assert.Equal(GoogleClientId, query["client_id"]);
        Assert.False(string.IsNullOrWhiteSpace(query["state"]));
        Assert.Equal("S256", query["code_challenge_method"]);
        Assert.False(string.IsNullOrWhiteSpace(query["code_challenge"]));
        Assert.Null(query["client_secret"]);
        Assert.DoesNotContain(GoogleClientSecret, location.OriginalString, StringComparison.Ordinal);
        var scopes = (query["scope"] ?? string.Empty).Split(' ');
        Assert.Contains("openid", scopes);
        Assert.Contains("email", scopes);
    }

    [Trait("RequirementId", "F0-G05")]
    [RequiresPostgresFact]
    public async Task G05_callback_with_an_altered_missing_or_denied_state_is_rejected_without_a_session()
    {
        using var google = CreateGoogleFactory();
        using var withCorrelation = NewClient(google, allowRedirect: false);
        var start = await withCorrelation.GetAsync("/api/auth/google/start");
        Assert.Equal(HttpStatusCode.Redirect, start.StatusCode);

        var tampered = await withCorrelation.GetAsync(
            $"/api/auth/google/callback?code={CodeSentinel}&state={StateSentinel}");
        AssertFailedRedirect(tampered, "/ingresar?error=failed");

        using var withoutCookies = NewClient(google, allowRedirect: false);
        var missingState = await withoutCookies.GetAsync($"/api/auth/google/callback?code={CodeSentinel}");
        AssertFailedRedirect(missingState, "/ingresar?error=failed");

        using var denied = NewClient(google, allowRedirect: false);
        var cancelled = await denied.GetAsync("/api/auth/google/callback?error=access_denied");
        AssertFailedRedirect(cancelled, "/ingresar?error=google_denied");
    }

    // ---------------------------------------------------------------- F0-G09 y F0-G10

    [Trait("RequirementId", "F0-G09")]
    [RequiresPostgresFact]
    public async Task G09_google_tokens_are_never_stored_in_options_database_or_cookies()
    {
        using var google = CreateGoogleFactory();
        var options = google.Services.GetRequiredService<IOptionsMonitor<GoogleOptions>>().Get(ExternalSchemes.Google);
        Assert.False(options.SaveTokens, "SaveTokens debe estar desactivado.");
        Assert.True(options.UsePkce);

        using var scope = CreateScope(google);
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var entity = db.Model.FindEntityType(typeof(ExternalLogin)) ?? throw new InvalidOperationException("Sin entidad.");
        var columns = entity.GetProperties().Select(property => property.Name).ToList();
        Assert.DoesNotContain(columns, name => name.Contains("Token", StringComparison.OrdinalIgnoreCase)
            || name.Contains("Secret", StringComparison.OrdinalIgnoreCase));

        // El flujo fallido no deja cookies de sesión ni de tokens de Google.
        using var client = NewClient(google, allowRedirect: false);
        await client.GetAsync("/api/auth/google/start");
        var response = await client.GetAsync($"/api/auth/google/callback?code={CodeSentinel}&state={StateSentinel}");
        var cookies = SetCookies(response);
        Assert.DoesNotContain(cookies, cookie => cookie.Contains("access_token", StringComparison.OrdinalIgnoreCase)
            || cookie.Contains("id_token", StringComparison.OrdinalIgnoreCase)
            || cookie.Contains("refresh_token", StringComparison.OrdinalIgnoreCase));
    }

    [Trait("RequirementId", "F0-G10")]
    [RequiresPostgresFact]
    public async Task G10_logs_during_the_google_flow_contain_no_code_state_tokens_or_emails()
    {
        var logs = new CapturingLoggerProvider();
        using var google = CreateGoogleFactory(logs);
        var suffix = Suffix();
        var email = $"qa.google.logs.{suffix}@pastel.test";
        var subject = $"qa-sub-logs-{suffix}";
        await CreateUserAsync(email, "Contrasena-QA-Anterior-2026!", mustChangePassword: false);

        using var client = NewClient(google, allowRedirect: false);
        await client.GetAsync("/api/auth/google/start");
        await client.GetAsync($"/api/auth/google/callback?code={CodeSentinel}&state={StateSentinel}");
        await RunHandlerAsync(google, new GoogleIdentity(subject, email, true, "Cuenta QA"));
        await RunHandlerAsync(google, new GoogleIdentity($"qa-sub-unverified-{suffix}", $"qa.google.logs2.{suffix}@pastel.test", false, "Sin verificar"));

        var captured = logs.Messages.ToArray();
        Assert.Contains(captured, line => line.Contains("Google no completó el ingreso", StringComparison.Ordinal));
        Assert.Contains(captured, line => line.Contains("Google quedó vinculado", StringComparison.Ordinal));
        var all = string.Join("\n", captured);
        foreach (var forbidden in new[] { CodeSentinel, StateSentinel, GoogleClientSecret, email, subject, "qa.google.logs2." })
        {
            Assert.DoesNotContain(forbidden, all, StringComparison.Ordinal);
        }
    }

    // ---------------------------------------------------------------- Infraestructura de prueba

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

                if (exception is not null)
                {
                    text += "|" + exception;
                }

                sink.Enqueue(text);
            }
        }
    }

    /// <summary>
    /// Host derivado con un esquema Google registrado con credenciales ficticias. El esquema se decide al registrar
    /// los servicios (lee la configuración de forma anticipada), por eso las credenciales se pasan como variables de
    /// entorno solo mientras arranca el host y se retiran de inmediato.
    /// </summary>
    private WebApplicationFactory<global::Program> CreateGoogleFactory(CapturingLoggerProvider? logs = null)
    {
        var factory = _factory.WithWebHostBuilder(builder =>
        {
            if (logs is not null)
            {
                // Mismos niveles que `Serilog:MinimumLevel` de appsettings.json (producción): Information por defecto y
                // Warning para Microsoft.AspNetCore, EF Core y HttpClient. Con Information, ASP.NET registraría la URL
                // completa del callback (con code y state); por eso esa categoría se mantiene en Warning.
                builder.ConfigureTestServices(services => services.AddSingleton<ILoggerFactory>(_ =>
                    LoggerFactory.Create(logging => logging
                        .SetMinimumLevel(LogLevel.Information)
                        .AddFilter("Microsoft.AspNetCore", LogLevel.Warning)
                        .AddFilter("Microsoft.EntityFrameworkCore", LogLevel.Warning)
                        .AddFilter("System.Net.Http.HttpClient", LogLevel.Warning)
                        .AddProvider(logs))));
            }
        });

        Environment.SetEnvironmentVariable("Authentication__Google__ClientId", GoogleClientId);
        Environment.SetEnvironmentVariable("Authentication__Google__ClientSecret", GoogleClientSecret);
        try
        {
            _ = factory.Server;
        }
        finally
        {
            Environment.SetEnvironmentVariable("Authentication__Google__ClientId", null);
            Environment.SetEnvironmentVariable("Authentication__Google__ClientSecret", null);
        }

        return factory;
    }

    private static HttpClient NewClient(WebApplicationFactory<global::Program> factory, bool allowRedirect) =>
        factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = true,
            AllowAutoRedirect = allowRedirect,
        });

    private static IServiceScope CreateScope(WebApplicationFactory<global::Program> factory)
    {
        _ = factory.Server;
        return factory.Services.CreateScope();
    }

    private static async Task<GoogleSignInOutcome> RunHandlerAsync(
        WebApplicationFactory<global::Program> factory,
        GoogleIdentity identity,
        bool? allowSignUp = null)
    {
        using var scope = CreateScope(factory);
        var handler = allowSignUp is { } allow
            ? ActivatorUtilities.CreateInstance<GoogleCompleteHandler>(
                scope.ServiceProvider,
                Options.Create(new AuthOptions { Google = new GoogleAuthOptions { AllowSignUp = allow } }))
            : scope.ServiceProvider.GetRequiredService<GoogleCompleteHandler>();
        return await handler.HandleAsync(identity, CancellationToken.None);
    }

    private static void AssertFailedRedirect(HttpResponseMessage response, string expectedLocation)
    {
        if (response.StatusCode != HttpStatusCode.Redirect
            || response.Headers.Location?.OriginalString != expectedLocation)
        {
            Assert.Fail(
                $"Se esperaba 302 a {expectedLocation} y se obtuvo {(int)response.StatusCode} a {response.Headers.Location}.");
        }

        var location = response.Headers.Location?.OriginalString ?? string.Empty;
        Assert.DoesNotContain(CodeSentinel, location, StringComparison.Ordinal);
        Assert.DoesNotContain(StateSentinel, location, StringComparison.Ordinal);
        Assert.DoesNotContain(SetCookies(response), cookie =>
            cookie.StartsWith("__Host-pastel_access", StringComparison.Ordinal)
            || cookie.StartsWith("__Host-pastel_refresh", StringComparison.Ordinal));
    }

    private static string[] SetCookies(HttpResponseMessage response) =>
        response.Headers.TryGetValues("Set-Cookie", out var values) ? values.ToArray() : [];

    private static async Task<HttpStatusCode> PostJsonAsync(HttpClient client, string path, object body)
    {
        using var csrfResponse = await client.GetAsync("/api/auth/csrf");
        csrfResponse.EnsureSuccessStatusCode();
        using var document = JsonDocument.Parse(await csrfResponse.Content.ReadAsStringAsync());
        var token = document.RootElement.GetProperty("csrfToken").GetString()!;
        using var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = JsonContent.Create(body) };
        request.Headers.Add("X-CSRF-TOKEN", token);
        using var response = await client.SendAsync(request);
        return response.StatusCode;
    }

    private static string Suffix() => Guid.NewGuid().ToString("N")[..8];

    private async Task<Guid> CreateUserAsync(string email, string password, bool mustChangePassword)
    {
        using var scope = CreateScope(_factory);
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<AppUser>>();
        var now = DateTimeOffset.UtcNow;
        var user = new AppUser
        {
            Email = email,
            NormalizedEmail = email.ToUpperInvariant(),
            DisplayName = "QA Google",
            IsActive = true,
            MustChangePassword = mustChangePassword,
            CreatedAt = now,
            UpdatedAt = now,
        };
        user.PasswordHash = hasher.HashPassword(user, password);
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user.Id;
    }

    private async Task<int> TokenVersionAsync(Guid userId)
    {
        using var scope = CreateScope(_factory);
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        return await db.Users.Where(user => user.Id == userId).Select(user => user.TokenVersion).SingleAsync();
    }

    private async Task SetActiveAsync(Guid userId, bool active)
    {
        using var scope = CreateScope(_factory);
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var user = await db.Users.SingleAsync(item => item.Id == userId);
        user.IsActive = active;
        await db.SaveChangesAsync();
    }

    private async Task<bool> UserExistsAsync(string email)
    {
        using var scope = CreateScope(_factory);
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var normalized = email.ToUpperInvariant();
        return await db.Users.AnyAsync(user => user.NormalizedEmail == normalized);
    }

    private async Task<int> CountLinksAsync(string subject)
    {
        using var scope = CreateScope(_factory);
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        return await db.ExternalLogins.CountAsync(link => link.ProviderSubject == subject);
    }

    private async Task<int> CountAuditAsync(string action)
    {
        using var scope = CreateScope(_factory);
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        return await db.AuditLogs.CountAsync(entry => entry.Action == action);
    }

    private async Task<string[]> RoleNamesOfAsync(string email)
    {
        using var scope = CreateScope(_factory);
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var normalized = email.ToUpperInvariant();
        return await db.UserRoles
            .Where(link => link.User.NormalizedEmail == normalized)
            .Select(link => link.Role.NormalizedName)
            .ToArrayAsync();
    }
}
