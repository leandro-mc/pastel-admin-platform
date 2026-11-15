using Xunit;

namespace Pastel.IntegrationTests;

/// <summary>
/// Las pruebas HTTP requieren una base PostgreSQL dedicada. Sin ambas variables explícitas se marcan como omitidas,
/// de modo que 'dotnet test Pastel.slnx' pueda seguir ejecutando las pruebas unitarias sin tocar ninguna base.
/// </summary>
[AttributeUsage(AttributeTargets.Method)]
public sealed class RequiresPostgresFactAttribute : FactAttribute
{
    public RequiresPostgresFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("PASTEL_TEST_CONNECTION_STRING"))
            || string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("ConnectionStrings__Default")))
        {
            Skip = "Defina PASTEL_TEST_CONNECTION_STRING y ConnectionStrings__Default hacia la base aislada pastel_integration_tests para habilitar pruebas HTTP + PostgreSQL.";
        }
    }
}
