using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Cosecha.Common;
using Pastel.Modules.Cosecha.Domain;
using Pastel.Modules.Cosecha.Domain.Rules;
using Pastel.Modules.Cosecha.Persistence;
using Pastel.Platform.Auditing;
using Pastel.Platform.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha.Features.Settlements;

internal sealed record ProducerBalance(
    Guid ProducerId, string ProducerName, string? PrimaryPhone, decimal TotalCrc, decimal PaidCrc, decimal BalanceCrc, int PendingDeliveries, DateOnly? NextExpectedPaymentDate);

internal sealed record SettlementDelivery(
    Guid DeliveryId, Guid ShipmentId, DateOnly ShipmentDate, decimal AcceptedKg, decimal PricePerKg, decimal AmountCrc, decimal PaidCrc, decimal OutstandingCrc,
    string Status, DateOnly? ExpectedPaymentDate);

internal sealed record PaymentAllocationDto(Guid DeliveryId, DateOnly ShipmentDate, decimal AmountCrc);

internal sealed record PaymentDto(
    Guid Id, Guid ProducerId, DateOnly PaidOn, decimal AmountCrc, string Method, string? Reference, string? Note, bool IsVoided, DateTimeOffset? VoidedAt,
    string? VoidReason, IReadOnlyList<PaymentAllocationDto> Allocations, uint Version);

internal sealed record ProducerStatement(ProducerBalance Balance, IReadOnlyList<SettlementDelivery> Deliveries, IReadOnlyList<PaymentDto> Payments);

/// <summary><c>DeliveryIds</c> vacío paga lo más antiguo primero; con ids, solo esas entregas (también de la más antigua a la más nueva).</summary>
internal sealed record PaymentRequest(Guid? ProducerId, DateOnly? PaidOn, decimal? AmountCrc, string? Method, string? Reference, string? Note, IReadOnlyList<Guid>? DeliveryIds);

internal sealed record VoidPaymentRequest(string? Reason, uint Version);

internal sealed class SettlementsHandler(CosechaDbContext db, Stamper stamper, IAuditTrail audit)
{
    private const decimal MaxAmountCrc = 1_000_000_000m;

    public async Task<IReadOnlyList<ProducerBalance>> BalancesAsync(Guid? seasonId, CancellationToken ct)
    {
        var deliveries = await ReceivedDeliveriesAsync(null, seasonId, ct);
        var paid = await db.PaidByDeliveryAsync(deliveries.Select(d => d.Id), ct);
        var producerIds = deliveries.Select(d => d.ProducerId).Distinct().ToList();
        var producers = await db.Producers.AsNoTracking().Where(p => producerIds.Contains(p.Id)).ToListAsync(ct);
        var phones = await db.ProducerPhones.AsNoTracking().Where(ph => producerIds.Contains(ph.ProducerId)).OrderBy(ph => ph.SortOrder).ToListAsync(ct);
        return producers
            .Select(p => BalanceOf(p, deliveries.Where(d => d.ProducerId == p.Id).ToList(), paid, phones.Where(ph => ph.ProducerId == p.Id).ToList()))
            .OrderByDescending(b => b.BalanceCrc)
            .ThenBy(b => b.ProducerName)
            .ToList();
    }

    public async Task<Result<ProducerStatement>> StatementAsync(Guid producerId, Guid? seasonId, CancellationToken ct)
    {
        var producer = await db.Producers.AsNoTracking().FirstOrDefaultAsync(p => p.Id == producerId, ct);
        if (producer is null)
        {
            return CosechaErrors.NotFound;
        }

        var deliveries = await ReceivedDeliveriesAsync(producerId, seasonId, ct);
        var paid = await db.PaidByDeliveryAsync(deliveries.Select(d => d.Id), ct);
        var shipmentDates = await ShipmentDatesAsync(deliveries.Select(d => d.ShipmentId), ct);
        var phones = await db.ProducerPhones.AsNoTracking().Where(ph => ph.ProducerId == producerId).OrderBy(ph => ph.SortOrder).ToListAsync(ct);
        var lines = deliveries
            .OrderBy(d => shipmentDates.GetValueOrDefault(d.ShipmentId)).ThenBy(d => d.Id)
            .Select(d =>
            {
                var amount = d.AmountCrc ?? 0m;
                var paidCrc = paid.GetValueOrDefault(d.Id);
                return new SettlementDelivery(
                    d.Id, d.ShipmentId, shipmentDates.GetValueOrDefault(d.ShipmentId), d.AcceptedKg ?? 0m, d.PricePerKg, amount, paidCrc, Math.Max(amount - paidCrc, 0m),
                    PaymentAllocator.StatusOf(amount, paidCrc).ToString(), d.ExpectedPaymentDate);
            })
            .ToList();
        return new ProducerStatement(BalanceOf(producer, deliveries, paid, phones), lines, await PaymentsAsync(producerId, ct));
    }

    /// <summary>
    /// Registra un pago y lo aplica a las entregas pendientes, la más antigua primero. No admite pagar más de lo que se debe. Corre en una
    /// transacción serializable; además, un disparador de la base impide aplicar a una entrega más que su monto.
    /// </summary>
    public async Task<Result<PaymentDto>> RegisterAsync(PaymentRequest request, CancellationToken ct)
    {
        var errors = new FieldErrors();
        var paidOn = errors.RequiredDate("paidOn", request.PaidOn);
        if (paidOn is { } date && date > CostaRicaTime.Today(stamper.Now))
        {
            errors.Add("paidOn", "La fecha del pago no puede ser futura.");
        }

        var amount = errors.RequiredDecimal("amountCrc", request.AmountCrc, 0.01m, MaxAmountCrc);
        var reference = errors.OptionalText("reference", request.Reference, 100);
        var note = errors.OptionalText("note", request.Note, 500);
        if (!Enum.TryParse<PaymentMethod>(request.Method, ignoreCase: true, out var method) || !Enum.IsDefined(method))
        {
            errors.Add("method", "Indique Cash, Sinpe o Transfer.");
        }

        if (request.ProducerId is null)
        {
            errors.Add("producerId", "Elija un productor.");
        }

        var chosen = request.DeliveryIds?.Distinct().ToList();
        if (errors.Any)
        {
            return errors.ToError("cosecha.payment.invalid");
        }

        async Task<Result<Guid>> WorkAsync(CancellationToken token)
        {
            if (!await db.Producers.AnyAsync(p => p.Id == request.ProducerId, token))
            {
                return CosechaErrors.NotFound;
            }

            var deliveries = await ReceivedDeliveriesAsync(request.ProducerId, null, token);
            if (chosen is { Count: > 0 })
            {
                if (chosen.Any(id => deliveries.All(d => d.Id != id)))
                {
                    return new FieldErrors().Add("deliveryIds", "Alguna entrega no es de este productor o aún no se recibe.").ToError("cosecha.payment.invalid");
                }

                deliveries = deliveries.Where(d => chosen.Contains(d.Id)).ToList();
            }

            var paid = await db.PaidByDeliveryAsync(deliveries.Select(d => d.Id), token);
            var shipmentDates = await ShipmentDatesAsync(deliveries.Select(d => d.ShipmentId), token);
            var owed = deliveries
                .OrderBy(d => shipmentDates.GetValueOrDefault(d.ShipmentId)).ThenBy(d => d.Id)
                .Select(d => new OwedDelivery(d.Id, d.AmountCrc ?? 0m, paid.GetValueOrDefault(d.Id)))
                .ToList();
            if (owed.All(o => o.OutstandingCrc <= 0))
            {
                return CosechaErrors.PaymentNothingToPay;
            }

            var plan = PaymentAllocator.Allocate(amount!.Value, owed);
            if (plan.UnallocatedCrc > 0)
            {
                return CosechaErrors.PaymentExceedsBalance;
            }

            var payment = stamper.Created(new ProducerPayment
            {
                ProducerId = request.ProducerId!.Value,
                PaidOn = paidOn!.Value,
                AmountCrc = amount.Value,
                Method = method,
                Reference = reference,
                Note = note,
            });
            db.Payments.Add(payment);
            foreach (var line in plan.Lines)
            {
                db.PaymentAllocations.Add(new ProducerPaymentAllocation { PaymentId = payment.Id, DeliveryId = line.DeliveryId, AmountCrc = line.AmountCrc });
            }

            await db.SaveChangesAsync(token);
            return payment.Id;
        }

        var outcome = await TransactionRunner.RunSerializableAsync(db, WorkAsync, ct);
        if (outcome.IsFailure)
        {
            return outcome.Error;
        }

        var dto = (await PaymentsAsync(request.ProducerId!.Value, ct)).First(p => p.Id == outcome.Value);
        await audit.WriteAsync(
            new AuditRecord("cosecha.payment.registered", "cosecha", stamper.UserId, Target: dto.Id.ToString(), After: new { dto.ProducerId, dto.AmountCrc, dto.Method, dto.PaidOn, deliveries = dto.Allocations.Count }), ct);
        return dto;
    }

    /// <summary>Los pagos no se editan: si hubo un error se anulan con motivo y se registra el correcto. Lo anulado deja de contar en los saldos.</summary>
    public async Task<Result<PaymentDto>> VoidAsync(Guid paymentId, VoidPaymentRequest request, CancellationToken ct)
    {
        if (Texts.Clean(request.Reason) is not { } reason || reason.Length > 500)
        {
            return CosechaErrors.ReasonRequired;
        }

        var payment = await db.Payments.FirstOrDefaultAsync(p => p.Id == paymentId, ct);
        if (payment is null)
        {
            return CosechaErrors.NotFound;
        }

        if (payment.VoidedAt is not null)
        {
            return CosechaErrors.PaymentAlreadyVoided;
        }

        db.Expect(payment, request.Version);
        payment.VoidedAt = stamper.Now;
        payment.VoidedBy = stamper.UserId;
        payment.VoidReason = reason;
        stamper.Updated(payment);
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(
            new AuditRecord("cosecha.payment.voided", "cosecha", stamper.UserId, Target: paymentId.ToString(), Before: new { payment.AmountCrc, payment.PaidOn }, After: new { reason }), ct);
        return (await PaymentsAsync(payment.ProducerId, ct)).First(p => p.Id == paymentId);
    }

    private async Task<List<ProducerDelivery>> ReceivedDeliveriesAsync(Guid? producerId, Guid? seasonId, CancellationToken ct)
    {
        var query = db.Deliveries.AsNoTracking().Where(d => d.Status == DeliveryStatus.Received && d.AmountCrc != null);
        if (producerId is { } onlyProducer)
        {
            query = query.Where(d => d.ProducerId == onlyProducer);
        }

        if (seasonId is { } onlySeason)
        {
            var shipmentIds = await db.Shipments.AsNoTracking().Where(s => s.SeasonId == onlySeason).Select(s => s.Id).ToListAsync(ct);
            query = query.Where(d => shipmentIds.Contains(d.ShipmentId));
        }

        return await query.ToListAsync(ct);
    }

    private async Task<Dictionary<Guid, DateOnly>> ShipmentDatesAsync(IEnumerable<Guid> shipmentIds, CancellationToken ct)
    {
        var ids = shipmentIds.Distinct().ToList();
        return await db.Shipments.AsNoTracking().Where(s => ids.Contains(s.Id)).ToDictionaryAsync(s => s.Id, s => s.ShipmentDate, ct);
    }

    private async Task<IReadOnlyList<PaymentDto>> PaymentsAsync(Guid producerId, CancellationToken ct)
    {
        var payments = await db.Payments.AsNoTracking().Where(p => p.ProducerId == producerId).OrderByDescending(p => p.PaidOn).ThenByDescending(p => p.CreatedAt).Take(100).ToListAsync(ct);
        var ids = payments.Select(p => p.Id).ToList();
        var allocations = await db.PaymentAllocations.AsNoTracking().Where(a => ids.Contains(a.PaymentId)).ToListAsync(ct);
        var deliveryIds = allocations.Select(a => a.DeliveryId).Distinct().ToList();
        var deliveryShipment = await db.Deliveries.AsNoTracking().Where(d => deliveryIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.ShipmentId, ct);
        var dates = await ShipmentDatesAsync(deliveryShipment.Values, ct);
        return payments.Select(p => new PaymentDto(
            p.Id,
            p.ProducerId,
            p.PaidOn,
            p.AmountCrc,
            p.Method.ToString(),
            p.Reference,
            p.Note,
            p.VoidedAt is not null,
            p.VoidedAt,
            p.VoidReason,
            allocations.Where(a => a.PaymentId == p.Id)
                .Select(a => new PaymentAllocationDto(a.DeliveryId, deliveryShipment.TryGetValue(a.DeliveryId, out var shipmentId) ? dates.GetValueOrDefault(shipmentId) : default, a.AmountCrc))
                .OrderBy(a => a.ShipmentDate)
                .ToList(),
            p.Version)).ToList();
    }

    private static ProducerBalance BalanceOf(Producer producer, IReadOnlyList<ProducerDelivery> deliveries, Dictionary<Guid, decimal> paid, IReadOnlyList<ProducerPhone> phones)
    {
        var total = deliveries.Sum(d => d.AmountCrc ?? 0m);
        var paidTotal = deliveries.Sum(d => paid.GetValueOrDefault(d.Id));
        var outstanding = deliveries.Where(d => (d.AmountCrc ?? 0m) - paid.GetValueOrDefault(d.Id) > 0).ToList();
        return new ProducerBalance(
            producer.Id,
            producer.Name,
            (phones.FirstOrDefault(ph => ph.IsPrimary) ?? phones.FirstOrDefault())?.Phone,
            total,
            paidTotal,
            total - paidTotal,
            outstanding.Count,
            outstanding.Where(d => d.ExpectedPaymentDate is not null).Select(d => d.ExpectedPaymentDate).Min());
    }
}
