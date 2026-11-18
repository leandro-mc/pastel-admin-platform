using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Cosecha.Common;
using Pastel.Modules.Cosecha.Domain;
using Pastel.Modules.Cosecha.Domain.Rules;
using Pastel.Modules.Cosecha.Features.Settlements;
using Pastel.Modules.Cosecha.Features.Shipments;
using Pastel.Modules.Cosecha.Persistence;
using Pastel.Platform.Security;

namespace Pastel.Modules.Cosecha.Features.Today;

internal sealed record TodayShipment(
    Guid Id, DateOnly ShipmentDate, string Status, string SeasonName, decimal TargetKg, decimal RequestedKg, decimal DifferenceKg, int UnconfirmedProducers,
    int PendingReceptions, int PendingDeliveries);

internal sealed record DuePayment(Guid ProducerId, string ProducerName, decimal OutstandingCrc, DateOnly? DueOn);

/// <summary><c>PaymentsDueSoon</c> va vacío para quien no tiene <c>settlements.read</c>: los montos a productores no se muestran sin ese permiso.</summary>
internal sealed record TodayDto(DateOnly Today, IReadOnlyList<TodayShipment> Shipments, IReadOnlyList<DuePayment> PaymentsDueSoon);

/// <summary>Pantalla «Hoy»: lo que requiere atención ahora, en orden de fecha (hasta 20 envíos abiertos y los pagos de los próximos 7 días).</summary>
internal sealed class TodayHandler(CosechaDbContext db, Stamper stamper, ICurrentUser currentUser, ShipmentQueries queries, SettlementsHandler settlements)
{
    private const int PaymentWindowDays = 7;

    public async Task<TodayDto> GetAsync(CancellationToken ct)
    {
        var today = CostaRicaTime.Today(stamper.Now);
        var open = await db.Shipments.AsNoTracking().Where(s => s.Status != ShipmentStatus.Closed).OrderBy(s => s.ShipmentDate).Take(20).ToListAsync(ct);
        var ids = open.Select(s => s.Id).ToList();
        var unconfirmed = await db.Deliveries.AsNoTracking().Where(d => ids.Contains(d.ShipmentId) && d.Status == DeliveryStatus.Requested).Select(d => d.ShipmentId).ToListAsync(ct);
        var shipments = (await queries.SummariesAsync(open, ct))
            .Select(s => new TodayShipment(
                s.Id, s.ShipmentDate, s.Status, s.SeasonName, s.TargetKg, s.RequestedKg, s.RequestedKg - s.TargetKg, unconfirmed.Count(id => id == s.Id), s.PendingReceptions, s.PendingDeliveries))
            .ToList();

        var due = new List<DuePayment>();
        if (await currentUser.HasPermissionAsync(CosechaPermissions.SettlementsRead, ct))
        {
            var limit = today.AddDays(PaymentWindowDays);
            due = (await settlements.BalancesAsync(null, ct))
                .Where(b => b.BalanceCrc > 0 && b.NextExpectedPaymentDate is { } dueOn && dueOn <= limit)
                .OrderBy(b => b.NextExpectedPaymentDate)
                .Select(b => new DuePayment(b.ProducerId, b.ProducerName, b.BalanceCrc, b.NextExpectedPaymentDate))
                .ToList();
        }

        return new TodayDto(today, shipments, due);
    }
}
