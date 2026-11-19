using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Agora.Common;
using Pastel.Modules.Agora.Persistence;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Agora.Features.Public;

internal sealed record ListNewsQuery(string? Topic, int? Page, int? PageSize);

/// <summary>
/// <c>GET /api/agora/news</c>: noticias enlazadas (bloque «Actualidad»). Solo metadatos, enlace y contexto propio de Ágora;
/// nunca se copia el texto ajeno (ficha §5). Primero las destacadas y luego las más recientes.
/// </summary>
internal static class NewsEndpoint
{
    public static void Map(IEndpointRouteBuilder api) =>
        api.MapGet("/news", ListAsync).AllowAnonymousExplicit().RequireRateLimiting(AgoraRateLimits.Public);

    private static async Task<IResult> ListAsync([AsParameters] ListNewsQuery query, AgoraDbContext db, CancellationToken cancellationToken)
    {
        var paging = PageRequest.Normalize(query.Page, query.PageSize);
        var news = db.NewsLinks.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(query.Topic))
        {
            var pattern = LikePattern.Contains(query.Topic);
            news = news.Where(n => n.Topic != null && EF.Functions.ILike(n.Topic, pattern, LikePattern.EscapeCharacter));
        }

        var total = await news.CountAsync(cancellationToken);
        var page = await news
            .OrderByDescending(n => n.IsFeatured)
            .ThenByDescending(n => n.PublishedOn)
            .ThenByDescending(n => n.CreatedAt)
            .Skip(paging.Skip)
            .Take(paging.PageSize)
            .ToListAsync(cancellationToken);
        return Results.Json(new PagedResult<NewsDto>(page.Select(n => ArticleProjection.ToDto(n)).ToList(), paging.Page, paging.PageSize, total));
    }
}
