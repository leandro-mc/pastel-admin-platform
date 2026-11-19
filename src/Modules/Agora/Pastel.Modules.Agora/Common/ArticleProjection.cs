using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Agora.Domain;
using Pastel.Modules.Agora.Persistence;

namespace Pastel.Modules.Agora.Common;

/// <summary>Arma las tarjetas y el sello de varias piezas con un número fijo de consultas.</summary>
internal static class ArticleProjection
{
    public static SealDto ToDto(Seal seal) => new(
        Wire.Of(seal.State),
        seal.ActiveForCurrentVersion,
        seal.RequiredReviewers,
        seal.Verifiers.Select(v => new SealVerifierDto(v.Name, v.VerifiedAt)).ToList());

    public static async Task<List<ArticleCardDto>> CardsAsync(
        AgoraDbContext db, AgoraOptions options, IReadOnlyList<Article> articles, CancellationToken cancellationToken)
    {
        if (articles.Count == 0)
        {
            return [];
        }

        var ids = articles.Select(a => a.Id).ToList();
        var categoryIds = articles.Select(a => a.CategoryId).Distinct().ToList();
        var seriesIds = articles.Where(a => a.SeriesId != null).Select(a => a.SeriesId!.Value).Distinct().ToList();

        var categories = await db.Categories.AsNoTracking().Where(c => categoryIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, cancellationToken);
        var series = await db.Series.AsNoTracking().Where(s => seriesIds.Contains(s.Id)).ToDictionaryAsync(s => s.Id, cancellationToken);
        var sourceCounts = await db.Sources.AsNoTracking()
            .Where(s => ids.Contains(s.ArticleId))
            .GroupBy(s => s.ArticleId)
            .Select(g => new { ArticleId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ArticleId, x => x.Count, cancellationToken);
        var verifications = (await db.Verifications.AsNoTracking()
                .Where(v => ids.Contains(v.ArticleId) && v.Status == VerificationStatus.Active)
                .ToListAsync(cancellationToken))
            .GroupBy(v => v.ArticleId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var required = options.Verification.EffectiveRequiredReviewers;
        var cards = new List<ArticleCardDto>(articles.Count);
        foreach (var article in articles)
        {
            IEnumerable<VerificationFact> facts = verifications.TryGetValue(article.Id, out var list)
                ? list.Select(ToFact)
                : Enumerable.Empty<VerificationFact>();
            var seal = SealCalculator.Compute(facts, article.SubstantiveVersion, required);
            categories.TryGetValue(article.CategoryId, out var category);
            Series? serie = null;
            if (article.SeriesId is { } seriesId)
            {
                series.TryGetValue(seriesId, out serie);
            }

            cards.Add(new ArticleCardDto(
                article.Id,
                article.Slug,
                article.Title,
                article.Summary,
                Wire.Of(article.ContentType),
                category?.Slug ?? string.Empty,
                category?.Name ?? string.Empty,
                serie?.Slug,
                serie?.Name,
                article.SeriesOrder,
                article.PublishedAt,
                article.AuthorName,
                article.ReadingMinutes,
                sourceCounts.GetValueOrDefault(article.Id),
                ToDto(seal)));
        }

        return cards;
    }

    public static VerificationFact ToFact(Verification v) =>
        new(v.ReviewerUserId, v.ReviewerName, v.VerifiedAt, v.SubstantiveVersion, v.Status == VerificationStatus.Active);

    public static async Task<List<CategoryDto>> CategoriesAsync(AgoraDbContext db, CancellationToken cancellationToken)
    {
        var counts = await db.Articles.AsNoTracking()
            .Where(a => a.Status == ArticleStatus.Published)
            .GroupBy(a => a.CategoryId)
            .Select(g => new { CategoryId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CategoryId, x => x.Count, cancellationToken);
        var categories = await db.Categories.AsNoTracking().OrderBy(c => c.SortOrder).ThenBy(c => c.Name).ToListAsync(cancellationToken);
        return categories.Select(c => new CategoryDto(c.Slug, c.Name, c.Description, counts.GetValueOrDefault(c.Id))).ToList();
    }

    public static async Task<List<SeriesDto>> SeriesAsync(AgoraDbContext db, CancellationToken cancellationToken)
    {
        var counts = await db.Articles.AsNoTracking()
            .Where(a => a.Status == ArticleStatus.Published && a.SeriesId != null)
            .GroupBy(a => a.SeriesId!.Value)
            .Select(g => new { SeriesId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.SeriesId, x => x.Count, cancellationToken);
        var series = await db.Series.AsNoTracking().OrderBy(s => s.SortOrder).ThenBy(s => s.Name).ToListAsync(cancellationToken);
        return series.Select(s => new SeriesDto(s.Slug, s.Name, s.Description, counts.GetValueOrDefault(s.Id))).ToList();
    }

    public static NewsDto ToDto(NewsLink n) =>
        new(n.Id, n.Headline, n.Outlet, n.PublishedOn, n.Url, n.ContextNote, n.Topic, n.IsFeatured);
}
