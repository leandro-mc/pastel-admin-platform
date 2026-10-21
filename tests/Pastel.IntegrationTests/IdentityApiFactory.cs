using System.Data.Common;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Pastel.Modules.Identity.Persistence;

namespace Pastel.IntegrationTests;

/// <summary>
/// Ejecuta la API real en TestServer, pero exige una base PostgreSQL separada para evitar tocar datos locales.
/// Define PASTEL_TEST_CONNECTION_STRING apuntando exclusivamente a la base pastel_integration_tests.
/// </summary>
public sealed class IdentityApiFactory : WebApplicationFactory<global::Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        var connectionString = Environment.GetEnvironmentVariable("PASTEL_TEST_CONNECTION_STRING");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Defina PASTEL_TEST_CONNECTION_STRING para apuntar a la base PostgreSQL aislada pastel_integration_tests.");
        }

        var parsed = new DbConnectionStringBuilder { ConnectionString = connectionString };
        var databaseKey = parsed.Keys.Cast<string>().FirstOrDefault(key =>
            key.Equals("Database", StringComparison.OrdinalIgnoreCase)
            || key.Equals("Initial Catalog", StringComparison.OrdinalIgnoreCase));
        var databaseName = databaseKey is null ? null : parsed[databaseKey]?.ToString();
        if (!string.Equals(databaseName, "pastel_integration_tests", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Las pruebas de integración solo se pueden ejecutar contra la base dedicada 'pastel_integration_tests'.");
        }

        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = connectionString,
                ["Bootstrap:AdminEmail"] = "admin.integration@pastel.test",
                ["Bootstrap:AdminPassword"] = "Integration-Test-Passphrase-2026!",
                ["Jwt:Issuer"] = "PastelAdmin.IntegrationTests",
                ["Jwt:Audience"] = "PastelAdmin.IntegrationTests",
                ["Jwt:SigningKey"] = "integration-test-signing-key-should-never-be-used-outside-tests-2026",
                ["Jwt:SigningKeyId"] = "integration-test-key",
                ["Auth:Local:Enabled"] = "true",
                ["Auth:Local:SelfRegistrationEnabled"] = "false",
                ["TestingSeed:Enabled"] = "true",
                ["ReverseProxy:TrustedNetworks"] = "127.0.0.0/8;::1/128;172.16.0.0/12",
                ["App:PublicBaseUrl"] = "http://localhost"
            });
        });

        // En Minimal Hosting, sustituimos explícitamente las opciones del DbContext después del registro
        // de módulos. Así, si la configuración de host no propaga el override de ConnectionStrings:Default,
        // las pruebas siguen conectándose solo a la base verificada más arriba.
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<IdentityDbContext>>();
            services.RemoveAll<IdentityDbContext>();
            services.AddDbContext<IdentityDbContext>(options => options.UseNpgsql(
                connectionString,
                npgsql => npgsql
                    .MigrationsHistoryTable("__EFMigrationsHistory", IdentityDbContext.Schema)
                    .MigrationsAssembly(typeof(IdentityDbContext).Assembly.GetName().Name)));
        });
    }
}
