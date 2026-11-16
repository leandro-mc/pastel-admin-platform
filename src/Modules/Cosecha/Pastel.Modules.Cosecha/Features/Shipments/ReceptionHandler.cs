using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Cosecha.Common;
using Pastel.Modules.Cosecha.Domain;
using Pastel.Modules.Cosecha.Domain.Rules;
using Pastel.Modules.Cosecha.Features.Policy;
using Pastel.Modules.Cosecha.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha.Features.Shipments;

internal sealed record DeliveryStatusRequest(string? Status, string? Note, uint Version);

/// <summary>
/// <c>Quality</c> admite Good, WithObservations o Bad (por defecto Good). <c>PricePerKg</c> vacío conserva el precio de la entrega.
/// <c>Note</c> explica el cambio (obligatoria si el envío está cerrado); <c>Notes</c> son observaciones de la recepción.
/// </summary>
internal sealed record ReceptionRequest(decimal? ReceivedKg, decimal? RejectedKg, string? Quality, string? Notes, decimal? PricePerKg, string? Note, uint Version);

internal sealed record OrderDeliveryRequest(decimal? DeliveredKg, string? DeliveryNote, string? Note, uint Version);

/// <summary>Recepción en el punto de acopio y entrega a compradores. Lo ya registrado se puede corregir: queda antes/después, nota y quién.</summary>
internal sealed class ReceptionHandler(CosechaDbContext db, Stamper stamper, ChangeLog changeLog, ShipmentQueries queries)
{
    private const decimal MaxKg = 10_000_000m;

    public async Task<Result<ShipmentDetail>> SetDeliveryStatusAsync(Guid shipmentId, Guid deliveryId, DeliveryStatusRequest request, CancellationToken ct)
    {
        if (!Enum.TryParse<DeliveryStatus>(request.Status, ignoreCase: true, out var target) || !Enum.IsDefined(target) || target == DeliveryStatus.Received)
        {
            return new FieldErrors().Add("status", "Indique Requested, Confirmed o NoDelivery. La recepción se registra aparte.").ToError("cosecha.delivery.invalid");
        }

        var delivery = await db.Deliveries.FirstOrDefaultAsync(d => d.Id == deliveryId && d.ShipmentId == shipmentId, ct);
        var shipment = await db.Shipments.AsNoTracking().FirstOrDefaultAsync(s => s.Id == shipmentId, ct);
        if (delivery is null || shipment is null)
        {
            return CosechaErrors.NotFound;
        }

        var note = Texts.Clean(request.Note);
        if (shipment.Status == ShipmentStatus.Closed && note is null)
        {
            return CosechaErrors.ChangeNoteRequired;
        }

        var allowed = (delivery.Status, target) switch
        {
            (DeliveryStatus.Requested, DeliveryStatus.Confirmed) => true,
            (DeliveryStatus.Confirmed, DeliveryStatus.Requested) => true,
            (DeliveryStatus.Requested or DeliveryStatus.Confirmed, DeliveryStatus.NoDelivery) => true,
            (DeliveryStatus.NoDelivery, DeliveryStatus.Requested) => true,
            _ => false,
        };
        if (!allowed)
        {
            return CosechaErrors.DeliveryInvalidTransition;
        }

        db.Expect(delivery, request.Version);
        changeLog.Record(nameof(ProducerDelivery), deliveryId, "Estado de la entrega", delivery.Status, target, note);
        delivery.Status = target;
        stamper.Updated(delivery);
        await db.SaveChangesAsync(ct);
        return await queries.DetailAsync(shipmentId, ct) is { } detail ? detail : CosechaErrors.NotFound;
    }

    public async Task<Result<ShipmentDetail>> RecordReceptionAsync(Guid shipmentId, Guid deliveryId, ReceptionRequest request, CancellationToken ct)
    {
        var errors = new FieldErrors();
        var received = errors.RequiredDecimal("receivedKg", request.ReceivedKg, 0m, MaxKg);
        var rejected = errors.OptionalDecimal("rejectedKg", request.RejectedKg, 0m, MaxKg) ?? 0m;
        var price = errors.OptionalDecimal("pricePerKg", request.PricePerKg, 0m, 1_000_000m);
        var notes = errors.OptionalText("notes", request.Notes, 1000);
        var note = errors.OptionalText("note", request.Note, 500);
        var quality = DeliveryQuality.Good;
        if (Texts.Clean(request.Quality) is { } rawQuality && !(Enum.TryParse(rawQuality, ignoreCase: true, out quality) && Enum.IsDefined(quality)))
        {
            errors.Add("quality", "Indique Good, WithObservations o Bad.");
        }

        if (received is not null && rejected > received)
        {
            errors.Add("rejectedKg", "Los kilos rechazados no pueden superar los recibidos.");
        }

        if (errors.Any)
        {
            return errors.ToError("cosecha.delivery.invalid");
        }

        var delivery = await db.Deliveries.FirstOrDefaultAsync(d => d.Id == deliveryId && d.ShipmentId == shipmentId, ct);
        var shipment = await db.Shipments.AsNoTracking().FirstOrDefaultAsync(s => s.Id == shipmentId, ct);
        if (delivery is null || shipment is null)
        {
            return CosechaErrors.NotFound;
        }

        if (shipment.Status == ShipmentStatus.Closed && note is null)
        {
            return CosechaErrors.ChangeNoteRequired;
        }

        var newPrice = price ?? delivery.PricePerKg;
        var newAmount = ProducerAmounts.Amount(ProducerAmounts.AcceptedKg(received!.Value, rejected), newPrice);
        var paid = (await db.PaidByDeliveryAsync([deliveryId], ct)).GetValueOrDefault(deliveryId);
        if (paid > newAmount)
        {
            return CosechaErrors.DeliveryBelowPaid;
        }

        var producerName = await db.Producers.AsNoTracking().Where(p => p.Id == delivery.ProducerId).Select(p => p.Name).FirstOrDefaultAsync(ct) ?? "productor";
        string Label(string what) => Texts.Truncate($"{what} ({producerName})", 60);
        db.Expect(delivery, request.Version);
        if (delivery.ReceivedKg is not null)
        {
            // Registrar por primera vez no es una edición; solo las correcciones dejan rastro de antes y después.
            changeLog.Record(nameof(ProducerDelivery), deliveryId, Label("Kilos recibidos"), delivery.ReceivedKg, received, note);
            changeLog.Record(nameof(ProducerDelivery), deliveryId, Label("Kilos rechazados"), delivery.RejectedKg, rejected, note);
        }

        changeLog.Record(nameof(ProducerDelivery), deliveryId, Label("Precio por kilo"), delivery.PricePerKg, newPrice, note);

        delivery.ReceivedKg = received;
        delivery.RejectedKg = rejected;
        delivery.PricePerKg = newPrice;
        delivery.Quality = quality;
        delivery.Notes = notes;
        delivery.Status = DeliveryStatus.Received;
        delivery.ExpectedPaymentDate = await ExpectedPaymentDateAsync(shipment.ShipmentDate, delivery.ExpectedPaymentDate, ct);
        stamper.Updated(delivery);
        await db.SaveChangesAsync(ct);
        return await queries.DetailAsync(shipmentId, ct) is { } detail ? detail : CosechaErrors.NotFound;
    }

    public async Task<Result<ShipmentDetail>> RecordOrderDeliveryAsync(Guid shipmentId, Guid shipmentOrderId, OrderDeliveryRequest request, CancellationToken ct)
    {
        var errors = new FieldErrors();
        var delivered = errors.RequiredDecimal("deliveredKg", request.DeliveredKg, 0m, MaxKg);
        var deliveryNote = errors.OptionalText("deliveryNote", request.DeliveryNote, 500);
        var note = errors.OptionalText("note", request.Note, 500);
        if (errors.Any)
        {
            return errors.ToError("cosecha.delivery.invalid");
        }

        var row = await db.ShipmentOrders.FirstOrDefaultAsync(so => so.Id == shipmentOrderId && so.ShipmentId == shipmentId, ct);
        var shipment = await db.Shipments.AsNoTracking().FirstOrDefaultAsync(s => s.Id == shipmentId, ct);
        if (row is null || shipment is null)
        {
            return CosechaErrors.NotFound;
        }

        if (shipment.Status == ShipmentStatus.Closed && note is null)
        {
            return CosechaErrors.ChangeNoteRequired;
        }

        var buyerName = await db.Buyers.AsNoTracking()
            .Where(b => db.Orders.Any(o => o.Id == row.OrderId && o.BuyerId == b.Id))
            .Select(b => b.Name)
            .FirstOrDefaultAsync(ct) ?? "comprador";
        db.Expect(row, request.Version);
        if (row.DeliveredKg is not null)
        {
            changeLog.Record(nameof(ShipmentOrder), shipmentOrderId, Texts.Truncate($"Kilos entregados ({buyerName})", 60), row.DeliveredKg, delivered, note);
        }

        row.DeliveredKg = delivered;
        row.DeliveredAt ??= stamper.Now;
        row.DeliveryNote = deliveryNote;
        stamper.Updated(row);
        await db.SaveChangesAsync(ct);
        return await queries.DetailAsync(shipmentId, ct) is { } detail ? detail : CosechaErrors.NotFound;
    }

    /// <summary>
    /// Fecha prevista de pago: el día fijo de la política vigente (si alguien la registró) posterior a la entrega. Sin política no se
    /// asume ninguna: queda la que ya tuviera, o vacía.
    /// </summary>
    private async Task<DateOnly?> ExpectedPaymentDateAsync(DateOnly deliveredOn, DateOnly? current, CancellationToken ct)
    {
        var policy = await PolicyQueries.CurrentPaymentAsync(db, CostaRicaTime.Today(stamper.Now), ct);
        return policy?.PaymentWeekday is { } weekday ? CostaRicaTime.NextWeekdayAfter(deliveredOn, CostaRicaTime.FromIsoWeekday(weekday)) : current;
    }
}
