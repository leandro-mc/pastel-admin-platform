using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Pastel.Modules.Agora.Common;
using Pastel.Modules.Agora.Domain;
using Pastel.Modules.Agora.Features.Public;
using Pastel.Modules.Agora.Persistence;
using Pastel.Platform.Auditing;
using Pastel.Platform.Errors;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Agora.Features.Editorial;

internal sealed record DailyPicksRequest(Guid[]? ArticleIds);

/// <summary>
/// «Hoy en 5 minutos» (AG-INI-01): el equipo editorial elige, en orden, hasta 5 piezas <b>publicadas</b>. <c>PUT</c> reemplaza el
/// conjunto completo con la lista ordenada de ids; las piezas que no estén en la lista dejan de estar destacadas.
/// </summary>
internal static class DailyPicksEndpoints
{
    public static void Map(IEndpointRouteBuilder editorial)
    {
        EditorialSupport.Manage(editorial.MapGet("/daily-picks", GetAsync));
        EditorialSupport.Manage(editorial.MapPut("/daily-picks", ReplaceAsync));
    }

    private static async Task<IResult> GetAsync(AgoraDbContext db, IOptions<AgoraOptions> options, CancellationToken cancellationToken) =>
        Results.Json(await CurrentAsync(db, options, cancellationToken));

    private static async Task<List<ArticleCardDto>> CurrentAsync(AgoraDbContext db, IOptions<AgoraOptions> options, CancellationToken cancellationToken)
    {
        var picks = await ArticlesEndpoints.Published(db)
            .Where(a => a.DailyPickOrder != null)
            .OrderBy(a => a.DailyPickOrder)
            .Take(HomeEndpoint.MaxDailyPicks)
            .ToListAsync(cancellationToken);
        return await ArticleProjection.CardsAsync(db, options.Value, picks, cancellationToken);
    }

    private static async Task<IResult> ReplaceAsync(
        DailyPicksRequest request,
        AgoraDbContext db,
        ICurrentUser user,
        IClock clock,
        IAuditTrail audit,
        IOptions<AgoraOptions> options,
        HttpContext http,
        CancellationToken cancellationToken)
    {
        var ids = (request.ArticleIds ?? []).Distinct().ToList();
        if (ids.Count > HomeEndpoint.MaxDailyPicks)
        {
            return PastelProblem.From(AgoraErrors.DailyPickLimit, http);
        }

        var affected = await db.Articles
            .Where(a => a.DailyPickOrder != null || ids.Contains(a.Id))
            .ToListAsync(cancellationToken);
        if (ids.Any(id => affected.All(a => a.Id != id)))
        {
            return PastelProblem.From(AgoraErrors.ArticleNotFound, http);
        }

        if (ids.Any(id => affected.First(a => a.Id == id).Status != ArticleStatus.Published))
        {
            return PastelProblem.From(AgoraErrors.DailyPickNotPublished, http);
        }

        var now = clock.UtcNow;
        foreach (var article in affected)
        {
            var index = ids.IndexOf(article.Id);
            int? order = index < 0 ? null : index + 1;
            if (article.DailyPickOrder != order)
            {
                article.DailyPickOrder = order;
                article.UpdatedAt = now;
            }
        }

        if (await EditorialSupport.TrySaveAsync(db, cancellationToken) is { } conflict)
        {
            return PastelProblem.From(conflict, http);
        }

        await EditorialSupport.AuditAsync(audit, user, "agora.daily_picks.updated", "daily-picks", new { articleIds = ids }, cancellationToken);
        return Results.Json(await CurrentAsync(db, options, cancellationToken));
    }
}
