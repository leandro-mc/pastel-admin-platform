using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Cosecha.Common;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha.Features.Orders;

/// <summary><c>/api/cosecha/my/orders</c>: pedidos del comprador de la sesión y el estado de sus envíos. Solo <c>orders.read.own</c>; nunca datos de otros compradores.</summary>
internal static class MyOrdersEndpoint
{
    public static void Map(IEndpointRouteBuilder my)
    {
        my.MapGet("/orders", ListAsync).RequirePermission(CosechaPermissions.OrdersReadOwn);
        my.MapGet("/orders/{id:guid}", GetAsync).RequirePermission(CosechaPermissions.OrdersReadOwn);
    }

    private static async Task<IResult> ListAsync(int? page, int? pageSize, MyOrdersHandler handler, CancellationToken ct) =>
        Results.Json(await handler.ListAsync(PageRequest.Normalize(page, pageSize), ct));

    private static async Task<IResult> GetAsync(Guid id, MyOrdersHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.GetAsync(id, ct)).ToResponse(http);
}
