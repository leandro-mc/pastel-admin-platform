using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Pastel.Modules.Huella.Features.Ping;
using Pastel.Modules.Huella.Persistence;
using Pastel.Platform.Modules;
using Pastel.Platform.Persistence;

namespace Pastel.Modules.Huella;

/// <summary>Módulo Huella (marcador). Ver <c>MODULE.md</c> y <c>docs/modules/</c> para el alcance de producto.</summary>
internal sealed class HuellaModule : IPastelModule
{
    public string Code => HuellaPermissions.Code;

    public string Name => "Huella";

    public int Order => 50;

    public IReadOnlyList<PermissionGroup> Permissions => HuellaPermissions.Groups;

    public IReadOnlyList<SuggestedRole> SuggestedRoles { get; } =
    [
        new("Huella — Propietario", "Edita y publica su propio perfil.", [HuellaPermissions.Access, HuellaPermissions.ProfileManage]),
    ];

    public void ConfigureServices(IServiceCollection services, IConfiguration configuration) =>
        services.AddPastelDbContext<HuellaDbContext>(configuration, HuellaDbContext.Schema);

    public void MapEndpoints(IEndpointRouteBuilder api) => PingEndpoint.Map(api);

    public Task MigrateAsync(IServiceProvider services, CancellationToken cancellationToken) =>
        PastelDbContextExtensions.MigrateModuleAsync<HuellaDbContext>(services, cancellationToken);

    public Task<bool> HasPendingMigrationsAsync(IServiceProvider services, CancellationToken cancellationToken) =>
        PastelDbContextExtensions.HasPendingMigrationsAsync<HuellaDbContext>(services, cancellationToken);
}
