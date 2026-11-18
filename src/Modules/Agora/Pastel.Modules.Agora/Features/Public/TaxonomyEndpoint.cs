using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Agora.Common;
using Pastel.Modules.Agora.Domain;
using Pastel.Modules.Agora.Persistence;
using Pastel.Platform.Security;

namespace Pastel.Modules.Agora.Features.Public;

/// <summary><c>GET /api/agora/taxonomy</c>: categorías, series y etiquetas con la cantidad de piezas publicadas (Explorar).</summary>
internal static class TaxonomyEndpoint
{
    private const int TagLimit = 50;

    public static void Map(IEndpointRouteBuilder api) =>
        api.MapGet("/taxonomy", HandleAsync).AllowAnonymousExplicit().RequireRateLimiting(AgoraRateLimits.Public);

    private static async Task<IResult> HandleAsync(AgoraDbContext db, CancellationToken cancellationToken)
    {
        var counts = await (
                from link in db.ArticleTags.AsNoTracking()
                join article in db.Articles.AsNoTracking() on link.ArticleId equals article.Id
                where article.Status == ArticleStatus.Published
                group link by link.TagId into grouped
                select new { TagId = grouped.Key, Count = grouped.Count() })
            .ToListAsync(cancellationToken);
        var countByTag = counts.ToDictionary(x => x.TagId, x => x.Count);
        var tagIds = countByTag.Keys.ToList();
        var tags = await db.Tags.AsNoTracking().Where(t => tagIds.Contains(t.Id)).ToListAsync(cancellationToken);

        var dto = new TaxonomyDto(
            await ArticleProjection.CategoriesAsync(db, cancellationToken),
            await ArticleProjection.SeriesAsync(db, cancellationToken),
            tags.OrderByDescending(t => countByTag[t.Id]).ThenBy(t => t.Name).Take(TagLimit)
                .Select(t => new TagDto(t.Slug, t.Name, countByTag[t.Id])).ToList());
        return Results.Json(dto);
    }
}
