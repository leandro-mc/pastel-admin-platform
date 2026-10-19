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
        new("Cosecha — Usuario", "Acceso a Cosecha.", [CosechaPermissions.Access]),
    ];

    public void ConfigureServices(IServiceCollection services, IConfiguration configuration) =>
        services.AddPastelDbContext<CosechaDbContext>(configuration, CosechaDbContext.Schema);

    public void MapEndpoints(IEndpointRouteBuilder api) => PingEndpoint.Map(api);

    public Task MigrateAsync(IServiceProvider services, CancellationToken cancellationToken) =>
        PastelDbContextExtensions.MigrateModuleAsync<CosechaDbContext>(services, cancellationToken);

    public Task<bool> HasPendingMigrationsAsync(IServiceProvider services, CancellationToken cancellationToken) =>
        PastelDbContextExtensions.HasPendingMigrationsAsync<CosechaDbContext>(services, cancellationToken);
}
