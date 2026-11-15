using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Pastel.Modules.Identity.Startup;
using Xunit;

namespace Pastel.Modules.Identity.Tests;

public sealed class TestingSeedUsersTaskTests
{
    [Trait("RequirementId", "F0-006")]
    [Fact]
    public async Task Testing_seed_fails_fast_when_enabled_in_production()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["TestingSeed:Enabled"] = "true",
            })
            .Build();
        var environment = new FakeHostEnvironment { EnvironmentName = Environments.Production };
        using var services = new ServiceCollection().BuildServiceProvider();
        var task = new TestingSeedUsersTask(
            configuration,
            environment,
            NullLogger<TestingSeedUsersTask>.Instance);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => task.RunAsync(services, CancellationToken.None));

        Assert.Contains("Production", exception.Message);
    }

    [Fact]
    public async Task Testing_seed_does_not_access_storage_when_disabled()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["TestingSeed:Enabled"] = "false",
            })
            .Build();
        var environment = new FakeHostEnvironment { EnvironmentName = Environments.Production };
        using var services = new ServiceCollection().BuildServiceProvider();
        var task = new TestingSeedUsersTask(
            configuration,
            environment,
            NullLogger<TestingSeedUsersTask>.Instance);

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
