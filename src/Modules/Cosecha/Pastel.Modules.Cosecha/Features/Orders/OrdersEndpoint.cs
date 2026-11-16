using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Cosecha.Common;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha.Features.Orders;

/// <summary><c>/api/cosecha/orders</c>: pedidos de todos los compradores (vista del gestor). Lectura con <c>orders.read</c>; cambios con <c>orders.manage</c>.</summary>
internal static class OrdersEndpoint
{
    public static void Map(IEndpointRouteBuilder orders)
    {
        orders.MapGet("/", ListAsync).RequirePermission(CosechaPermissions.OrdersRead);
        orders.MapGet("/{id:guid}", GetAsync).RequirePermission(CosechaPermissions.OrdersRead);
        orders.MapPost("/", CreateAsync).RequirePermission(CosechaPermissions.OrdersManage);
        orders.MapPut("/{id:guid}", UpdateAsync).RequirePermission(CosechaPermissions.OrdersManage);
        orders.MapPost("/{id:guid}/confirm", ConfirmAsync).RequirePermission(CosechaPermissions.OrdersManage);
        orders.MapPost("/{id:guid}/cancel", CancelAsync).RequirePermission(CosechaPermissions.OrdersManage);
    }

    private static async Task<IResult> ListAsync(
        Guid? seasonId, Guid? buyerId, string? status, DateOnly? from, DateOnly? to, string? search, int? page, int? pageSize,
        OrdersHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.ListAsync(new OrderFilter(seasonId, buyerId, status, from, to, search), PageRequest.Normalize(page, pageSize), ct)).ToResponse(http);

    private static async Task<IResult> GetAsync(Guid id, OrdersHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.GetAsync(id, ct)).ToResponse(http);

    private static async Task<IResult> CreateAsync(OrderRequest request, OrdersHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.CreateAsync(request, ct)).ToResponse(http, StatusCodes.Status201Created);

    private static async Task<IResult> UpdateAsync(Guid id, OrderRequest request, OrdersHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.UpdateAsync(id, request, ct)).ToResponse(http);

    private static async Task<IResult> ConfirmAsync(Guid id, OrderVersionRequest request, OrdersHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.ConfirmAsync(id, request, ct)).ToResponse(http);

    private static async Task<IResult> CancelAsync(Guid id, CancelOrderRequest request, OrdersHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.CancelAsync(id, request, ct)).ToResponse(http);
}
