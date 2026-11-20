using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Huella.Domain;
using Pastel.Modules.Huella.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Huella.Features.Studio;

/// <summary>
/// Seguimiento automático de las ofertas: al enviar un documento (CV o carta) a una oferta guardada, la oferta pasa a
/// «postulada» con la fecha de hoy y un seguimiento a 7 días (si la persona no los había puesto). El historial queda al día
/// sin trabajo extra. No guarda cambios: lo hace quien lo llama.
/// </summary>
internal sealed class OfferTracking(HuellaDbContext db, IClock clock)
{
    public const int DefaultFollowUpDays = 7;

    public async Task MarkAppliedAsync(Guid? offerId, Guid profileId, CancellationToken cancellationToken)
    {
        if (offerId is null)
        {
            return;
        }

        var offer = await db.JobOffers.SingleOrDefaultAsync(o => o.Id == offerId && o.ProfileId == profileId, cancellationToken);
        if (offer is null || offer.Status != OfferStatus.Saved)
        {
            return;
        }

        var now = clock.UtcNow;
        offer.Status = OfferStatus.Applied;
        offer.StatusUpdatedAt = now;
        offer.AppliedAt ??= now;
        offer.FollowUpAt ??= DateOnly.FromDateTime(now.UtcDateTime).AddDays(DefaultFollowUpDays);
        offer.UpdatedAt = now;
    }
}
