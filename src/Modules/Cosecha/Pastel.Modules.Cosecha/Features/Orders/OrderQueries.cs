using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Cosecha.Domain;
using Pastel.Modules.Cosecha.Domain.Rules;
using Pastel.Modules.Cosecha.Persistence;

namespace Pastel.Modules.Cosecha.Features.Orders;

internal sealed record OrderLineDto(Guid Id, Guid ProductId, string ProductName, decimal Kilograms, decimal PricePerKg);

internal sealed record OrderShipmentDto(Guid ShipmentId, DateOnly ShipmentDate, string ShipmentStatus, decimal PlannedKg, decimal? DeliveredKg);

/// <summary>
/// <c>Status</c> es el estado guardado; <c>Progress</c> el derivado de lo entregado. <c>PendingKg</c> es lo que falta entregar y
/// <c>UnplannedKg</c> lo que falta además de lo ya comprometido en envíos abiertos.
/// </summary>
internal sealed record OrderSummary(
    Guid Id, Guid BuyerId, string BuyerName, Guid SeasonId, string SeasonName, DateOnly RequiredOn, string Status, string Progress,
    decimal OrderedKg, decimal DeliveredKg, decimal PendingKg, decimal UnplannedKg, decimal TotalCrc, uint Version);

/// <summary>Cálculos de pedidos que se repiten (totales, entregado, avance): una sola implementación para la lista, el detalle y los envíos.</summary>
internal sealed class OrderQueries(CosechaDbContext db)
{
    public async Task<IReadOnlyList<OrderSummary>> SummariesAsync(IReadOnlyList<Order> orders, CancellationToken ct)
    {
        if (orders.Count == 0)
        {
            return [];
        }

        var ids = orders.Select(o => o.Id).ToList();
        var buyerIds = orders.Select(o => o.BuyerId).Distinct().ToList();
        var seasonIds = orders.Select(o => o.SeasonId).Distinct().ToList();
        var buyers = await db.Buyers.AsNoTracking().Where(b => buyerIds.Contains(b.Id)).ToDictionaryAsync(b => b.Id, b => b.Name, ct);
        var seasons = await db.Seasons.AsNoTracking().Where(s => seasonIds.Contains(s.Id)).ToDictionaryAsync(s => s.Id, s => s.Name, ct);
        var lines = await db.OrderLines.AsNoTracking().Where(l => ids.Contains(l.OrderId)).ToListAsync(ct);
        var shipmentOrders = await db.ShipmentOrders.AsNoTracking().Where(so => ids.Contains(so.OrderId)).ToListAsync(ct);
        var shipmentIds = shipmentOrders.Select(so => so.ShipmentId).Distinct().ToList();
        var shipmentStatus = await db.Shipments.AsNoTracking().Where(s => shipmentIds.Contains(s.Id)).ToDictionaryAsync(s => s.Id, s => s.Status, ct);

        return orders.Select(order =>
        {
            var own = lines.Where(l => l.OrderId == order.Id).ToList();
            var assigned = shipmentOrders.Where(so => so.OrderId == order.Id).ToList();
            var ordered = own.Sum(l => l.Kilograms);
            var delivered = assigned.Sum(so => so.DeliveredKg ?? 0m);
            var plannedOpen = assigned
                .Where(so => so.DeliveredKg is null && shipmentStatus.GetValueOrDefault(so.ShipmentId) != ShipmentStatus.Closed)
                .Sum(so => so.PlannedKg);
            return new OrderSummary(
                order.Id,
                order.BuyerId,
                buyers.GetValueOrDefault(order.BuyerId) ?? string.Empty,
                order.SeasonId,
                seasons.GetValueOrDefault(order.SeasonId) ?? string.Empty,
                order.RequiredOn,
                order.Status.ToString(),
                OrderRules.ProgressOf(order.Status, ordered, delivered).ToString(),
                ordered,
                delivered,
                Math.Max(ordered - delivered, 0m),
                OrderRules.PendingKg(ordered, delivered, plannedOpen),
                own.Sum(l => OrderRules.LineTotal(l.Kilograms, l.PricePerKg)),
                order.Version);
        }).ToList();
    }

    public async Task<IReadOnlyList<OrderLineDto>> LinesAsync(Guid orderId, CancellationToken ct)
    {
        var lines = await db.OrderLines.AsNoTracking().Where(l => l.OrderId == orderId).OrderBy(l => l.SortOrder).ToListAsync(ct);
        var productIds = lines.Select(l => l.ProductId).ToList();
        var names = await db.Products.AsNoTracking().Where(p => productIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name, ct);
        return lines.Select(l => new OrderLineDto(l.Id, l.ProductId, names.GetValueOrDefault(l.ProductId) ?? string.Empty, l.Kilograms, l.PricePerKg)).ToList();
    }

    public async Task<IReadOnlyList<OrderShipmentDto>> ShipmentsAsync(Guid orderId, CancellationToken ct)
    {
        var assigned = await db.ShipmentOrders.AsNoTracking().Where(so => so.OrderId == orderId).ToListAsync(ct);
        var shipmentIds = assigned.Select(so => so.ShipmentId).ToList();
        var shipments = await db.Shipments.AsNoTracking().Where(s => shipmentIds.Contains(s.Id)).ToDictionaryAsync(s => s.Id, s => s, ct);
        return assigned
            .Where(so => shipments.ContainsKey(so.ShipmentId))
            .Select(so => new OrderShipmentDto(so.ShipmentId, shipments[so.ShipmentId].ShipmentDate, shipments[so.ShipmentId].Status.ToString(), so.PlannedKg, so.DeliveredKg))
            .OrderBy(s => s.ShipmentDate)
            .ToList();
    }
}
