using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Pastel.Modules.Agora.Common;
using Pastel.Modules.Agora.Domain;
using Pastel.Modules.Agora.Persistence;
using Pastel.Platform.Security;

namespace Pastel.Modules.Agora.Features.Public;

/// <summary>
/// <c>GET /api/agora/home</c>: inicio finito (AG-INI-01). «Hoy en 5 minutos» son las piezas que eligió el equipo editorial (hasta 5);
/// después, las publicaciones más recientes con un tope fijo. Sin ranking algorítmico y sin paginación: el inicio siempre termina.
/// </summary>
internal static class HomeEndpoint
{
    public const int MaxDailyPicks = 5;
    private const int RecentLimit = 12;
    private const int NewsLimit = 5;

    public static void Map(IEndpointRouteBuilder api) =>
        api.MapGet("/home", HandleAsync).AllowAnonymousExplicit().RequireRateLimiting(AgoraRateLimits.Public);

    private static async Task<IResult> HandleAsync(AgoraDbContext db, IOptions<AgoraOptions> options, CancellationToken cancellationToken)
    {
        var picks = await db.Articles.AsNoTracking()
            .Where(a => a.Status == ArticleStatus.Published && a.DailyPickOrder != null)
            .OrderBy(a => a.DailyPickOrder)
            .Take(MaxDailyPicks)
            .ToListAsync(cancellationToken);
        var pickIds = picks.Select(a => a.Id).ToList();
        var recent = await db.Articles.AsNoTracking()
            .Where(a => a.Status == ArticleStatus.Published && !pickIds.Contains(a.Id))
            .OrderByDescending(a => a.PublishedAt)
            .ThenByDescending(a => a.Id)
            .Take(RecentLimit)
            .ToListAsync(cancellationToken);

        var cards = await ArticleProjection.CardsAsync(db, options.Value, [.. picks, .. recent], cancellationToken);
        var news = await db.NewsLinks.AsNoTracking()
            .OrderByDescending(n => n.IsFeatured)
            .ThenByDescending(n => n.PublishedOn)
            .ThenByDescending(n => n.CreatedAt)
            .Take(NewsLimit)
            .ToListAsync(cancellationToken);

        var pickCards = cards.Take(picks.Count).ToList();
        var home = new HomeDto(
            pickCards,
            picks.Sum(a => a.ReadingMinutes),
            cards.Skip(picks.Count).ToList(),
            await ArticleProjection.SeriesAsync(db, cancellationToken),
            await ArticleProjection.CategoriesAsync(db, cancellationToken),
            news.Select(ArticleProjection.ToDto).ToList());
        return Results.Json(home);
    }
}
