using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pastel.Modules.Identity.Persistence;
using Xunit;

namespace Pastel.IntegrationTests;

[Collection(IdentityApiCollection.Name)]
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

    [Trait("RequirementId", "F0-S210")]
    [RequiresPostgresFact]
    public async Task Registration_is_rejected_when_disabled_even_with_valid_csrf()
    {
        using var client = CreateHttpsClient();
        var csrfToken = await GetCsrfTokenAsync(client);
        var (statusCode, errorCode) = await PostWithCsrfAsync(
            client,
            "/api/auth/register",
            new
            {
                email = "registration-disabled@pastel.test",
                displayName = "Registration Disabled",
                password = "A strong integration phrase for registration"
            },
            csrfToken);

        Assert.Equal(HttpStatusCode.Forbidden, statusCode);
        Assert.Equal("identity.register.disabled", errorCode);
    }

    [Trait("RequirementId", "F0-S207")]
    [RequiresPostgresFact]
    public async Task Login_uses_same_status_and_error_for_unknown_and_wrong_password()
    {
        using var client = CreateHttpsClient();
        var csrfToken = await GetCsrfTokenAsync(client);

        var unknown = await PostWithCsrfAsync(
            client,
            "/api/auth/login",
            new { email = "unknown-login@pastel.test", password = "Incorrect passphrase 2026!" },
            csrfToken);
        var knownWrongPassword = await PostWithCsrfAsync(
            client,
            "/api/auth/login",
            new { email = "admin.integration@pastel.test", password = "Incorrect passphrase 2026!" },
            csrfToken);

        Assert.Equal(HttpStatusCode.Unauthorized, unknown.StatusCode);
        Assert.Equal(unknown.StatusCode, knownWrongPassword.StatusCode);
        Assert.Equal("identity.login.invalid_credentials", unknown.ErrorCode);
        Assert.Equal(unknown.ErrorCode, knownWrongPassword.ErrorCode);
    }

    [Trait("RequirementId", "F0-S211")]
    [RequiresPostgresFact]
    public async Task Bootstrap_login_issues_session_and_forces_temporary_password_change()
    {
        using var client = CreateHttpsClient();
        var csrfToken = await GetCsrfTokenAsync(client);
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(new
            {
                email = "admin.integration@pastel.test",
                password = "Integration-Test-Passphrase-2026!"
            })
        };
        request.Headers.Add("X-CSRF-TOKEN", csrfToken);

        using var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var cookies = response.Headers.GetValues("Set-Cookie").ToArray();
        Assert.Contains(cookies, value => value.StartsWith("__Host-pastel_access=", StringComparison.Ordinal));
        Assert.Contains(cookies, value => value.StartsWith("__Host-pastel_refresh=", StringComparison.Ordinal));

        using var blockedResponse = await client.GetAsync("/api/admin/users/");
        Assert.Equal(HttpStatusCode.Forbidden, blockedResponse.StatusCode);
        using var document = JsonDocument.Parse(await blockedResponse.Content.ReadAsStringAsync());
        Assert.Equal("platform.password_change_required", document.RootElement.GetProperty("code").GetString());
    }

    private HttpClient CreateHttpsClient() =>
        _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = true
        });

    private static async Task<string> GetCsrfTokenAsync(HttpClient client)
    {
        using var response = await client.GetAsync("/api/auth/csrf");
        response.EnsureSuccessStatusCode();
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.GetProperty("csrfToken").GetString()
            ?? throw new InvalidOperationException("The CSRF endpoint did not return a token.");
    }

    private static async Task<(HttpStatusCode StatusCode, string? ErrorCode)> PostWithCsrfAsync(
        HttpClient client, string path, object body, string csrfToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = JsonContent.Create(body)
        };
        request.Headers.Add("X-CSRF-TOKEN", csrfToken);
        using var response = await client.SendAsync(request);
        string? errorCode = null;
        if ((int)response.StatusCode >= 400)
        {
            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            errorCode = document.RootElement.TryGetProperty("code", out var code) ? code.GetString() : null;
        }

        return (response.StatusCode, errorCode);
    }


    [Trait("RequirementId", "F0-006")]
    [RequiresPostgresFact]
    public async Task Testing_seed_gives_member_only_the_member_role()
    {
        using var client = _factory.CreateClient();
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();

        var roles = await db.UserRoles
            .Where(link => link.User.NormalizedEmail == "TEST.MEMBER@PASTEL.LOCAL")
            .Select(link => link.Role.Name)
            .ToArrayAsync();

        Assert.Equal(new[] { "Member" }, roles);
    }

    [RequiresPostgresFact]
    public async Task Administrator_can_list_users_but_member_cannot()
    {
        using var administrator = await SignInAsync(
            "test.admin@pastel.local",
            "Local-Only-Test-Admin-2026!");
        using var member = await SignInAsync(
            "test.member@pastel.local",
            "Local-Only-Test-Member-2026!");

        using var administratorResponse = await administrator.GetAsync("/api/admin/users/");
        using var memberResponse = await member.GetAsync("/api/admin/users/");

        Assert.Equal(HttpStatusCode.OK, administratorResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, memberResponse.StatusCode);
    }

    private async Task<HttpClient> SignInAsync(string email, string password)
    {
        var client = CreateHttpsClient();
        try
        {
            var csrfToken = await GetCsrfTokenAsync(client);
            var result = await PostWithCsrfAsync(
                client,
                "/api/auth/login",
                new { email, password },
                csrfToken);
            Assert.Equal(HttpStatusCode.OK, result.StatusCode);
            return client;
        }
        catch
        {
            client.Dispose();
            throw;
        }
    }

}
