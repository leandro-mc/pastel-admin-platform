using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Huella.Cv;
using Pastel.Modules.Huella.Domain;
using Pastel.Modules.Huella.Features.Publication;
using Pastel.Modules.Huella.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Huella.Features.PublicProfile;

/// <summary>
/// Lectura pública. El visitante presenta el token en una cabecera (nunca en la ruta, para que no llegue a los registros);
/// se compara su hash. Cualquier fallo (token mal formado, desconocido, regenerado o perfil sin publicar) responde igual: 404.
/// Solo se sirve la copia congelada al publicar, jamás el borrador.
/// </summary>
internal sealed class PublicProfileHandler(HuellaDbContext db)
{
    public async Task<Result<PublicProfileView>> GetProfileAsync(string? token, CancellationToken cancellationToken)
    {
        var snapshot = await FindSnapshotAsync(token, cancellationToken);
        var document = snapshot is null ? null : HuellaJson.Deserialize<PublicProfileDocument>(snapshot.ContentJson);
        // Una publicación anterior al perfil bilingüe no trae las dos versiones: se vuelve a publicar para recuperarla.
        if (snapshot is null || document?.Es is null || document.En is null)
        {
            return HuellaErrors.PublicProfileUnavailable;
        }

        return new PublicProfileView(document, PublicationHandler.Seed(snapshot.ContentHash), snapshot.Number, snapshot.CreatedAt);
    }

    public async Task<Result<CvDocument>> GetCvAsync(string? token, CancellationToken cancellationToken)
    {
        var snapshot = await FindSnapshotAsync(token, cancellationToken);
        if (snapshot is null)
        {
            return HuellaErrors.PublicProfileUnavailable;
        }

        var cv = CvDocument.FromJson(snapshot.CvContentJson);
        return cv is null ? HuellaErrors.PublicCvMissing : cv;
    }

    private async Task<PublishedSnapshot?> FindSnapshotAsync(string? token, CancellationToken cancellationToken)
    {
        if (!PublicLinkToken.TryHash(token, out var hash))
        {
            return null;
        }

        var profile = await db.Profiles.AsNoTracking()
            .Where(p => p.PublicTokenHash == hash && p.IsPublished && p.PublishedVersion != null)
            .Select(p => new { p.Id, Number = p.PublishedVersion!.Value })
            .SingleOrDefaultAsync(cancellationToken);
        return profile is null
            ? null
            : await db.PublishedSnapshots.AsNoTracking().SingleOrDefaultAsync(s => s.ProfileId == profile.Id && s.Number == profile.Number, cancellationToken);
    }
}
