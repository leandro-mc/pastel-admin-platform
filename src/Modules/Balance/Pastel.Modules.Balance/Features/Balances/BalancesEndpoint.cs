using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Balance.Common;
using Pastel.Platform.Security;

namespace Pastel.Modules.Balance.Features.Balances;

/// <summary>Lectura de saldos y liquidación de un grupo del que la persona es miembro (404 si no lo es).</summary>
internal static class BalancesEndpoint
{
    public static void Map(IEndpointRouteBuilder api)
    {
        var group = api.MapGroup("/groups/{groupId:guid}");

        group.MapGet("/balances", async (Guid groupId, BalancesHandler h, HttpContext http, CancellationToken ct) =>
            (await h.BalancesAsync(groupId, ct)).ToResponse(http)).RequirePermission(BalancePermissions.Access);

        group.MapGet("/settlement", async (Guid groupId, BalancesHandler h, HttpContext http, CancellationToken ct) =>
            (await h.SettlementAsync(groupId, ct)).ToResponse(http)).RequirePermission(BalancePermissions.Access);
    }
}
