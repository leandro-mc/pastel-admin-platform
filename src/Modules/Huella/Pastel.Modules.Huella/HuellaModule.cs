using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Pastel.Modules.Huella.Features;
using Pastel.Modules.Huella.Persistence;
using Pastel.Platform.Modules;
using Pastel.Platform.Persistence;

namespace Pastel.Modules.Huella;

/// <summary>
/// Módulo Huella: banco privado, perfil público y modelo del CV del Owner. Ver <c>MODULE.md</c> y
/// <c>docs/modules/HUELLA.md</c> para el alcance de producto.
/// </summary>
internal sealed class HuellaModule : IPastelModule
{
    public string Code => HuellaPermissions.Code;

    public string Name => "Huella";

    public int Order => 50;

    public IReadOnlyList<PermissionGroup> Permissions => HuellaPermissions.Groups;

    // Huella es el perfil personal del Owner/Superuser; no se ofrece como rol para otras cuentas.
    public IReadOnlyList<SuggestedRole> SuggestedRoles { get; } = [];

    public void ConfigureServices(IServiceCollection services, IConfiguration configuration)
    {
        services.AddPastelDbContext<HuellaDbContext>(configuration, HuellaDbContext.Schema);
        services.AddHuellaHandlers();

        // Límite de tasa de las rutas públicas, por IP (la IP real la fija el middleware de cabeceras reenviadas de la plataforma).
        services.AddRateLimiter(options => options.AddPolicy(HuellaEndpoints.PublicRateLimit, context =>
            RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = 30, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 })));
    }

    public void MapEndpoints(IEndpointRouteBuilder api) => HuellaEndpoints.Map(api);

    public Task MigrateAsync(IServiceProvider services, CancellationToken cancellationToken) =>
        PastelDbContextExtensions.MigrateModuleAsync<HuellaDbContext>(services, cancellationToken);

    public Task<bool> HasPendingMigrationsAsync(IServiceProvider services, CancellationToken cancellationToken) =>
        PastelDbContextExtensions.HasPendingMigrationsAsync<HuellaDbContext>(services, cancellationToken);
}
