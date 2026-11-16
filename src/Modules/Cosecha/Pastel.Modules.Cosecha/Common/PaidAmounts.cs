using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Cosecha.Persistence;

namespace Pastel.Modules.Cosecha.Common;

internal static class PaidAmounts
{
    /// <summary>Colones ya aplicados a cada entrega por pagos vigentes (los anulados no cuentan).</summary>
    public static async Task<Dictionary<Guid, decimal>> PaidByDeliveryAsync(this CosechaDbContext db, IEnumerable<Guid> deliveryIds, CancellationToken ct)
    {
        var ids = deliveryIds.ToArray();
        if (ids.Length == 0)
        {
            return [];
        }

        var rows = await (
            from allocation in db.PaymentAllocations.AsNoTracking()
            join payment in db.Payments.AsNoTracking() on allocation.PaymentId equals payment.Id
            where payment.VoidedAt == null && ids.Contains(allocation.DeliveryId)
            select new { allocation.DeliveryId, allocation.AmountCrc }).ToListAsync(ct);
        return rows.GroupBy(r => r.DeliveryId).ToDictionary(g => g.Key, g => g.Sum(r => r.AmountCrc));
    }
}
