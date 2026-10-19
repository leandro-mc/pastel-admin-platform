using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Platform.Security;

namespace Pastel.Modules.Balance.Features.Ping;

internal sealed record PingResponse(string Module, string Status);

/// <summary><c>GET /api/balance/ping</c>: comprobación de que el módulo está cargado y de que el permiso de acceso funciona. Se retira cuando haya funcionalidad real.</summary>
internal static class PingEndpoint
{
    public static void Map(IEndpointRouteBuilder api) =>
        api.MapGet("/ping", () => Results.Ok(new PingResponse(BalancePermissions.Code, "ok")))
            .RequirePermission(BalancePermissions.Access);
}
