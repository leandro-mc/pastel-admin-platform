using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Huella.Ai;
using Pastel.Modules.Huella.Cv;
using Pastel.Modules.Huella.Domain;
using Pastel.Modules.Huella.Persistence;
using Pastel.Platform.Auditing;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Huella.Features.Publication;

/// <summary>
/// Publicación del perfil. Publicar congela una copia (<c>PublishedSnapshot</c>) de lo que verá el visitante; lo que se
/// edita después queda como borrador hasta la siguiente publicación. El enlace es una capacidad: se busca por su hash y
/// el valor se guarda además cifrado para que el propietario (solo él) pueda copiarlo cuando lo necesite.
/// </summary>
internal sealed class PublicationHandler(HuellaDbContext db, OwnerProfiles owners, BankLoader loader, AiKeyProtector protector, IAuditTrail audit, ICurrentUser currentUser, IClock clock)
{
    private const int SnapshotsKept = 5;
    private const string TokenLabel = "public-link";

    public async Task<Result<PublicationStatus>> GetStatusAsync(CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        return profile.IsFailure ? profile.Error : await StatusAsync(profile.Value, cancellationToken);
    }

    /// <summary>Lo que vería el visitante si se publicara ahora. Solo lo ve el propietario.</summary>
    public async Task<Result<PublicationPreview>> PreviewAsync(CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var (document, cvJson) = await BuildAsync(profile.Value, cancellationToken);
        return new PublicationPreview(document, Seed(PublicProfileBuilder.Hash(HuellaJson.Serialize(document) + (cvJson ?? string.Empty))), document.HasCv);
    }

    /// <summary>CV público del borrador actual, para la vista previa del propietario (lo que verá el visitante si publica ahora).</summary>
    public async Task<Result<CvDocument>> PreviewCvAsync(CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var (_, cvJson) = await BuildAsync(profile.Value, cancellationToken);
        var cv = HuellaJson.Deserialize<CvDocument>(cvJson);
        return cv is null ? HuellaErrors.PublicCvMissing : cv;
    }

    public async Task<Result<PublicationResult>> PublishAsync(CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var p = profile.Value;
        if (!PublicProfileBuilder.IsPublishable(p))
        {
            return HuellaErrors.NothingToPublish;
        }

        var (document, cvJson) = await BuildAsync(p, cancellationToken);
        var contentJson = HuellaJson.Serialize(document);
        var now = clock.UtcNow;

        string? token = null;
        if (p.PublicTokenHash is null)
        {
            var (value, hash) = PublicLinkToken.Generate();
            token = value;
            p.PublicTokenHash = hash;
            p.PublicTokenCipher = protector.Protect(value, p.Id, TokenLabel);
            p.PublicTokenCreatedAt = now;
        }

        var lastNumber = await db.PublishedSnapshots.Where(s => s.ProfileId == p.Id).MaxAsync(s => (int?)s.Number, cancellationToken) ?? 0;
        var snapshot = new PublishedSnapshot
        {
            Id = Guid.CreateVersion7(),
            ProfileId = p.Id,
            Number = lastNumber + 1,
            ContentJson = contentJson,
            CvContentJson = cvJson,
            ContentHash = PublicProfileBuilder.Hash(contentJson + (cvJson ?? string.Empty)),
            CreatedAt = now,
        };
        db.PublishedSnapshots.Add(snapshot);
        var stale = await db.PublishedSnapshots.Where(s => s.ProfileId == p.Id && s.Number <= lastNumber + 1 - SnapshotsKept).ToListAsync(cancellationToken);
        db.PublishedSnapshots.RemoveRange(stale);

        p.IsPublished = true;
        p.PublishedVersion = snapshot.Number;
        p.PublishedAt = now;
        await db.SaveChangesAsync(cancellationToken);
        await WriteAuditAsync("huella.profile.published", snapshot.Number, cancellationToken);
        return new PublicationResult(await StatusAsync(p, cancellationToken), token);
    }

    public async Task<Result<PublicationStatus>> UnpublishAsync(CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var p = profile.Value;
        if (p.IsPublished)
        {
            p.IsPublished = false;
            await db.SaveChangesAsync(cancellationToken);
            await WriteAuditAsync("huella.profile.unpublished", p.PublishedVersion, cancellationToken);
        }

        return await StatusAsync(p, cancellationToken);
    }

    /// <summary>Crea un enlace nuevo: el anterior deja de funcionar al instante. Sirve también para crear el primero sin publicar.</summary>
    public async Task<Result<PublicationResult>> RegenerateLinkAsync(CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var p = profile.Value;
        var (token, hash) = PublicLinkToken.Generate();
        p.PublicTokenHash = hash;
        p.PublicTokenCipher = protector.Protect(token, p.Id, TokenLabel);
        p.PublicTokenCreatedAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        await WriteAuditAsync("huella.link.regenerated", null, cancellationToken);
        return new PublicationResult(await StatusAsync(p, cancellationToken), token);
    }

    private async Task<PublicationStatus> StatusAsync(Profile p, CancellationToken cancellationToken)
    {
        var publishable = PublicProfileBuilder.IsPublishable(p);
        var changes = false;
        if (p.IsPublished && p.PublishedVersion is { } number)
        {
            var snapshot = await db.PublishedSnapshots.SingleOrDefaultAsync(s => s.ProfileId == p.Id && s.Number == number, cancellationToken);
            if (snapshot is not null)
            {
                var (document, cvJson) = await BuildAsync(p, cancellationToken);
                var current = PublicProfileBuilder.Hash(HuellaJson.Serialize(document) + (cvJson ?? string.Empty));
                changes = !current.AsSpan().SequenceEqual(snapshot.ContentHash);
            }
        }

        return new PublicationStatus(
            p.IsPublished,
            p.PublishedVersion,
            p.PublishedAt,
            p.PublicTokenHash is not null,
            p.PublicTokenCreatedAt,
            changes,
            publishable,
            publishable ? null : "Complete su nombre y su titular antes de publicar.",
            protector.TryUnprotect(p.PublicTokenCipher, p.Id, TokenLabel, out var link) ? link : null);
    }

    /// <summary>Documento público y CV público del borrador actual. El CV pierde cualquier dato de contacto que el perfil no haya activado.</summary>
    private async Task<(PublicProfileDocument Document, string? CvJson)> BuildAsync(Profile p, CancellationToken cancellationToken)
    {
        var records = await loader.LoadAsync(p.Id, cancellationToken);
        var cvVersion = await db.CvVersions.Where(v => v.ProfileId == p.Id && v.IsPublic).SingleOrDefaultAsync(cancellationToken);
        var content = await db.ProfileContents.AsNoTracking().SingleOrDefaultAsync(c => c.ProfileId == p.Id, cancellationToken);
        var document = PublicProfileBuilder.Build(p, records, content, clock.UtcNow.Year, cvVersion is not null);
        string? cvJson = null;
        if (cvVersion is not null && HuellaJson.Deserialize<CvDocument>(cvVersion.ContentJson) is { } cv)
        {
            cv.Header.ContactLine1 = [];
            if (p.ShowLocation && p.Location is not null)
            {
                cv.Header.ContactLine1.Add(p.Location);
            }

            if (p.ShowContactEmail && p.ContactEmail is not null)
            {
                cv.Header.ContactLine1.Add(p.ContactEmail);
            }

            if (p.ShowContactPhone && p.ContactPhone is not null)
            {
                cv.Header.ContactLine1.Add(p.ContactPhone);
            }

            cv.Header.ContactLine2 = records.Links.Where(l => l.IsPublic).Select(l => BankLoader.DisplayUrl(l.Url)).ToList();
            cvJson = HuellaJson.Serialize(cv);
        }

        return (document, cvJson);
    }

    /// <summary>Semilla de la huella generativa: depende solo del contenido público, nunca de datos privados.</summary>
    public static string Seed(byte[] hash) => Convert.ToHexString(hash, 0, 8).ToLowerInvariant();

    private Task WriteAuditAsync(string action, int? version, CancellationToken cancellationToken) =>
        audit.WriteAsync(
            new AuditRecord(action, HuellaPermissions.Code, currentUser.UserId, Target: "huella.profile", After: version is null ? null : new { version }),
            cancellationToken);
}
