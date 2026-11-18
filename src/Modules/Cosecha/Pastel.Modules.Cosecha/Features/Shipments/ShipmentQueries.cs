using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Cosecha.Common;
using Pastel.Modules.Cosecha.Domain;
using Pastel.Modules.Cosecha.Domain.Rules;
using Pastel.Modules.Cosecha.Features.Orders;
using Pastel.Modules.Cosecha.Persistence;

namespace Pastel.Modules.Cosecha.Features.Shipments;

internal sealed record ShipmentSummary(
    Guid Id, Guid SeasonId, string SeasonName, DateOnly ShipmentDate, string Status, decimal BufferPercent, int OrderCount, decimal PlannedKg, decimal TargetKg,
    decimal RequestedKg, decimal ReceivedKg, decimal DeliveredKg, int PendingReceptions, int PendingDeliveries, uint Version);

internal sealed record ShipmentOrderDto(
    Guid Id, Guid OrderId, Guid BuyerId, string BuyerName, DateOnly RequiredOn, string OrderStatus, decimal OrderedKg, decimal PlannedKg, decimal? DeliveredKg,
    string? DeliveryNote, decimal PricePerKg, uint Version);

internal sealed record DeliveryDto(
    Guid Id, Guid ProducerId, string ProducerName, string? PrimaryPhone, decimal RequestedKg, decimal? AvailableKg, decimal? ReceivedKg, decimal RejectedKg,
    decimal? AcceptedKg, decimal PricePerKg, decimal? AmountCrc, decimal PaidCrc, string Status, string? Quality, string? Notes, DateOnly? ExpectedPaymentDate, uint Version);

/// <summary>
/// Cifras de un envío. <c>TargetKg</c> es lo pedido más el margen; <c>DifferenceKg</c> es lo solicitado a productores menos ese objetivo.
/// El margen es informativo: lo entregado a compradores a su precio menos lo que se debe a los productores.
/// </summary>
internal sealed record ShipmentTotals(
    decimal PlannedKg, decimal BufferKg, decimal TargetKg, decimal RequestedKg, decimal DifferenceKg, decimal ReceivedKg, decimal AcceptedKg, decimal DeliveredKg,
    decimal ProducerCostCrc, decimal BuyerRevenueCrc, decimal MarginCrc, int PendingReceptions, int PendingDeliveries);

internal sealed record ShipmentDetail(
    ShipmentSummary Summary, string? Notes, DateTimeOffset? ClosedAt, string? CloseReason, IReadOnlyList<ShipmentOrderDto> Orders,
    IReadOnlyList<DeliveryDto> Deliveries, ShipmentTotals Totals, IReadOnlyList<ChangeDto> Changes);

internal static class ShipmentMath
{
    public static decimal BufferKg(decimal plannedKg, decimal bufferPercent) => decimal.Round(plannedKg * bufferPercent / 100m, 2, MidpointRounding.AwayFromZero);

    public static decimal TargetKg(decimal plannedKg, decimal bufferPercent) => plannedKg + BufferKg(plannedKg, bufferPercent);
}

internal sealed class ShipmentQueries(CosechaDbContext db, OrderQueries orderQueries)
{
    public async Task<IReadOnlyList<ShipmentSummary>> SummariesAsync(IReadOnlyList<Shipment> shipments, CancellationToken ct)
    {
        if (shipments.Count == 0)
        {
            return [];
        }

        var ids = shipments.Select(s => s.Id).ToList();
        var seasonIds = shipments.Select(s => s.SeasonId).Distinct().ToList();
        var seasons = await db.Seasons.AsNoTracking().Where(s => seasonIds.Contains(s.Id)).ToDictionaryAsync(s => s.Id, s => s.Name, ct);
        var shipmentOrders = await db.ShipmentOrders.AsNoTracking().Where(so => ids.Contains(so.ShipmentId)).ToListAsync(ct);
        var deliveries = await db.Deliveries.AsNoTracking().Where(d => ids.Contains(d.ShipmentId)).ToListAsync(ct);

        return shipments.Select(shipment =>
        {
            var orders = shipmentOrders.Where(so => so.ShipmentId == shipment.Id).ToList();
            var own = deliveries.Where(d => d.ShipmentId == shipment.Id).ToList();
            var planned = orders.Sum(so => so.PlannedKg);
            return new ShipmentSummary(
                shipment.Id,
                shipment.SeasonId,
                seasons.GetValueOrDefault(shipment.SeasonId) ?? string.Empty,
                shipment.ShipmentDate,
                shipment.Status.ToString(),
                shipment.BufferPercent,
                orders.Count,
                planned,
                ShipmentMath.TargetKg(planned, shipment.BufferPercent),
                own.Where(d => d.Status != DeliveryStatus.NoDelivery).Sum(d => d.RequestedKg),
                own.Sum(d => d.ReceivedKg ?? 0m),
                orders.Sum(so => so.DeliveredKg ?? 0m),
                ShipmentRules.UnregisteredReceptions(own.Select(d => d.Status)),
                ShipmentRules.UnregisteredDeliveries(orders.Select(so => so.DeliveredKg)),
                shipment.Version);
        }).ToList();
    }

    public async Task<ShipmentDetail?> DetailAsync(Guid id, CancellationToken ct)
    {
        var shipment = await db.Shipments.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
        if (shipment is null)
        {
            return null;
        }

        var summary = (await SummariesAsync([shipment], ct))[0];
        var orders = await OrdersAsync(id, ct);
        var deliveries = await DeliveriesAsync(id, ct);
        return new ShipmentDetail(summary, shipment.Notes, shipment.ClosedAt, shipment.CloseReason, orders, deliveries, TotalsOf(shipment, orders, deliveries), await ChangesAsync(id, orders, deliveries, ct));
    }

    public async Task<IReadOnlyList<ShipmentOrderDto>> OrdersAsync(Guid shipmentId, CancellationToken ct)
    {
        var rows = await db.ShipmentOrders.AsNoTracking().Where(so => so.ShipmentId == shipmentId).ToListAsync(ct);
        var orderIds = rows.Select(r => r.OrderId).ToList();
        var orders = await db.Orders.AsNoTracking().Where(o => orderIds.Contains(o.Id)).ToListAsync(ct);
        var summaries = (await orderQueries.SummariesAsync(orders, ct)).ToDictionary(s => s.Id);
        return rows
            .Where(r => summaries.ContainsKey(r.OrderId))
            .Select(r =>
            {
                var order = summaries[r.OrderId];
                var price = order.OrderedKg > 0 ? decimal.Round(order.TotalCrc / order.OrderedKg, 2, MidpointRounding.AwayFromZero) : 0m;
                return new ShipmentOrderDto(
                    r.Id, r.OrderId, order.BuyerId, order.BuyerName, order.RequiredOn, order.Status, order.OrderedKg, r.PlannedKg, r.DeliveredKg, r.DeliveryNote, price, r.Version);
            })
            .OrderBy(o => o.BuyerName)
            .ToList();
    }

    public async Task<IReadOnlyList<DeliveryDto>> DeliveriesAsync(Guid shipmentId, CancellationToken ct)
    {
        var rows = await db.Deliveries.AsNoTracking().Where(d => d.ShipmentId == shipmentId).ToListAsync(ct);
        var producerIds = rows.Select(r => r.ProducerId).ToList();
        var names = await db.Producers.AsNoTracking().Where(p => producerIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name, ct);
        var phones = await db.ProducerPhones.AsNoTracking().Where(ph => producerIds.Contains(ph.ProducerId)).OrderBy(ph => ph.SortOrder).ToListAsync(ct);
        var paid = await db.PaidByDeliveryAsync(rows.Select(r => r.Id), ct);
        return rows
            .Select(d => new DeliveryDto(
                d.Id,
                d.ProducerId,
                names.GetValueOrDefault(d.ProducerId) ?? string.Empty,
                (phones.FirstOrDefault(ph => ph.ProducerId == d.ProducerId && ph.IsPrimary) ?? phones.FirstOrDefault(ph => ph.ProducerId == d.ProducerId))?.Phone,
                d.RequestedKg,
                d.AvailableKg,
                d.ReceivedKg,
                d.RejectedKg,
                d.AcceptedKg,
                d.PricePerKg,
                d.AmountCrc,
                paid.GetValueOrDefault(d.Id),
                d.Status.ToString(),
                d.Quality?.ToString(),
                d.Notes,
                d.ExpectedPaymentDate,
                d.Version))
            .OrderBy(d => d.ProducerName)
            .ToList();
    }

    public static ShipmentTotals TotalsOf(Shipment shipment, IReadOnlyList<ShipmentOrderDto> orders, IReadOnlyList<DeliveryDto> deliveries)
    {
        var planned = orders.Sum(o => o.PlannedKg);
        var target = ShipmentMath.TargetKg(planned, shipment.BufferPercent);
        var requested = deliveries.Where(d => d.Status != nameof(DeliveryStatus.NoDelivery)).Sum(d => d.RequestedKg);
        var cost = deliveries.Sum(d => d.AmountCrc ?? 0m);
        var revenue = orders.Sum(o => OrderRules.LineTotal(o.DeliveredKg ?? 0m, o.PricePerKg));
        return new ShipmentTotals(
            planned,
            ShipmentMath.BufferKg(planned, shipment.BufferPercent),
            target,
            requested,
            requested - target,
            deliveries.Sum(d => d.ReceivedKg ?? 0m),
            deliveries.Sum(d => d.AcceptedKg ?? 0m),
            orders.Sum(o => o.DeliveredKg ?? 0m),
            cost,
            revenue,
            revenue - cost,
            ShipmentRules.UnregisteredReceptions(deliveries.Select(d => Enum.Parse<DeliveryStatus>(d.Status))),
            ShipmentRules.UnregisteredDeliveries(orders.Select(o => o.DeliveredKg)));
    }

    private async Task<IReadOnlyList<ChangeDto>> ChangesAsync(
        Guid shipmentId, IReadOnlyList<ShipmentOrderDto> orders, IReadOnlyList<DeliveryDto> deliveries, CancellationToken ct)
    {
        var own = await db.RecentChangesAsync(nameof(Shipment), [shipmentId], 100, ct);
        var forOrders = await db.RecentChangesAsync(nameof(ShipmentOrder), orders.Select(o => o.Id), 100, ct);
        var forDeliveries = await db.RecentChangesAsync(nameof(ProducerDelivery), deliveries.Select(d => d.Id), 100, ct);
        return own.Concat(forOrders).Concat(forDeliveries).OrderByDescending(c => c.ChangedAt).Take(100).ToList();
    }
}
