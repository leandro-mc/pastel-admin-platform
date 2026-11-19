using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Pastel.Modules.Agora.Common;
using Pastel.Modules.Agora.Domain;
using Pastel.Modules.Agora.Features.Public;
using Pastel.Modules.Agora.Persistence;
using Pastel.Platform.Auditing;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Agora.Features.Editorial;

/// <summary>Pasos comunes del panel editorial.</summary>
internal static class EditorialSupport
{
    public const string UnknownAuthorName = "Equipo editorial";

    public static TBuilder Manage<TBuilder>(TBuilder builder)
        where TBuilder : IEndpointConventionBuilder =>
        builder.RequirePermission(AgoraPermissions.ContentManage);

    public static async Task<EditorialArticleDto> ToDtoAsync(
        AgoraDbContext db, IOptions<AgoraOptions> options, Article article, CancellationToken cancellationToken) =>
        new(
            await ArticleDetails.BuildAsync(db, options.Value, article, cancellationToken),
            Wire.Of(article.Status),
            article.Version,
            article.CategoryId,
            article.SeriesId,
            article.DailyPickOrder,
            article.SubstantiveVersion);

    public static Task AuditAsync(IAuditTrail audit, ICurrentUser user, string action, string target, object? after, CancellationToken cancellationToken) =>
        audit.WriteAsync(new AuditRecord(action, AgoraPermissions.Code, user.UserId, null, target, After: after), cancellationToken);

    /// <summary>Guarda y traduce un choque de concurrencia a un error comprensible.</summary>
    public static async Task<Error?> TrySaveAsync(AgoraDbContext db, CancellationToken cancellationToken)
    {
        try
        {
            await db.SaveChangesAsync(cancellationToken);
            return null;
        }
        catch (DbUpdateConcurrencyException)
        {
            return AgoraErrors.ArticleConcurrency;
        }
    }

    /// <summary>Slug único y estable a partir del titular (<c>titular</c>, <c>titular-2</c>…). No cambia si luego se edita el titular.</summary>
    public static async Task<string> UniqueSlugAsync(AgoraDbContext db, string title, CancellationToken cancellationToken)
    {
        var baseSlug = Slugs.From(title, 100);
        var candidate = baseSlug;
        for (var attempt = 2; await db.Articles.AnyAsync(a => a.Slug == candidate, cancellationToken); attempt++)
        {
            candidate = $"{baseSlug}-{attempt}";
        }

        return candidate;
    }

    public static void ApplyContent(Article article, ValidArticle valid)
    {
        article.Title = valid.Title;
        article.Summary = valid.Summary;
        article.ContentType = valid.ContentType;
        article.KnownText = valid.KnownText;
        article.UnknownText = valid.UnknownText;
        article.WhyItMatters = valid.WhyItMatters;
        article.Body = valid.Body;
        article.CategoryId = valid.CategoryId;
        article.SeriesId = valid.SeriesId;
        article.SeriesOrder = valid.SeriesOrder;
        article.PeriodLabel = valid.PeriodLabel;
        article.ReadingMinutes = ReadingTime.Minutes(valid.Summary, valid.KnownText, valid.UnknownText, valid.WhyItMatters, valid.Body);
    }

    /// <summary>Reemplaza fuentes, etiquetas y video de la pieza. Las etiquetas se comparan por diferencia para no repetir claves.</summary>
    public static async Task ReplaceRelatedAsync(AgoraDbContext db, Guid articleId, ValidArticle valid, CancellationToken cancellationToken)
    {
        var oldSources = await db.Sources.Where(s => s.ArticleId == articleId).ToListAsync(cancellationToken);
        db.Sources.RemoveRange(oldSources);
        for (var position = 0; position < valid.Sources.Count; position++)
        {
            var source = valid.Sources[position];
            db.Sources.Add(new Source
            {
                ArticleId = articleId,
                Position = position,
                Title = source.Title,
                Author = source.Author,
                PublishedOn = source.PublishedOn,
                Url = source.Url,
                Kind = source.Kind,
                ContextNote = source.ContextNote,
            });
        }

        var wantedSlugs = valid.Tags.Select(t => t.Slug).ToList();
        var existingTags = await db.Tags.Where(t => wantedSlugs.Contains(t.Slug)).ToListAsync(cancellationToken);
        var currentLinks = await db.ArticleTags.Where(l => l.ArticleId == articleId).ToListAsync(cancellationToken);
        var keptTagIds = new HashSet<Guid>();
        foreach (var wanted in valid.Tags)
        {
            var tag = existingTags.FirstOrDefault(t => t.Slug == wanted.Slug);
            if (tag is null)
            {
                tag = new Tag { Slug = wanted.Slug, Name = wanted.Name };
                db.Tags.Add(tag);
            }

            keptTagIds.Add(tag.Id);
            if (currentLinks.All(l => l.TagId != tag.Id))
            {
                db.ArticleTags.Add(new ArticleTag { ArticleId = articleId, TagId = tag.Id });
            }
        }

        db.ArticleTags.RemoveRange(currentLinks.Where(l => !keptTagIds.Contains(l.TagId)));

        var video = await db.VideoEmbeds.FirstOrDefaultAsync(v => v.ArticleId == articleId, cancellationToken);
        if (valid.Video is null)
        {
            if (video is not null)
            {
                db.VideoEmbeds.Remove(video);
            }
        }
        else if (video is null)
        {
            db.VideoEmbeds.Add(new VideoEmbed { ArticleId = articleId, YouTubeId = valid.Video.YouTubeId, Title = valid.Video.Title, Note = valid.Video.Note });
        }
        else
        {
            video.YouTubeId = valid.Video.YouTubeId;
            video.Title = valid.Video.Title;
            video.Note = valid.Video.Note;
        }
    }
}
