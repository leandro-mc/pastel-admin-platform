using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Cosecha.Common;
using Pastel.Platform.Security;

namespace Pastel.Modules.Cosecha.Features.Settlements;

/// <summary><c>/api/cosecha/settlements</c>: lo que se le debe a cada productor y los pagos. Lectura con <c>settlements.read</c>; pagar y anular con <c>settlements.manage</c>.</summary>
internal static class SettlementsEndpoint
{
    public static void Map(IEndpointRouteBuilder settlements)
    {
        settlements.MapGet("/producers", BalancesAsync).RequirePermission(CosechaPermissions.SettlementsRead);
        settlements.MapGet("/producers/{producerId:guid}", StatementAsync).RequirePermission(CosechaPermissions.SettlementsRead);
        settlements.MapPost("/payments", RegisterAsync).RequirePermission(CosechaPermissions.SettlementsManage);
        settlements.MapPost("/payments/{id:guid}/void", VoidAsync).RequirePermission(CosechaPermissions.SettlementsManage);
    }

    private static async Task<IResult> BalancesAsync(Guid? seasonId, SettlementsHandler handler, CancellationToken ct) =>
        Results.Json(await handler.BalancesAsync(seasonId, ct));

    private static async Task<IResult> StatementAsync(Guid producerId, Guid? seasonId, SettlementsHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.StatementAsync(producerId, seasonId, ct)).ToResponse(http);

    private static async Task<IResult> RegisterAsync(PaymentRequest request, SettlementsHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.RegisterAsync(request, ct)).ToResponse(http, StatusCodes.Status201Created);

    private static async Task<IResult> VoidAsync(Guid id, VoidPaymentRequest request, SettlementsHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.VoidAsync(id, request, ct)).ToResponse(http);
}
