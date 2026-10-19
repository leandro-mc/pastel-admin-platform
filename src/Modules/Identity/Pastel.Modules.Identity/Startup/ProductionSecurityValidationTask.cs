using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Pastel.Platform.Modules;

namespace Pastel.Modules.Identity.Startup;

/// <summary>
/// Evita iniciar en Production con credenciales o claves conocidas de ejemplo. La validación se ejecuta
/// como tarea de arranque negativa, antes de aplicar migraciones o sembrar la cuenta de administración.
/// </summary>
internal sealed class ProductionSecurityValidationTask(
    IConfiguration configuration,
    IHostEnvironment environment,
    ILogger<ProductionSecurityValidationTask> logger) : IPastelStartupTask
{
    public int Order => -100;

    public Task RunAsync(IServiceProvider services, CancellationToken cancellationToken)
    {
        if (!environment.IsProduction())
        {
            return Task.CompletedTask;
        }

        var problems = new List<string>();
        var bootstrapEmail = configuration["Bootstrap:AdminEmail"]?.Trim();
        var bootstrapPassword = configuration["Bootstrap:AdminPassword"];
        var signingKey = configuration["Jwt:SigningKey"];
        var previousSigningKey = configuration["Jwt:PreviousSigningKey"];

        if (string.IsNullOrWhiteSpace(bootstrapEmail)
            || string.Equals(bootstrapEmail, "admin@pastel.local", StringComparison.OrdinalIgnoreCase))
        {
            problems.Add("Bootstrap:AdminEmail debe ser una cuenta controlada por el responsable y no el valor local de ejemplo");
        }

        if (IsExampleSecret(bootstrapPassword) || bootstrapPassword is { Length: < 16 })
        {
            problems.Add("Bootstrap:AdminPassword debe ser una contraseña secreta de al menos 16 caracteres y no un valor de ejemplo");
        }

        if (IsExampleSecret(signingKey))
        {
            problems.Add("Jwt:SigningKey debe ser una clave criptográfica aleatoria y no el valor de ejemplo");
        }

        if (!string.IsNullOrWhiteSpace(previousSigningKey) && IsExampleSecret(previousSigningKey))
        {
            problems.Add("Jwt:PreviousSigningKey no puede ser una clave de ejemplo");
        }

        if (problems.Count > 0)
        {
            // Nunca incluir valores de las credenciales o claves en logs ni mensajes de excepción.
            logger.LogCritical("Configuración insegura de Production: {ConfigurationProblems}", string.Join("; ", problems));
            throw new InvalidOperationException("La configuración de seguridad de Production es insegura. Revise los nombres de configuración indicados en los logs.");
        }

        return Task.CompletedTask;
    }

    private static bool IsExampleSecret(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return true;
        }

        return value.Contains("LOCAL-ONLY", StringComparison.OrdinalIgnoreCase)
            || value.Contains("CHANGE_THIS", StringComparison.OrdinalIgnoreCase)
            || value.Contains("DEV-ONLY", StringComparison.OrdinalIgnoreCase)
            || value.Contains("EXAMPLE", StringComparison.OrdinalIgnoreCase)
            || value.Contains("REPLACE_ME", StringComparison.OrdinalIgnoreCase)
            || value.Contains("YOUR_SECRET", StringComparison.OrdinalIgnoreCase);
    }
}
