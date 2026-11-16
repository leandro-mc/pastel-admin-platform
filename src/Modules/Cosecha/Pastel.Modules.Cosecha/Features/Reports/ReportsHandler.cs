using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Cosecha.Common;
using Pastel.Modules.Cosecha.Domain;
using Pastel.Modules.Cosecha.Domain.Rules;
using Pastel.Modules.Cosecha.Features.Orders;
using Pastel.Modules.Cosecha.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha.Features.Reports;

/// <summary><c>Kind</c> orienta el formato en pantalla: <c>text</c>, <c>number</c> (kilos), <c>money</c> (colones) o <c>date</c>.</summary>
internal sealed record ReportColumn(string Key, string Label, string Kind);

internal sealed record ReportTable(string Kind, string Title, IReadOnlyList<ReportColumn> Columns, IReadOnlyList<IReadOnlyList<object?>> Rows);

internal sealed record ReportFilter(Guid? SeasonId, DateOnly? From, DateOnly? To);

internal sealed record ReportFile(string FileName, byte[] Content);

/// <summary>Reportes por envío, productor, comprador y temporada. El margen es informativo y solo lo ve quien tiene <c>reports.read</c>.</summary>
internal sealed class ReportsHandler(CosechaDbContext db, Stamper stamper, OrderQueries orderQueries)
{
    private const int MaxRows = 5000;
    private static readonly string[] Kinds = ["shipments", "producers", "buyers", "season"];

    public async Task<Result<ReportTable>> BuildAsync(string kind, ReportFilter filter, CancellationToken ct)
    {
        if (filter is { From: { } from, To: { } to } && to < from)
        {
            return new FieldErrors().Add("to", "La fecha final no puede ser anterior a la inicial.").ToError("cosecha.report.invalid");
        }

        return kind switch
        {
            "shipments" => await ShipmentsAsync(filter, ct),
            "producers" => await ProducersAsync(filter, ct),
            "buyers" => await BuyersAsync(filter, ct),
            "season" => await SeasonAsync(filter, ct),
            _ => new FieldErrors().Add("kind", $"Use uno de: {string.Join(", ", Kinds)}.").ToError("cosecha.report.invalid"),
        };
    }

    public async Task<Result<ReportFile>> ExportCsvAsync(string kind, ReportFilter filter, CancellationToken ct)
    {
        var table = await BuildAsync(kind, filter, ct);
        if (table.IsFailure)
        {
            return table.Error;
        }

        var content = CsvDocument.Write([.. table.Value.Columns.Select(c => c.Label)], table.Value.Rows);
        return new ReportFile($"cosecha-{kind}-{CostaRicaTime.Today(stamper.Now):yyyy-MM-dd}.csv", content);
    }

    private async Task<Data> LoadAsync(ReportFilter filter, CancellationToken ct)
    {
        var query = db.Shipments.AsNoTracking().AsQueryable();
        if (filter.SeasonId is { } seasonId)
        {
            query = query.Where(s => s.SeasonId == seasonId);
        }

        if (filter.From is { } from)
        {
            query = query.Where(s => s.ShipmentDate >= from);
        }

        if (filter.To is { } to)
        {
            query = query.Where(s => s.ShipmentDate <= to);
        }

        var shipments = await query.OrderBy(s => s.ShipmentDate).Take(MaxRows).ToListAsync(ct);
        var ids = shipments.Select(s => s.Id).ToList();
        var shipmentOrders = await db.ShipmentOrders.AsNoTracking().Where(so => ids.Contains(so.ShipmentId)).ToListAsync(ct);
        var deliveries = await db.Deliveries.AsNoTracking().Where(d => ids.Contains(d.ShipmentId)).ToListAsync(ct);
        var orderIds = shipmentOrders.Select(so => so.OrderId).Distinct().ToList();
        var orders = await db.Orders.AsNoTracking().Where(o => orderIds.Contains(o.Id)).ToListAsync(ct);
        var prices = (await orderQueries.SummariesAsync(orders, ct)).ToDictionary(s => s.Id, AveragePrice);
        return new Data(shipments, shipmentOrders, deliveries, prices);
    }

    private async Task<Result<ReportTable>> ShipmentsAsync(ReportFilter filter, CancellationToken ct)
    {
        var data = await LoadAsync(filter, ct);
        var rows = data.Shipments.Select(s =>
        {
            var orders = data.ShipmentOrders.Where(so => so.ShipmentId == s.Id).ToList();
            var deliveries = data.Deliveries.Where(d => d.ShipmentId == s.Id).ToList();
            var cost = deliveries.Sum(d => d.AmountCrc ?? 0m);
            var revenue = Revenue(orders, data.Prices);
            return (IReadOnlyList<object?>)
            [
                s.ShipmentDate, s.Status.ToString(), orders.Count, orders.Sum(o => o.PlannedKg), deliveries.Where(d => d.Status != DeliveryStatus.NoDelivery).Sum(d => d.RequestedKg),
                deliveries.Sum(d => d.ReceivedKg ?? 0m), deliveries.Sum(d => d.RejectedKg), orders.Sum(o => o.DeliveredKg ?? 0m), cost, revenue, revenue - cost,
            ];
        }).ToList();
        return new ReportTable(
            "shipments",
            "Resumen por envío",
            [
                new("date", "Fecha", "date"), new("status", "Estado", "text"), new("orders", "Pedidos", "number"), new("plannedKg", "Planeado (kg)", "number"),
                new("requestedKg", "Solicitado (kg)", "number"), new("receivedKg", "Recibido (kg)", "number"), new("rejectedKg", "Rechazado (kg)", "number"),
                new("deliveredKg", "Entregado (kg)", "number"), new("costCrc", "A productores (₡)", "money"), new("revenueCrc", "De compradores (₡)", "money"),
                new("marginCrc", "Margen (₡)", "money"),
            ],
            rows);
    }

    private async Task<Result<ReportTable>> ProducersAsync(ReportFilter filter, CancellationToken ct)
    {
        var data = await LoadAsync(filter, ct);
        var received = data.Deliveries.Where(d => d.Status == DeliveryStatus.Received).ToList();
        var paid = await db.PaidByDeliveryAsync(received.Select(d => d.Id), ct);
        var producerIds = received.Select(d => d.ProducerId).Distinct().ToList();
        var names = await db.Producers.AsNoTracking().Where(p => producerIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name, ct);
        var rows = received.GroupBy(d => d.ProducerId).Select(g =>
        {
            var amount = g.Sum(d => d.AmountCrc ?? 0m);
            var paidCrc = g.Sum(d => paid.GetValueOrDefault(d.Id));
            return (IReadOnlyList<object?>)
            [
                names.GetValueOrDefault(g.Key) ?? string.Empty, g.Count(), g.Sum(d => d.ReceivedKg ?? 0m), g.Sum(d => d.RejectedKg), g.Sum(d => d.AcceptedKg ?? 0m), amount, paidCrc, amount - paidCrc,
            ];
        }).OrderBy(r => (string)r[0]!, StringComparer.CurrentCultureIgnoreCase).ToList();
        return new ReportTable(
            "producers",
            "Estado de cuenta por productor",
            [
                new("producer", "Productor", "text"), new("deliveries", "Entregas", "number"), new("receivedKg", "Recibido (kg)", "number"), new("rejectedKg", "Rechazado (kg)", "number"),
                new("acceptedKg", "Aceptado (kg)", "number"), new("amountCrc", "Monto (₡)", "money"), new("paidCrc", "Pagado (₡)", "money"), new("balanceCrc", "Saldo (₡)", "money"),
            ],
            rows);
    }

    private async Task<Result<ReportTable>> BuyersAsync(ReportFilter filter, CancellationToken ct)
    {
        var query = db.Orders.AsNoTracking().Where(o => o.Status == OrderStatus.Confirmed);
        if (filter.SeasonId is { } seasonId)
        {
            query = query.Where(o => o.SeasonId == seasonId);
        }

        if (filter.From is { } from)
        {
            query = query.Where(o => o.RequiredOn >= from);
        }

        if (filter.To is { } to)
        {
            query = query.Where(o => o.RequiredOn <= to);
        }

        var summaries = await orderQueries.SummariesAsync(await query.Take(MaxRows).ToListAsync(ct), ct);
        var rows = summaries.GroupBy(s => s.BuyerName).Select(g => (IReadOnlyList<object?>)
        [
            g.Key, g.Count(), g.Sum(s => s.OrderedKg), g.Sum(s => s.DeliveredKg), g.Sum(s => s.PendingKg), g.Sum(s => s.TotalCrc), g.Sum(s => OrderRules.LineTotal(s.DeliveredKg, AveragePrice(s))),
        ]).OrderBy(r => (string)r[0]!, StringComparer.CurrentCultureIgnoreCase).ToList();
        return new ReportTable(
            "buyers",
            "Resumen por comprador",
            [
                new("buyer", "Comprador", "text"), new("orders", "Pedidos", "number"), new("orderedKg", "Pedido (kg)", "number"), new("deliveredKg", "Entregado (kg)", "number"),
                new("pendingKg", "Pendiente (kg)", "number"), new("totalCrc", "Total pedido (₡)", "money"), new("deliveredCrc", "Entregado (₡)", "money"),
            ],
            rows);
    }

    private async Task<Result<ReportTable>> SeasonAsync(ReportFilter filter, CancellationToken ct)
    {
        var data = await LoadAsync(filter, ct);
        var received = data.Deliveries.Where(d => d.Status == DeliveryStatus.Received).ToList();
        var paid = (await db.PaidByDeliveryAsync(received.Select(d => d.Id), ct)).Values.Sum();
        var cost = received.Sum(d => d.AmountCrc ?? 0m);
        var revenue = Revenue(data.ShipmentOrders, data.Prices);
        IReadOnlyList<object?>[] rows =
        [
            ["Envíos", data.Shipments.Count, null],
            ["Recibido de productores (kg)", received.Sum(d => d.ReceivedKg ?? 0m), null],
            ["Rechazado en recepción (kg)", received.Sum(d => d.RejectedKg), null],
            ["Entregado a compradores (kg)", data.ShipmentOrders.Sum(so => so.DeliveredKg ?? 0m), null],
            ["Debido a productores", null, cost],
            ["Pagado a productores", null, paid],
            ["Saldo por pagar", null, cost - paid],
            ["Ingresos de compradores", null, revenue],
            ["Margen informativo", null, revenue - cost],
        ];
        return new ReportTable("season", "Resumen de la temporada", [new("concept", "Concepto", "text"), new("quantity", "Cantidad", "number"), new("amountCrc", "Monto (₡)", "money")], rows);
    }

    private static decimal AveragePrice(OrderSummary order) =>
        order.OrderedKg > 0 ? decimal.Round(order.TotalCrc / order.OrderedKg, 2, MidpointRounding.AwayFromZero) : 0m;

    private static decimal Revenue(IEnumerable<ShipmentOrder> orders, Dictionary<Guid, decimal> prices) =>
        orders.Sum(so => OrderRules.LineTotal(so.DeliveredKg ?? 0m, prices.GetValueOrDefault(so.OrderId)));

    private sealed record Data(IReadOnlyList<Shipment> Shipments, IReadOnlyList<ShipmentOrder> ShipmentOrders, IReadOnlyList<ProducerDelivery> Deliveries, Dictionary<Guid, decimal> Prices);
}
