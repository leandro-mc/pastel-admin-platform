using System.Net;
using System.Text.Json;
using Xunit;

namespace Pastel.IntegrationTests;

public sealed class IdentityApiSmokeTests : IClassFixture<IdentityApiFactory>
{
    private readonly IdentityApiFactory _factory;

    public IdentityApiSmokeTests(IdentityApiFactory factory) => _factory = factory;

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
}
