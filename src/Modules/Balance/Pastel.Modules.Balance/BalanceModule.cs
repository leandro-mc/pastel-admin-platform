using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Pastel.Modules.Balance.Features.Ping;
using Pastel.Modules.Balance.Persistence;
using Pastel.Platform.Modules;
using Pastel.Platform.Persistence;

namespace Pastel.Modules.Balance;

/// <summary>Módulo Balance (marcador). Ver <c>MODULE.md</c> y <c>docs/modules/</c> para el alcance de producto.</summary>
internal sealed class BalanceModule : IPastelModule
{
    public string Code => BalancePermissions.Code;

    public string Name => "Balance";

    public int Order => 20;

    public IReadOnlyList<PermissionGroup> Permissions => BalancePermissions.Groups;

    public IReadOnlyList<SuggestedRole> SuggestedRoles { get; } =
    [
        new("Balance — Usuario", "Usa Balance y gestiona los grupos de los que forma parte.", [BalancePermissions.Access, BalancePermissions.GroupsManage]),
    ];

    public void ConfigureServices(IServiceCollection services, IConfiguration configuration) =>
        services.AddPastelDbContext<BalanceDbContext>(configuration, BalanceDbContext.Schema);

    public void MapEndpoints(IEndpointRouteBuilder api) => PingEndpoint.Map(api);

    public Task MigrateAsync(IServiceProvider services, CancellationToken cancellationToken) =>
        PastelDbContextExtensions.MigrateModuleAsync<BalanceDbContext>(services, cancellationToken);

    public Task<bool> HasPendingMigrationsAsync(IServiceProvider services, CancellationToken cancellationToken) =>
        PastelDbContextExtensions.HasPendingMigrationsAsync<BalanceDbContext>(services, cancellationToken);
}
