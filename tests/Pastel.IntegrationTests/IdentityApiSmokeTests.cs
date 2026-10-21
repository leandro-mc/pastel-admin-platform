using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pastel.Modules.Identity.Persistence;
using Xunit;

namespace Pastel.IntegrationTests;

public sealed class IdentityApiSmokeTests : IClassFixture<IdentityApiFactory>
{
    private readonly IdentityApiFactory _factory;

    public IdentityApiSmokeTests(IdentityApiFactory factory) => _factory = factory;

    [RequiresPostgresFact]
    public async Task Identity_initial_migration_is_applied_and_no_pending_migrations_remain()
    {
        // Inicia el host antes de consultar el contexto: el arranque debe aplicar la migración en la base aislada.
        using var client = _factory.CreateClient();
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();

        var appliedMigrations = await db.Database.GetAppliedMigrationsAsync();
        Assert.Contains("20261019050514_InitialIdentity", appliedMigrations);
        Assert.Empty(await db.Database.GetPendingMigrationsAsync());
    }

    [RequiresPostgresFact]
    public async Task Live_endpoint_returns_ok()
    {
        using var client = _factory.CreateClient();
        using var response = await client.GetAsync("/health/live");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [RequiresPostgresFact]
    public async Task Csrf_endpoint_returns_a_token()
    {
        using var client = _factory.CreateClient();
        using var response = await client.GetAsync("/api/auth/csrf");
        response.EnsureSuccessStatusCode();

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.True(document.RootElement.TryGetProperty("csrfToken", out var token));
        Assert.False(string.IsNullOrWhiteSpace(token.GetString()));
    }

    [RequiresPostgresFact]
    public async Task Auth_options_expose_one_consistent_local_policy_and_no_google()
    {
        using var client = _factory.CreateClient();
        using var response = await client.GetAsync("/api/auth/options");
        response.EnsureSuccessStatusCode();

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = document.RootElement;
        Assert.False(root.GetProperty("google").GetBoolean());
        Assert.True(root.GetProperty("localLogin").GetBoolean());
        Assert.False(root.GetProperty("localRegistration").GetBoolean());
        Assert.Equal(12, root.GetProperty("passwordPolicy").GetProperty("minLength").GetInt32());
        Assert.Equal(128, root.GetProperty("passwordPolicy").GetProperty("maxLength").GetInt32());
    }

    [RequiresPostgresFact]
    public async Task Admin_users_endpoint_rejects_anonymous_requests()
    {
        using var client = _factory.CreateClient();
        using var response = await client.GetAsync("/api/admin/users/");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Trait("RequirementId", "F0-S213")]
    [RequiresPostgresFact]
    public async Task Api_write_without_csrf_cookie_and_header_is_rejected()
    {
        using var client = _factory.CreateClient();
        using var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "csrf-test@pastel.test",
            displayName = "CSRF test",
            password = "Local integration test passphrase 2026"
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("platform.csrf_invalid", document.RootElement.GetProperty("code").GetString());
    }
}
