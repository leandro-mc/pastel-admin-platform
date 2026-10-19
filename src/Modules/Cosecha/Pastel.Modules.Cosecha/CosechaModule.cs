using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Pastel.Modules.Cosecha.Features.Ping;
using Pastel.Modules.Cosecha.Persistence;
using Pastel.Platform.Modules;
using Pastel.Platform.Persistence;

namespace Pastel.Modules.Cosecha;

/// <summary>Módulo Cosecha (marcador). Ver <c>MODULE.md</c> y <c>docs/modules/</c> para el alcance de producto.</summary>
internal sealed class CosechaModule : IPastelModule
{
    public string Code => CosechaPermissions.Code;

    public string Name => "Cosecha";

    public int Order => 40;

    public IReadOnlyList<PermissionGroup> Permissions => CosechaPermissions.Groups;

    public IReadOnlyList<SuggestedRole> SuggestedRoles { get; } =
    [
        new(
            "Cosecha — Gestor",
            "Gestiona todo Cosecha: catálogo, productores, compradores, pedidos, envíos, pagos y reportes.",
            [
                CosechaPermissions.Access,
                CosechaPermissions.CatalogRead,
                CosechaPermissions.CatalogManage,
                CosechaPermissions.ProducersRead,
                CosechaPermissions.ProducersManage,
                CosechaPermissions.BuyersRead,
                CosechaPermissions.BuyersManage,
                CosechaPermissions.OrdersRead,
                CosechaPermissions.OrdersManage,
                CosechaPermissions.ShipmentsRead,
                CosechaPermissions.ShipmentsManage,
                CosechaPermissions.SettlementsRead,
                CosechaPermissions.SettlementsManage,
                CosechaPermissions.ReportsRead,
            ]),
        new("Cosecha — Comprador", "Consulta solo sus pedidos y el estado de sus envíos.", [CosechaPermissions.Access, CosechaPermissions.OrdersReadOwn]),
    ];

    public void ConfigureServices(IServiceCollection services, IConfiguration configuration) =>
        services.AddPastelDbContext<CosechaDbContext>(configuration, CosechaDbContext.Schema);

    public void MapEndpoints(IEndpointRouteBuilder api) => PingEndpoint.Map(api);

    public Task MigrateAsync(IServiceProvider services, CancellationToken cancellationToken) =>
        PastelDbContextExtensions.MigrateModuleAsync<CosechaDbContext>(services, cancellationToken);

    public Task<bool> HasPendingMigrationsAsync(IServiceProvider services, CancellationToken cancellationToken) =>
        PastelDbContextExtensions.HasPendingMigrationsAsync<CosechaDbContext>(services, cancellationToken);
}
