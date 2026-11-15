using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Pastel.Modules.Identity.Startup;
using Xunit;

namespace Pastel.Modules.Identity.Tests;

public sealed class ProductionSecurityValidationTaskTests
{
    private const string SecureEmail = "propietario@empresa-real.test";
    private const string SecurePassword = "Contrasena-Secreta-Unica-9482-xyz";
    private const string SecureSigningKey = "9f3c1e7a52b84d06a1c7e39b0d4f8a62c5e1b7d93a0f4c68e2b1d5a7f9c3e08b";

    [Trait("RequirementId", "F0-S209")]
    [Fact]
    public async Task Production_refuses_the_default_bootstrap_email()
    {
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => RunAsync(
            Environments.Production,
            bootstrapEmail: "admin@pastel.local"));

        Assert.Contains("Production", exception.Message);
    }

    [Trait("RequirementId", "F0-S209")]
    [Theory]
    [InlineData("change_this_before_production_key_value_1234567890")]
    [InlineData("local-only-signing-key-0123456789abcdef0123456789abcdef")]
    [InlineData("example-signing-key-0123456789abcdef0123456789abcdef")]
    public async Task Production_refuses_an_example_jwt_signing_key(string signingKey)
    {
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => RunAsync(
            Environments.Production,
            signingKey: signingKey));

        Assert.Contains("Production", exception.Message);
    }

    [Trait("RequirementId", "F0-S209")]
    [Fact]
    public async Task Production_refuses_an_example_or_short_bootstrap_password()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(() => RunAsync(
            Environments.Production,
            bootstrapPassword: "Local-Only-Admin-2026!"));
        await Assert.ThrowsAsync<InvalidOperationException>(() => RunAsync(
            Environments.Production,
            bootstrapPassword: "Corta-123"));
    }

    [Trait("RequirementId", "F0-S209")]
    [Fact]
    public async Task Production_error_never_includes_configured_secret_values()
    {
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => RunAsync(
            Environments.Production,
            bootstrapEmail: "admin@pastel.local",
            bootstrapPassword: "Corta-123",
            signingKey: "change_this_before_production_key_value_1234567890"));

        Assert.DoesNotContain("Corta-123", exception.Message);
        Assert.DoesNotContain("change_this_before_production", exception.Message);
    }

    [Trait("RequirementId", "F0-S209")]
    [Fact]
    public async Task Production_starts_with_controlled_credentials_and_a_random_key()
    {
        await RunAsync(Environments.Production);
    }

    [Trait("RequirementId", "F0-S209")]
    [Theory]
    [InlineData("Development")]
    [InlineData("Testing")]
    public async Task Non_production_environments_keep_working_with_local_defaults(string environmentName)
    {
        await RunAsync(
            environmentName,
            bootstrapEmail: "admin@pastel.local",
            bootstrapPassword: "Local-Only-Admin-2026!",
            signingKey: "local-only-signing-key-0123456789abcdef0123456789abcdef");
    }

    private static async Task RunAsync(
        string environmentName,
        string bootstrapEmail = SecureEmail,
        string bootstrapPassword = SecurePassword,
        string signingKey = SecureSigningKey)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Bootstrap:AdminEmail"] = bootstrapEmail,
                ["Bootstrap:AdminPassword"] = bootstrapPassword,
                ["Jwt:SigningKey"] = signingKey,
                ["TestingSeed:Enabled"] = "false",
            })
            .Build();
        var environment = new FakeHostEnvironment { EnvironmentName = environmentName };
        using var services = new ServiceCollection().BuildServiceProvider();
        var task = new ProductionSecurityValidationTask(
            configuration,
            environment,
            NullLogger<ProductionSecurityValidationTask>.Instance);

        await task.RunAsync(services, CancellationToken.None);
    }

    private sealed class FakeHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Production;

        public string ApplicationName { get; set; } = "Pastel.Identity.Tests";

        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;

        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
