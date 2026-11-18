namespace Pastel.Modules.Cosecha.Domain.Rules;

/// <summary>Entrega con su monto y lo ya aplicado por pagos vigentes (no anulados).</summary>
internal sealed record OwedDelivery(Guid DeliveryId, decimal AmountCrc, decimal PaidCrc)
{
    public decimal OutstandingCrc => Math.Max(AmountCrc - PaidCrc, 0m);
}

internal sealed record PaymentAllocationLine(Guid DeliveryId, decimal AmountCrc);

/// <summary><see cref="UnallocatedCrc"/> es lo que sobra cuando el pago supera lo adeudado (el módulo lo rechaza: no hay pagos adelantados en el MVP).</summary>
internal sealed record PaymentAllocationPlan(IReadOnlyList<PaymentAllocationLine> Lines, decimal UnallocatedCrc);

/// <summary>Aplica un pago a las entregas en el orden recibido (la más antigua primero) y deriva el estado de pago de cada entrega.</summary>
internal static class PaymentAllocator
{
    public static PaymentAllocationPlan Allocate(decimal paymentCrc, IEnumerable<OwedDelivery> inPayOrder)
    {
        var remaining = paymentCrc;
        var lines = new List<PaymentAllocationLine>();
        foreach (var delivery in inPayOrder)
        {
            if (remaining <= 0)
            {
                break;
            }

            var applied = Math.Min(remaining, delivery.OutstandingCrc);
            if (applied > 0)
            {
                lines.Add(new PaymentAllocationLine(delivery.DeliveryId, applied));
                remaining -= applied;
            }
        }

        return new PaymentAllocationPlan(lines, remaining);
    }

    public static SettlementStatus StatusOf(decimal amountCrc, decimal paidCrc) =>
        paidCrc <= 0 ? SettlementStatus.Pending : paidCrc >= amountCrc ? SettlementStatus.Paid : SettlementStatus.Partial;
}
