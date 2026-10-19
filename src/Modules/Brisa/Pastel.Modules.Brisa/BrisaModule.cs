using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Pastel.Modules.Brisa.Features.Ping;
using Pastel.Modules.Brisa.Persistence;
using Pastel.Platform.Modules;
using Pastel.Platform.Persistence;

namespace Pastel.Modules.Brisa;

/// <summary>Módulo Brisa (marcador). Ver <c>MODULE.md</c> y <c>docs/modules/</c> para el alcance de producto.</summary>
internal sealed class BrisaModule : IPastelModule
{
    public string Code => BrisaPermissions.Code;

    public string Name => "Brisa";

    public int Order => 10;

    public IReadOnlyList<PermissionGroup> Permissions => BrisaPermissions.Groups;

    public IReadOnlyList<SuggestedRole> SuggestedRoles { get; } =
    [
        new("Brisa — Usuario", "Acceso a Brisa.", [BrisaPermissions.Access]),
    ];

    public void ConfigureServices(IServiceCollection services, IConfiguration configuration) =>
        services.AddPastelDbContext<BrisaDbContext>(configuration, BrisaDbContext.Schema);

    public void MapEndpoints(IEndpointRouteBuilder api) => PingEndpoint.Map(api);

    public Task MigrateAsync(IServiceProvider services, CancellationToken cancellationToken) =>
        PastelDbContextExtensions.MigrateModuleAsync<BrisaDbContext>(services, cancellationToken);

    public Task<bool> HasPendingMigrationsAsync(IServiceProvider services, CancellationToken cancellationToken) =>
        PastelDbContextExtensions.HasPendingMigrationsAsync<BrisaDbContext>(services, cancellationToken);
}
