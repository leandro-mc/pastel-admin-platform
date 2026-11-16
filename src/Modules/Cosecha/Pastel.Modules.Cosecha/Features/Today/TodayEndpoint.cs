using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Platform.Security;

namespace Pastel.Modules.Cosecha.Features.Today;

/// <summary><c>GET /api/cosecha/today</c>: lo que requiere atención ahora. Requiere <c>shipments.read</c>.</summary>
internal static class TodayEndpoint
{
    public static void Map(IEndpointRouteBuilder api) =>
        api.MapGet("/today", GetAsync).RequirePermission(CosechaPermissions.ShipmentsRead);

    private static async Task<IResult> GetAsync(TodayHandler handler, CancellationToken ct) => Results.Json(await handler.GetAsync(ct));
}
