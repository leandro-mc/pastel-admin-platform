using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Pastel.Modules.Balance.Common;
using Pastel.Modules.Balance.Features.Balances;
using Pastel.Modules.Balance.Features.Expenses;
using Pastel.Modules.Balance.Features.Groups;
using Pastel.Modules.Balance.Features.Join;
using Pastel.Modules.Balance.Features.Participants;
using Pastel.Modules.Balance.Features.Reference;
using Pastel.Modules.Balance.Persistence;
using Pastel.Modules.Balance.Security;
using Pastel.Platform.Modules;
using Pastel.Platform.Persistence;

namespace Pastel.Modules.Balance;

/// <summary>Módulo Balance: grupos de gasto compartido, reparto en partes iguales y liquidación. Ver <c>MODULE.md</c> y <c>docs/modules/BALANCE.md</c>.</summary>
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

    public void ConfigureServices(IServiceCollection services, IConfiguration configuration)
    {
        services.AddPastelDbContext<BalanceDbContext>(configuration, BalanceDbContext.Schema);

        // Un solo limitador por proceso: el estado de intentos fallidos debe compartirse entre solicitudes.
        services.TryAddSingleton<JoinAttemptLimiter>();
        services.AddScoped<GroupAccess>();
        services.AddScoped<LedgerReader>();
        services.AddScoped<GroupJournal>();
        services.AddScoped<GroupsHandler>();
        services.AddScoped<ParticipantsHandler>();
        services.AddScoped<JoinHandler>();
        services.AddScoped<ExpensesHandler>();
        services.AddScoped<BalancesHandler>();
    }

    public void MapEndpoints(IEndpointRouteBuilder api)
    {
        CurrenciesEndpoint.Map(api);
        GroupsEndpoint.Map(api);
        ParticipantsEndpoint.Map(api);
        JoinEndpoint.Map(api);
        ExpensesEndpoint.Map(api);
        BalancesEndpoint.Map(api);
    }

    public Task MigrateAsync(IServiceProvider services, CancellationToken cancellationToken) =>
        PastelDbContextExtensions.MigrateModuleAsync<BalanceDbContext>(services, cancellationToken);

    public Task<bool> HasPendingMigrationsAsync(IServiceProvider services, CancellationToken cancellationToken) =>
        PastelDbContextExtensions.HasPendingMigrationsAsync<BalanceDbContext>(services, cancellationToken);
}
