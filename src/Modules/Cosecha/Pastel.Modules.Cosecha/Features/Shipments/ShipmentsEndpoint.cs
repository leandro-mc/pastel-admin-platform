using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Cosecha.Common;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha.Features.Shipments;

/// <summary>
/// <c>/api/cosecha/shipments</c>: envíos, reparto entre productores, recepción y entrega. Lectura con <c>shipments.read</c>;
/// planificar, repartir y registrar con <c>shipments.manage</c>. Las acciones que cambian datos devuelven el envío completo ya recalculado.
/// </summary>
internal static class ShipmentsEndpoint
{
    public static void Map(IEndpointRouteBuilder shipments)
    {
        shipments.MapGet("/", ListAsync).RequirePermission(CosechaPermissions.ShipmentsRead);
        shipments.MapGet("/pending-orders", PendingOrdersAsync).RequirePermission(CosechaPermissions.ShipmentsRead);
        shipments.MapGet("/{id:guid}", GetAsync).RequirePermission(CosechaPermissions.ShipmentsRead);
        shipments.MapPost("/", CreateAsync).RequirePermission(CosechaPermissions.ShipmentsManage);
        shipments.MapPut("/{id:guid}", UpdateAsync).RequirePermission(CosechaPermissions.ShipmentsManage);
        shipments.MapDelete("/{id:guid}", DeleteAsync).RequirePermission(CosechaPermissions.ShipmentsManage);
        shipments.MapPut("/{id:guid}/orders", SetOrdersAsync).RequirePermission(CosechaPermissions.ShipmentsManage);
        shipments.MapPost("/{id:guid}/status", SetStatusAsync).RequirePermission(CosechaPermissions.ShipmentsManage);
        shipments.MapPost("/{id:guid}/close", CloseAsync).RequirePermission(CosechaPermissions.ShipmentsManage);

        shipments.MapGet("/{id:guid}/allocation/candidates", CandidatesAsync).RequirePermission(CosechaPermissions.ShipmentsManage);
        shipments.MapPost("/{id:guid}/allocation/suggest", SuggestAsync).RequirePermission(CosechaPermissions.ShipmentsManage);
        shipments.MapPut("/{id:guid}/deliveries", ApplyAllocationAsync).RequirePermission(CosechaPermissions.ShipmentsManage);
        shipments.MapPost("/{id:guid}/deliveries/{deliveryId:guid}/status", SetDeliveryStatusAsync).RequirePermission(CosechaPermissions.ShipmentsManage);
        shipments.MapPut("/{id:guid}/deliveries/{deliveryId:guid}/reception", RecordReceptionAsync).RequirePermission(CosechaPermissions.ShipmentsManage);
        shipments.MapPut("/{id:guid}/orders/{shipmentOrderId:guid}/delivery", RecordOrderDeliveryAsync).RequirePermission(CosechaPermissions.ShipmentsManage);
    }

    private static async Task<IResult> ListAsync(
        Guid? seasonId, string? status, DateOnly? from, DateOnly? to, int? page, int? pageSize, ShipmentsHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.ListAsync(new ShipmentFilter(seasonId, status, from, to), PageRequest.Normalize(page, pageSize), ct)).ToResponse(http);

    private static async Task<IResult> PendingOrdersAsync(Guid seasonId, DateOnly? date, ShipmentsHandler handler, CancellationToken ct) =>
        Results.Json(await handler.PendingOrdersAsync(seasonId, date, ct));

    private static async Task<IResult> GetAsync(Guid id, ShipmentsHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.GetAsync(id, ct)).ToResponse(http);

    private static async Task<IResult> CreateAsync(ShipmentRequest request, ShipmentsHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.CreateAsync(request, ct)).ToResponse(http, StatusCodes.Status201Created);

    private static async Task<IResult> UpdateAsync(Guid id, ShipmentUpdateRequest request, ShipmentsHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.UpdateAsync(id, request, ct)).ToResponse(http);

    private static async Task<IResult> DeleteAsync(Guid id, uint version, ShipmentsHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.DeleteAsync(id, version, ct)).ToNoContent(http);

    private static async Task<IResult> SetOrdersAsync(Guid id, SetShipmentOrdersRequest request, ShipmentsHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.SetOrdersAsync(id, request, ct)).ToResponse(http);

    private static async Task<IResult> SetStatusAsync(Guid id, ShipmentStatusRequest request, ShipmentsHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.SetStatusAsync(id, request, ct)).ToResponse(http);

    private static async Task<IResult> CloseAsync(Guid id, CloseShipmentRequest request, ShipmentsHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.CloseAsync(id, request, ct)).ToResponse(http);

    private static async Task<IResult> CandidatesAsync(Guid id, AllocationHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.CandidatesAsync(id, ct)).ToResponse(http);

    private static async Task<IResult> SuggestAsync(Guid id, SuggestRequest request, AllocationHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.SuggestAsync(id, request, ct)).ToResponse(http);

    private static async Task<IResult> ApplyAllocationAsync(Guid id, ApplyAllocationRequest request, AllocationHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.ApplyAsync(id, request, ct)).ToResponse(http);

    private static async Task<IResult> SetDeliveryStatusAsync(
        Guid id, Guid deliveryId, DeliveryStatusRequest request, ReceptionHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.SetDeliveryStatusAsync(id, deliveryId, request, ct)).ToResponse(http);

    private static async Task<IResult> RecordReceptionAsync(
        Guid id, Guid deliveryId, ReceptionRequest request, ReceptionHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.RecordReceptionAsync(id, deliveryId, request, ct)).ToResponse(http);

    private static async Task<IResult> RecordOrderDeliveryAsync(
        Guid id, Guid shipmentOrderId, OrderDeliveryRequest request, ReceptionHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.RecordOrderDeliveryAsync(id, shipmentOrderId, request, ct)).ToResponse(http);
}
