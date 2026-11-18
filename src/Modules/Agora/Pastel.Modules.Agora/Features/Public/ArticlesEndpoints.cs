using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Pastel.Modules.Agora.Common;
using Pastel.Modules.Agora.Domain;
using Pastel.Modules.Agora.Persistence;
using Pastel.Platform.Errors;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Agora.Features.Public;

/// <summary>Filtros de <c>GET /api/agora/articles</c>: categoría, serie y etiqueta por <c>slug</c>; <c>Q</c> busca en el título y en las etiquetas.</summary>
internal sealed record ListArticlesQuery(string? Category, string? Series, string? Tag, string? Q, int? Page, int? PageSize);

/// <summary>
/// Lectura pública de piezas. Solo las <b>publicadas</b>: un borrador o una pieza archivada responde 404 como si no existiera
/// (ficha §7, prueba esencial 2).
/// </summary>
internal static class ArticlesEndpoints
{
    public static void Map(IEndpointRouteBuilder api)
    {
        api.MapGet("/articles", ListAsync).AllowAnonymousExplicit().RequireRateLimiting(AgoraRateLimits.Public);
        api.MapGet("/articles/{slug}", GetAsync).AllowAnonymousExplicit().RequireRateLimiting(AgoraRateLimits.Public);
    }

    /// <summary>Piezas visibles al público. Toda consulta pública parte de aquí.</summary>
    public static IQueryable<Article> Published(AgoraDbContext db) =>
        db.Articles.AsNoTracking().Where(a => a.Status == ArticleStatus.Published);

    private static async Task<IResult> ListAsync(
        [AsParameters] ListArticlesQuery query, AgoraDbContext db, IOptions<AgoraOptions> options, CancellationToken cancellationToken)
    {
        var paging = PageRequest.Normalize(query.Page, query.PageSize);
        var articles = Published(db);

        if (!string.IsNullOrWhiteSpace(query.Category))
        {
            var slug = query.Category.Trim();
            articles = articles.Where(a => db.Categories.Any(c => c.Id == a.CategoryId && c.Slug == slug));
        }

        var bySeries = !string.IsNullOrWhiteSpace(query.Series);
        if (bySeries)
        {
            var slug = query.Series!.Trim();
            articles = articles.Where(a => db.Series.Any(s => s.Id == a.SeriesId && s.Slug == slug));
        }

        if (!string.IsNullOrWhiteSpace(query.Tag))
        {
            var slug = query.Tag.Trim();
            articles = articles.Where(a => db.ArticleTags.Any(l => l.ArticleId == a.Id && db.Tags.Any(t => t.Id == l.TagId && t.Slug == slug)));
        }

        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var pattern = LikePattern.Contains(query.Q);
            articles = articles.Where(a =>
                EF.Functions.ILike(a.Title, pattern, LikePattern.EscapeCharacter)
                || db.ArticleTags.Any(l => l.ArticleId == a.Id
                    && db.Tags.Any(t => t.Id == l.TagId && EF.Functions.ILike(t.Name, pattern, LikePattern.EscapeCharacter))));
        }

        var total = await articles.CountAsync(cancellationToken);
        var ordered = bySeries
            ? articles.OrderBy(a => a.SeriesOrder).ThenBy(a => a.PublishedAt).ThenBy(a => a.Id)
            : articles.OrderByDescending(a => a.PublishedAt).ThenByDescending(a => a.Id);
        var page = await ordered.Skip(paging.Skip).Take(paging.PageSize).ToListAsync(cancellationToken);
        var cards = await ArticleProjection.CardsAsync(db, options.Value, page, cancellationToken);
        return Results.Json(new PagedResult<ArticleCardDto>(cards, paging.Page, paging.PageSize, total));
    }

    private static async Task<IResult> GetAsync(
        string slug, AgoraDbContext db, IOptions<AgoraOptions> options, HttpContext http, CancellationToken cancellationToken)
    {
        var article = await Published(db).FirstOrDefaultAsync(a => a.Slug == slug, cancellationToken);
        if (article is null)
        {
            return PastelProblem.From(AgoraErrors.ArticleNotFound, http);
        }

        return Results.Json(await ArticleDetails.BuildAsync(db, options.Value, article, cancellationToken));
    }
}
