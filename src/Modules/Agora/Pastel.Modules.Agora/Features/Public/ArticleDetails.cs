using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Agora.Common;
using Pastel.Modules.Agora.Domain;
using Pastel.Modules.Agora.Persistence;

namespace Pastel.Modules.Agora.Features.Public;

/// <summary>Detalle de una pieza: lo mismo para el público y para el panel editorial (el editorial agrega su propio estado).</summary>
internal static class ArticleDetails
{
    public static async Task<ArticleDetailDto> BuildAsync(
        AgoraDbContext db, AgoraOptions options, Article article, CancellationToken cancellationToken)
    {
        var card = (await ArticleProjection.CardsAsync(db, options, [article], cancellationToken))[0];

        var tags = await (
                from link in db.ArticleTags.AsNoTracking()
                join tag in db.Tags.AsNoTracking() on link.TagId equals tag.Id
                where link.ArticleId == article.Id
                orderby tag.Name
                select tag.Name)
            .ToListAsync(cancellationToken);
        var sources = await db.Sources.AsNoTracking()
            .Where(s => s.ArticleId == article.Id)
            .OrderBy(s => s.Position)
            .ToListAsync(cancellationToken);
        var video = await db.VideoEmbeds.AsNoTracking().FirstOrDefaultAsync(v => v.ArticleId == article.Id, cancellationToken);
        var corrections = await db.Corrections.AsNoTracking()
            .Where(c => c.ArticleId == article.Id)
            .OrderByDescending(c => c.CorrectedAt)
            .ToListAsync(cancellationToken);
        var verifications = await db.Verifications.AsNoTracking()
            .Where(v => v.ArticleId == article.Id && v.Status == VerificationStatus.Active)
            .OrderByDescending(v => v.VerifiedAt)
            .ToListAsync(cancellationToken);

        return new ArticleDetailDto(
            card,
            article.KnownText,
            article.UnknownText,
            article.WhyItMatters,
            article.Body,
            article.PeriodLabel,
            article.UpdatedAt,
            tags,
            sources.Select(s => new SourceDto(s.Title, s.Author, s.PublishedOn, s.Url, Wire.Of(s.Kind), s.ContextNote)).ToList(),
            video is null ? null : new VideoDto(video.YouTubeId, video.Title, video.Note),
            corrections.Select(c => new CorrectionDto(c.Id, c.CorrectedAt, c.Text)).ToList(),
            verifications
                .Select(v => new VerificationDto(
                    v.Id, v.ReviewerName, v.VerifiedAt, v.Scope, v.Note, v.SubstantiveVersion == article.SubstantiveVersion))
                .ToList());
    }
}
