using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Cosecha.Common;
using Pastel.Modules.Cosecha.Domain;
using Pastel.Modules.Cosecha.Domain.Rules;
using Pastel.Modules.Cosecha.Features.Orders;
using Pastel.Modules.Cosecha.Persistence;
using Pastel.Platform.Auditing;
using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha.Features.Shipments;

internal sealed record ShipmentOrderInput(Guid? OrderId, decimal? PlannedKg);

/// <summary><c>PlannedKg</c> vacío significa «lo pendiente por planificar» de ese pedido.</summary>
internal sealed record ShipmentRequest(Guid? SeasonId, DateOnly? ShipmentDate, decimal? BufferPercent, string? Notes, IReadOnlyList<ShipmentOrderInput>? Orders);

internal sealed record ShipmentUpdateRequest(DateOnly? ShipmentDate, decimal? BufferPercent, string? Notes, string? Note, uint Version);

internal sealed record SetShipmentOrdersRequest(IReadOnlyList<ShipmentOrderInput>? Orders, string? Note, uint Version);

internal sealed record ShipmentStatusRequest(string? Status, string? Reason, uint Version);

internal sealed record CloseShipmentRequest(string? Reason, uint Version);

internal sealed record ShipmentFilter(Guid? SeasonId, string? Status, DateOnly? From, DateOnly? To);

internal sealed record PendingOrderDto(Guid OrderId, Guid BuyerId, string BuyerName, DateOnly RequiredOn, decimal OrderedKg, decimal UnplannedKg, decimal TotalCrc);

internal sealed class ShipmentsHandler(CosechaDbContext db, Stamper stamper, ChangeLog changeLog, ShipmentQueries queries, OrderQueries orderQueries, IAuditTrail audit)
{
    private const int MaxOrdersPerShipment = 200;
    private const decimal MaxKg = 10_000_000m;

    public async Task<Result<PagedResult<ShipmentSummary>>> ListAsync(ShipmentFilter filter, PageRequest page, CancellationToken ct)
    {
        var query = db.Shipments.AsNoTracking().AsQueryable();
        if (filter.SeasonId is { } seasonId)
        {
            query = query.Where(s => s.SeasonId == seasonId);
        }

        if (Texts.Clean(filter.Status) is { } status)
        {
            if (!Enum.TryParse<ShipmentStatus>(status, ignoreCase: true, out var parsed) || !Enum.IsDefined(parsed))
            {
                return new FieldErrors().Add("status", "Estado desconocido.").ToError("cosecha.shipment.invalid");
            }

            query = query.Where(s => s.Status == parsed);
        }

        if (filter.From is { } from)
        {
            query = query.Where(s => s.ShipmentDate >= from);
        }

        if (filter.To is { } to)
        {
            query = query.Where(s => s.ShipmentDate <= to);
        }

        var total = await query.CountAsync(ct);
        var shipments = await query.OrderByDescending(s => s.ShipmentDate).Skip(page.Skip).Take(page.PageSize).ToListAsync(ct);
        return new PagedResult<ShipmentSummary>(await queries.SummariesAsync(shipments, ct), page.Page, page.PageSize, total);
    }

    public async Task<Result<ShipmentDetail>> GetAsync(Guid id, CancellationToken ct) =>
        await queries.DetailAsync(id, ct) is { } detail ? detail : CosechaErrors.NotFound;

    /// <summary>Pedidos confirmados con kilos todavía sin planificar, los de fecha más cercana a la del envío primero.</summary>
    public async Task<IReadOnlyList<PendingOrderDto>> PendingOrdersAsync(Guid seasonId, DateOnly? around, CancellationToken ct)
    {
        var orders = await db.Orders.AsNoTracking().Where(o => o.SeasonId == seasonId && o.Status == OrderStatus.Confirmed).Take(2000).ToListAsync(ct);
        var anchor = around ?? CostaRicaTime.Today(stamper.Now);
        return (await orderQueries.SummariesAsync(orders, ct))
            .Where(s => s.UnplannedKg > 0)
            .OrderBy(s => Math.Abs(s.RequiredOn.DayNumber - anchor.DayNumber))
            .ThenBy(s => s.BuyerName)
            .Select(s => new PendingOrderDto(s.Id, s.BuyerId, s.BuyerName, s.RequiredOn, s.OrderedKg, s.UnplannedKg, s.TotalCrc))
            .ToList();
    }

    public async Task<Result<ShipmentDetail>> CreateAsync(ShipmentRequest request, CancellationToken ct)
    {
        var errors = new FieldErrors();
        var date = errors.RequiredDate("shipmentDate", request.ShipmentDate);
        var buffer = errors.OptionalDecimal("bufferPercent", request.BufferPercent, 0m, 100m) ?? 0m;
        var notes = errors.OptionalText("notes", request.Notes, 1000);
        if (request.SeasonId is null)
        {
            errors.Add("seasonId", "Elija una temporada.");
        }

        ParseOrderInputs(errors, request.Orders, out var inputs);
        if (errors.Any)
        {
            return errors.ToError("cosecha.shipment.invalid");
        }

        var season = await db.Seasons.AsNoTracking().FirstOrDefaultAsync(s => s.Id == request.SeasonId, ct);
        if (season is null)
        {
            return errors.Add("seasonId", "Elija una temporada válida.").ToError("cosecha.shipment.invalid");
        }

        if (season.Status != SeasonStatus.Active)
        {
            return CosechaErrors.SeasonClosed;
        }

        var resolved = await ResolveOrdersAsync(season.Id, inputs, ct);
        if (resolved.IsFailure)
        {
            return resolved.Error;
        }

        var shipment = stamper.Created(new Shipment { SeasonId = season.Id, ShipmentDate = date!.Value, Status = ShipmentStatus.Planned, BufferPercent = buffer, Notes = notes });
        db.Shipments.Add(shipment);
        foreach (var (orderId, plannedKg) in resolved.Value)
        {
            db.ShipmentOrders.Add(stamper.Created(new ShipmentOrder { ShipmentId = shipment.Id, OrderId = orderId, PlannedKg = plannedKg }));
        }

        await db.SaveChangesAsync(ct);
        return await queries.DetailAsync(shipment.Id, ct) is { } detail ? detail : CosechaErrors.NotFound;
    }

    public async Task<Result<ShipmentDetail>> UpdateAsync(Guid id, ShipmentUpdateRequest request, CancellationToken ct)
    {
        var errors = new FieldErrors();
        var date = errors.RequiredDate("shipmentDate", request.ShipmentDate);
        var buffer = errors.RequiredDecimal("bufferPercent", request.BufferPercent, 0m, 100m);
        var notes = errors.OptionalText("notes", request.Notes, 1000);
        var note = errors.OptionalText("note", request.Note, 500);
        if (errors.Any)
        {
            return errors.ToError("cosecha.shipment.invalid");
        }

        var shipment = await db.Shipments.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (shipment is null)
        {
            return CosechaErrors.NotFound;
        }

        if (shipment.Status == ShipmentStatus.Closed && note is null)
        {
            return CosechaErrors.ChangeNoteRequired;
        }

        db.Expect(shipment, request.Version);
        changeLog.Record(nameof(Shipment), id, "Fecha del envío", shipment.ShipmentDate, date, note);
        changeLog.Record(nameof(Shipment), id, "Margen sobre lo pedido (%)", shipment.BufferPercent, buffer, note);
        shipment.ShipmentDate = date!.Value;
        shipment.BufferPercent = buffer!.Value;
        shipment.Notes = notes;
        stamper.Updated(shipment);
        await db.SaveChangesAsync(ct);
        return await queries.DetailAsync(id, ct) is { } detail ? detail : CosechaErrors.NotFound;
    }

    /// <summary>Reemplaza los pedidos del envío. Se quitan los que faltan, salvo los que ya tienen entrega registrada.</summary>
    public async Task<Result<ShipmentDetail>> SetOrdersAsync(Guid id, SetShipmentOrdersRequest request, CancellationToken ct)
    {
        var errors = new FieldErrors();
        var note = errors.OptionalText("note", request.Note, 500);
        ParseOrderInputs(errors, request.Orders, out var inputs);
        if (errors.Any)
        {
            return errors.ToError("cosecha.shipment.invalid");
        }

        var shipment = await db.Shipments.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (shipment is null)
        {
            return CosechaErrors.NotFound;
        }

        if (shipment.Status == ShipmentStatus.Closed && note is null)
        {
            return CosechaErrors.ChangeNoteRequired;
        }

        var existing = await db.ShipmentOrders.Where(so => so.ShipmentId == id).ToListAsync(ct);
        var newInputs = inputs.Where(i => existing.All(e => e.OrderId != i.OrderId)).ToList();
        var resolved = await ResolveOrdersAsync(shipment.SeasonId, newInputs, ct);
        if (resolved.IsFailure)
        {
            return resolved.Error;
        }

        var involvedIds = inputs.Select(i => i.OrderId).Concat(existing.Select(e => e.OrderId)).Distinct().ToList();
        var involved = await db.Orders.AsNoTracking().Where(o => involvedIds.Contains(o.Id)).ToListAsync(ct);
        var buyers = (await orderQueries.SummariesAsync(involved, ct)).ToDictionary(s => s.Id, s => s.BuyerName);
        string Label(string what, Guid orderId) => Texts.Truncate($"{what} ({buyers.GetValueOrDefault(orderId) ?? "pedido"})", 60);

        db.Expect(shipment, request.Version);
        stamper.Updated(shipment);
        foreach (var input in inputs)
        {
            var current = existing.FirstOrDefault(e => e.OrderId == input.OrderId);
            if (current is null)
            {
                var plannedKg = resolved.Value.First(r => r.OrderId == input.OrderId).PlannedKg;
                db.ShipmentOrders.Add(stamper.Created(new ShipmentOrder { ShipmentId = id, OrderId = input.OrderId, PlannedKg = plannedKg }));
                changeLog.Record(nameof(Shipment), id, Label("Pedido agregado, kilos", input.OrderId), null, plannedKg, note);
            }
            else if (input.PlannedKg is { } newPlanned && newPlanned != current.PlannedKg)
            {
                changeLog.Record(nameof(ShipmentOrder), current.Id, Label("Kilos planeados", input.OrderId), current.PlannedKg, newPlanned, note);
                current.PlannedKg = newPlanned;
                stamper.Updated(current);
            }
        }

        foreach (var removed in existing.Where(e => inputs.All(i => i.OrderId != e.OrderId)))
        {
            if (removed.DeliveredKg is not null)
            {
                return CosechaErrors.ShipmentOrderDelivered;
            }

            changeLog.Record(nameof(Shipment), id, Label("Pedido quitado, kilos", removed.OrderId), removed.PlannedKg, null, note);
            db.ShipmentOrders.Remove(removed);
        }

        await db.SaveChangesAsync(ct);
        return await queries.DetailAsync(id, ct) is { } detail ? detail : CosechaErrors.NotFound;
    }

    public async Task<Result> DeleteAsync(Guid id, uint version, CancellationToken ct)
    {
        var shipment = await db.Shipments.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (shipment is null)
        {
            return CosechaErrors.NotFound;
        }

        var anyReception = await db.Deliveries.AnyAsync(d => d.ShipmentId == id && d.Status == DeliveryStatus.Received, ct);
        var anyDelivered = await db.ShipmentOrders.AnyAsync(so => so.ShipmentId == id && so.DeliveredKg != null, ct);
        if (shipment.Status != ShipmentStatus.Planned || anyReception || anyDelivered)
        {
            return CosechaErrors.ShipmentNotDeletable;
        }

        db.Expect(shipment, version);
        db.Shipments.Remove(shipment);
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(new AuditRecord("cosecha.shipment.deleted", "cosecha", stamper.UserId, Target: id.ToString(), Before: new { shipment.ShipmentDate }), ct);
        return Result.Success();
    }

    /// <summary>Avanza un paso o retrocede (con motivo). El cierre es una acción aparte porque valida lo pendiente.</summary>
    public async Task<Result<ShipmentDetail>> SetStatusAsync(Guid id, ShipmentStatusRequest request, CancellationToken ct)
    {
        if (!Enum.TryParse<ShipmentStatus>(request.Status, ignoreCase: true, out var target) || !Enum.IsDefined(target))
        {
            return new FieldErrors().Add("status", "Estado desconocido.").ToError("cosecha.shipment.invalid");
        }

        var shipment = await db.Shipments.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (shipment is null)
        {
            return CosechaErrors.NotFound;
        }

        if (!ShipmentRules.IsAllowedTransition(shipment.Status, target))
        {
            return CosechaErrors.ShipmentInvalidTransition;
        }

        var reason = Texts.Clean(request.Reason);
        if (ShipmentRules.IsBackward(shipment.Status, target) && (reason is null || reason.Length > 500))
        {
            return CosechaErrors.ReasonRequired;
        }

        var previous = shipment.Status;
        db.Expect(shipment, request.Version);
        changeLog.Record(nameof(Shipment), id, "Estado", previous, target, reason);
        shipment.Status = target;
        if (previous == ShipmentStatus.Closed)
        {
            shipment.ClosedAt = null;
            shipment.CloseReason = null;
        }

        stamper.Updated(shipment);
        await db.SaveChangesAsync(ct);
        if (previous == ShipmentStatus.Closed)
        {
            await audit.WriteAsync(new AuditRecord("cosecha.shipment.reopened", "cosecha", stamper.UserId, Target: id.ToString(), After: new { reason }), ct);
        }

        return await queries.DetailAsync(id, ct) is { } detail ? detail : CosechaErrors.NotFound;
    }

    /// <summary>Cierra el envío. Con recepciones o entregas sin registrar exige el motivo (queda en auditoría con lo que faltaba).</summary>
    public async Task<Result<ShipmentDetail>> CloseAsync(Guid id, CloseShipmentRequest request, CancellationToken ct)
    {
        var shipment = await db.Shipments.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (shipment is null)
        {
            return CosechaErrors.NotFound;
        }

        if (shipment.Status == ShipmentStatus.Closed)
        {
            return CosechaErrors.ShipmentInvalidTransition;
        }

        var reason = Texts.Clean(request.Reason);
        if (reason is { Length: > 500 })
        {
            return CosechaErrors.ReasonRequired;
        }

        var deliveries = await db.Deliveries.AsNoTracking().Where(d => d.ShipmentId == id).Select(d => d.Status).ToListAsync(ct);
        var delivered = await db.ShipmentOrders.AsNoTracking().Where(so => so.ShipmentId == id).Select(so => so.DeliveredKg).ToListAsync(ct);
        var check = ShipmentRules.CheckClose(deliveries, delivered, reason);
        if (check.IsFailure)
        {
            return check.Error;
        }

        var previous = shipment.Status;
        db.Expect(shipment, request.Version);
        changeLog.Record(nameof(Shipment), id, "Estado", previous, ShipmentStatus.Closed, reason);
        shipment.Status = ShipmentStatus.Closed;
        shipment.ClosedAt = stamper.Now;
        shipment.CloseReason = reason;
        stamper.Updated(shipment);
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(
            new AuditRecord(
                "cosecha.shipment.closed",
                "cosecha",
                stamper.UserId,
                Target: id.ToString(),
                After: new { reason, unregisteredReceptions = ShipmentRules.UnregisteredReceptions(deliveries), unregisteredDeliveries = ShipmentRules.UnregisteredDeliveries(delivered) }),
            ct);
        return await queries.DetailAsync(id, ct) is { } detail ? detail : CosechaErrors.NotFound;
    }

    private static void ParseOrderInputs(FieldErrors errors, IReadOnlyList<ShipmentOrderInput>? raw, out List<OrderInput> inputs)
    {
        inputs = [];
        if (raw is null || raw.Count == 0)
        {
            errors.Add("orders", "Elija al menos un pedido.");
            return;
        }

        if (raw.Count > MaxOrdersPerShipment)
        {
            errors.Add("orders", $"Se admiten hasta {MaxOrdersPerShipment} pedidos por envío.");
            return;
        }

        for (var i = 0; i < raw.Count; i++)
        {
            if (raw[i].OrderId is not { } orderId)
            {
                errors.Add($"orders[{i}].orderId", "Elija un pedido.");
                continue;
            }

            if (inputs.Any(x => x.OrderId == orderId))
            {
                errors.Add($"orders[{i}].orderId", "Este pedido está repetido.");
                continue;
            }

            var planned = errors.OptionalDecimal($"orders[{i}].plannedKg", raw[i].PlannedKg, 0m, MaxKg);
            inputs.Add(new OrderInput(orderId, planned));
        }
    }

    /// <summary>Valida los pedidos que entran a un envío (existen, son de la temporada, no cancelados ni en borrador) y fija los kilos por defecto.</summary>
    private async Task<Result<List<(Guid OrderId, decimal PlannedKg)>>> ResolveOrdersAsync(Guid seasonId, IReadOnlyList<OrderInput> inputs, CancellationToken ct)
    {
        var resolved = new List<(Guid OrderId, decimal PlannedKg)>();
        if (inputs.Count == 0)
        {
            return resolved;
        }

        var ids = inputs.Select(i => i.OrderId).ToList();
        var orders = await db.Orders.AsNoTracking().Where(o => ids.Contains(o.Id)).ToListAsync(ct);
        if (orders.Count != ids.Count)
        {
            return new FieldErrors().Add("orders", "Algún pedido no existe.").ToError("cosecha.shipment.invalid");
        }

        if (orders.Any(o => !ShipmentRules.CanAssign(o.Status)))
        {
            return CosechaErrors.ShipmentOrderCancelled;
        }

        if (orders.Any(o => o.Status == OrderStatus.Draft))
        {
            return CosechaErrors.ShipmentOrderDraft;
        }

        if (orders.Any(o => o.SeasonId != seasonId))
        {
            return CosechaErrors.ShipmentOrderOtherSeason;
        }

        var summaries = (await orderQueries.SummariesAsync(orders, ct)).ToDictionary(s => s.Id);
        foreach (var input in inputs)
        {
            resolved.Add((input.OrderId, input.PlannedKg ?? summaries[input.OrderId].UnplannedKg));
        }

        return resolved;
    }

    private sealed record OrderInput(Guid OrderId, decimal? PlannedKg);
}
