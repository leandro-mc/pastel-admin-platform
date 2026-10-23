using System.Net;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Persistence;
using Xunit;
using static Pastel.IntegrationTests.QA.QaSupport;

namespace Pastel.IntegrationTests.QA;

/// <summary>
/// Casos F0-E02, E05, E06 y E08. Se prueba el pipeline real de logs (Serilog en JSON hacia la salida estándar,
/// capturada mientras vive cada host), con la configuración de producción de appsettings.json.
/// </summary>
[Collection(IdentityApiCollection.Name)]
public sealed class LoggingPipelineTests : IClassFixture<IdentityApiFactory>
{
    private const string AdminEmail = "test.admin@pastel.local";
    private const string AdminPassword = "Local-Only-Test-Admin-2026!";
    private const string MemberEmail = "test.member@pastel.local";
    private const string MemberPassword = "Local-Only-Test-Member-2026!";
    private const string InternalSecret = "SECRETO-INTERNO-NO-FILTRAR Host=db-interna;Password=hunter2";

    private readonly IdentityApiFactory _factory;

    public LoggingPipelineTests(IdentityApiFactory factory) => _factory = factory;

    // ---------------------------------------------------------------- F0-E02

    [Trait("RequirementId", "F0-E02")]
    [RequiresPostgresFact]
    public async Task E02_an_unexpected_exception_returns_a_generic_500_and_is_logged_with_the_same_trace_id()
    {
        var failure = new UnexpectedFailureInterceptor();
        using var capture = new ConsoleCapture();
        using var host = CreateHost(_factory, failure);
        using var client = NewClient(host);
        await LoginAsync(client, MemberEmail, MemberPassword);
        var mark = capture.Text.Length;

        failure.Arm();
        using var response = await SendAsync(client, HttpMethod.Post, "/api/auth/refresh");

        var problem = await AssertProblemAsync(response, HttpStatusCode.InternalServerError);
        var body = problem.GetRawText();
        Assert.DoesNotContain("SECRETO-INTERNO", body, StringComparison.Ordinal);
        Assert.DoesNotContain("hunter2", body, StringComparison.Ordinal);

        var traceId = problem.GetProperty("traceId").GetString();
        var entries = LogEntries(capture.Text, mark);
        Assert.Contains(entries, entry => (Property(entry, "@x") ?? string.Empty).Contains("SECRETO-INTERNO", StringComparison.Ordinal)
            && (Property(entry, "TraceId") == traceId || Property(entry, "RequestId") == traceId));
    }

    // ---------------------------------------------------------------- F0-E05

    [Trait("RequirementId", "F0-E05")]
    [RequiresPostgresFact]
    public async Task E05_login_refresh_and_password_change_leave_no_secrets_in_the_logs()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"qa.logs.{suffix}@pastel.test";
        var unknownEmail = $"qa.logs.desconocido.{suffix}@pastel.test";
        var currentPassword = $"Qa-Actual-{suffix}-SENTINELA-2026!";
        var wrongPassword = $"Qa-Erronea-{suffix}-SENTINELA-2026!";
        var newPassword = $"Qa-Nueva-{suffix}-SENTINELA-2026!";
        await CreateUserAsync(email, currentPassword);

        using var capture = new ConsoleCapture();
        using var host = CreateHost(_factory);
        using var client = NewClient(host);
        var cookieValues = new List<string>();

        using (var login = await SendAsync(client, HttpMethod.Post, "/api/auth/login", new { email, password = currentPassword }))
        {
            ExpectSuccess(login, "login");
            cookieValues.AddRange(CookieValues(login));
        }

        using (var bad = await SendAsync(client, HttpMethod.Post, "/api/auth/login", new { email = unknownEmail, password = wrongPassword }))
        {
            Assert.Equal(HttpStatusCode.Unauthorized, bad.StatusCode);
        }

        using (var refresh = await SendAsync(client, HttpMethod.Post, "/api/auth/refresh"))
        {
            ExpectSuccess(refresh, "refresh");
            cookieValues.AddRange(CookieValues(refresh));
        }

        using (var change = await SendAsync(client, HttpMethod.Post, "/api/auth/change-password", new { currentPassword, newPassword }))
        {
            ExpectSuccess(change, "cambio de contraseña");
        }

        using (var again = await SendAsync(client, HttpMethod.Post, "/api/auth/login", new { email, password = newPassword }))
        {
            ExpectSuccess(again, "login con la contraseña nueva");
            cookieValues.AddRange(CookieValues(again));
        }

        var hash = await PasswordHashOfAsync(email);
        var text = capture.Text;
        Assert.Contains("respondió", text, StringComparison.Ordinal);
        var secrets = new List<string> { email, unknownEmail, currentPassword, wrongPassword, newPassword, hash };
        secrets.AddRange(cookieValues.Where(value => value.Length >= 16));
        foreach (var secret in secrets)
        {
            Assert.DoesNotContain(secret, text, StringComparison.Ordinal);
        }

        Assert.False(
            Regex.IsMatch(text, @"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"),
            "Los logs no deben contener JWT.");
    }

    // ---------------------------------------------------------------- F0-E06

    [Trait("RequirementId", "F0-E06")]
    [RequiresPostgresFact]
    public async Task E06_each_request_writes_one_json_summary_line_with_trace_user_and_module_and_no_body()
    {
        using var capture = new ConsoleCapture();
        using var host = CreateHost(_factory);
        using var client = NewClient(host);
        await LoginAsync(client, AdminEmail, AdminPassword);
        var adminId = await UserIdByEmailAsync(AdminEmail);
        var mark = capture.Text.Length;

        using var response = await SendAsync(client, HttpMethod.Get, "/api/admin/users/");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var entries = LogEntries(capture.Text, mark);
        var summaries = entries.Where(entry =>
            (Property(entry, "@mt") ?? string.Empty).Contains("respondió", StringComparison.Ordinal)
            && (Property(entry, "RequestPath") ?? string.Empty).Contains("/api/admin/users", StringComparison.Ordinal)).ToList();
        var summary = Assert.Single(summaries);
        Assert.Equal("200", Property(summary, "StatusCode"));
        Assert.Equal("identity", Property(summary, "Module"));
        Assert.Equal(adminId.ToString(), Property(summary, "UserId"), ignoreCase: true);
        Assert.False(
            string.IsNullOrWhiteSpace(Property(summary, "TraceId") ?? Property(summary, "RequestId")),
            "La línea de resumen debe llevar el identificador de traza.");
        Assert.Null(Property(summary, "RequestBody"));
        Assert.Null(Property(summary, "Body"));
    }

    // ---------------------------------------------------------------- F0-E08

    [Trait("RequirementId", "F0-E08")]
    [RequiresPostgresFact]
    public async Task E08_repeated_denied_access_is_logged_and_audited_once_per_minute_and_does_not_flood_the_log()
    {
        using var capture = new ConsoleCapture();
        using var host = CreateHost(_factory);
        using var client = NewClient(host);
        await LoginAsync(client, MemberEmail, MemberPassword);
        var memberId = await UserIdByEmailAsync(MemberEmail);
        var auditBefore = await CountDeniedAuditAsync(memberId);
        var mark = capture.Text.Length;

        for (var attempt = 0; attempt < 30; attempt++)
        {
            var status = await StatusOfAsync(client, HttpMethod.Get, "/api/admin/audit/");
            Assert.Equal(HttpStatusCode.Forbidden, status);
        }

        var entries = LogEntries(capture.Text, mark);
        var deniedLogs = entries.Count(entry =>
            (Property(entry, "@mt") ?? string.Empty).Contains("Acceso denegado al permiso", StringComparison.Ordinal));
        var warnings = entries.Count(entry => Property(entry, "@l") == "Warning");
        Assert.Equal(1, deniedLogs);
        Assert.True(warnings <= 2, $"30 accesos denegados generaron {warnings} advertencias; el log se inunda.");
        Assert.Equal(auditBefore + 1, await CountDeniedAuditAsync(memberId));
    }

    // ---------------------------------------------------------------- Infraestructura de prueba

    private sealed class UnexpectedFailureInterceptor : SaveChangesInterceptor
    {
        private int _armed;

        public void Arm() => Volatile.Write(ref _armed, 1);

        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            var rotating = eventData.Context is { } context
                && context.ChangeTracker.Entries<RefreshToken>().Any(entry => entry.State == EntityState.Modified);
            if (rotating && Interlocked.Exchange(ref _armed, 0) == 1)
            {
                throw new InvalidOperationException(InternalSecret);
            }

            return base.SavingChangesAsync(eventData, result, cancellationToken);
        }
    }

    private static void ExpectSuccess(HttpResponseMessage response, string operation)
    {
        if (!response.IsSuccessStatusCode)
        {
            Assert.Fail($"{operation} devolvió {(int)response.StatusCode}.");
        }
    }

    private static IEnumerable<string> CookieValues(HttpResponseMessage response)
    {
        if (!response.Headers.TryGetValues("Set-Cookie", out var cookies))
        {
            yield break;
        }

        foreach (var cookie in cookies)
        {
            var pair = cookie.Split(';')[0];
            var separator = pair.IndexOf('=', StringComparison.Ordinal);
            if (separator > 0)
            {
                yield return pair[(separator + 1)..];
            }
        }
    }

    private IServiceScope CreateScope()
    {
        _ = _factory.Server;
        return _factory.Services.CreateScope();
    }

    private async Task CreateUserAsync(string email, string password)
    {
        using var scope = CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<AppUser>>();
        var now = DateTimeOffset.UtcNow;
        var user = new AppUser
        {
            Email = email,
            NormalizedEmail = email.ToUpperInvariant(),
            DisplayName = "QA logs",
            IsActive = true,
            MustChangePassword = false,
            CreatedAt = now,
            UpdatedAt = now,
        };
        user.PasswordHash = hasher.HashPassword(user, password);
        db.Users.Add(user);
        await db.SaveChangesAsync();
    }

    private async Task<string> PasswordHashOfAsync(string email)
    {
        using var scope = CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var normalized = email.ToUpperInvariant();
        return (await db.Users.Where(user => user.NormalizedEmail == normalized).Select(user => user.PasswordHash).SingleAsync())!;
    }

    private async Task<Guid> UserIdByEmailAsync(string email)
    {
        using var scope = CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var normalized = email.ToUpperInvariant();
        return await db.Users.Where(user => user.NormalizedEmail == normalized).Select(user => user.Id).SingleAsync();
    }

    private async Task<int> CountDeniedAuditAsync(Guid userId)
    {
        using var scope = CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        return await db.AuditLogs.CountAsync(entry => entry.ActorUserId == userId && entry.Action == "auth.access.denied");
    }
}
