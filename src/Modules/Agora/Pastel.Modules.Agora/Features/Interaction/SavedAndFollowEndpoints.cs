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

namespace Pastel.Modules.Agora.Features.Interaction;

internal sealed record PageQuery(int? Page, int? PageSize);

/// <summary>Categorías que la persona sigue: alimentan «Para usted» en el inicio. Sin ranking oculto: solo sus elecciones.</summary>
internal sealed record FollowedDto(IReadOnlyList<string> CategorySlugs);

/// <summary>Estado de una pieza para la persona que la lee: si la guardó, cómo reaccionó y si sigue su categoría.</summary>
internal sealed record ViewerDto(bool Saved, IReadOnlyList<string> Reactions, bool FollowingCategory);

/// <summary>
/// Guardados y categorías seguidas (AG-CON-02). Piden sesión y el permiso <c>agora.saved.manage</c>; los datos son siempre de la
/// persona autenticada (nunca se recibe un id de persona), y las operaciones son idempotentes.
/// </summary>
internal static class SavedAndFollowEndpoints
{
    public static void Map(IEndpointRouteBuilder api)
    {
        Protect(api.MapGet("/me/saved", ListSavedAsync));
        Protect(api.MapGet("/me/followed", ListFollowedAsync));
        Protect(api.MapGet("/articles/{slug}/viewer", ViewerAsync));
        Protect(api.MapPut("/articles/{slug}/saved", SaveAsync));
        Protect(api.MapDelete("/articles/{slug}/saved", UnsaveAsync));
        Protect(api.MapPut("/categories/{slug}/follow", FollowAsync));
        Protect(api.MapDelete("/categories/{slug}/follow", UnfollowAsync));
    }

    private static void Protect(RouteHandlerBuilder builder) =>
        builder.RequirePermission(AgoraPermissions.SavedManage).RequireRateLimiting(AgoraRateLimits.Interaction);

    private static async Task<IResult> ListSavedAsync(
        [AsParameters] PageQuery query, AgoraDbContext db, ICurrentUser user, IOptions<AgoraOptions> options, HttpContext http, CancellationToken cancellationToken)
    {
        if (!InteractionSupport.TryGetUser(user, http, out var userId, out var failure))
        {
            return failure!;
        }

        var paging = PageRequest.Normalize(query.Page, query.PageSize);
        var saved =
            from s in db.SavedArticles.AsNoTracking()
            join a in db.Articles.AsNoTracking() on s.ArticleId equals a.Id
            where s.UserId == userId && a.Status == ArticleStatus.Published
            orderby s.SavedAt descending
            select a;
        var total = await saved.CountAsync(cancellationToken);
        var page = await saved.Skip(paging.Skip).Take(paging.PageSize).ToListAsync(cancellationToken);
        var cards = await ArticleProjection.CardsAsync(db, options.Value, page, cancellationToken);
        return Results.Json(new PagedResult<ArticleCardDto>(cards, paging.Page, paging.PageSize, total));
    }

    private static async Task<IResult> ListFollowedAsync(AgoraDbContext db, ICurrentUser user, HttpContext http, CancellationToken cancellationToken)
    {
        if (!InteractionSupport.TryGetUser(user, http, out var userId, out var failure))
        {
            return failure!;
        }

        var slugs = await (
                from f in db.FollowedCategories.AsNoTracking()
                join c in db.Categories.AsNoTracking() on f.CategoryId equals c.Id
                where f.UserId == userId
                orderby c.SortOrder, c.Name
                select c.Slug)
            .ToListAsync(cancellationToken);
        return Results.Json(new FollowedDto(slugs));
    }

    private static async Task<IResult> ViewerAsync(
        string slug, AgoraDbContext db, ICurrentUser user, HttpContext http, CancellationToken cancellationToken)
    {
        if (!InteractionSupport.TryGetUser(user, http, out var userId, out var failure))
        {
            return failure!;
        }

        var found = await InteractionSupport.FindPublishedAsync(db, slug, cancellationToken);
        if (found is not { } ids)
        {
            return PastelProblem.From(AgoraErrors.ArticleNotFound, http);
        }

        var saved = await db.SavedArticles.AnyAsync(s => s.UserId == userId && s.ArticleId == ids.ArticleId, cancellationToken);
        var reactions = await db.Reactions.AsNoTracking()
            .Where(r => r.UserId == userId && r.ArticleId == ids.ArticleId)
            .Select(r => r.Kind)
            .ToListAsync(cancellationToken);
        var following = await db.FollowedCategories.AnyAsync(f => f.UserId == userId && f.CategoryId == ids.CategoryId, cancellationToken);
        return Results.Json(new ViewerDto(saved, reactions.Select(r => Wire.Of(r)).ToList(), following));
    }

    private static async Task<IResult> SaveAsync(
        string slug, AgoraDbContext db, ICurrentUser user, IClock clock, HttpContext http, CancellationToken cancellationToken)
    {
        if (!InteractionSupport.TryGetUser(user, http, out var userId, out var failure))
        {
            return failure!;
        }

        if (await InteractionSupport.FindPublishedAsync(db, slug, cancellationToken) is not { } ids)
        {
            return PastelProblem.From(AgoraErrors.ArticleNotFound, http);
        }

        if (!await db.SavedArticles.AnyAsync(s => s.UserId == userId && s.ArticleId == ids.ArticleId, cancellationToken))
        {
            db.SavedArticles.Add(new SavedArticle { UserId = userId, ArticleId = ids.ArticleId, SavedAt = clock.UtcNow });
            await InteractionSupport.SaveIgnoringDuplicateAsync(db, cancellationToken);
        }

        return Results.NoContent();
    }

    private static async Task<IResult> UnsaveAsync(
        string slug, AgoraDbContext db, ICurrentUser user, HttpContext http, CancellationToken cancellationToken)
    {
        if (!InteractionSupport.TryGetUser(user, http, out var userId, out var failure))
        {
            return failure!;
        }

        // Se puede quitar de guardados aunque la pieza ya no sea pública.
        var articleId = await db.Articles.AsNoTracking().Where(a => a.Slug == slug).Select(a => (Guid?)a.Id).FirstOrDefaultAsync(cancellationToken);
        if (articleId is { } id)
        {
            await db.SavedArticles.Where(s => s.UserId == userId && s.ArticleId == id).ExecuteDeleteAsync(cancellationToken);
        }

        return Results.NoContent();
    }

    private static async Task<IResult> FollowAsync(
        string slug, AgoraDbContext db, ICurrentUser user, IClock clock, HttpContext http, CancellationToken cancellationToken)
    {
        if (!InteractionSupport.TryGetUser(user, http, out var userId, out var failure))
        {
            return failure!;
        }

        var categoryId = await db.Categories.AsNoTracking().Where(c => c.Slug == slug).Select(c => (Guid?)c.Id).FirstOrDefaultAsync(cancellationToken);
        if (categoryId is not { } id)
        {
            return PastelProblem.From(AgoraErrors.CategoryNotFound, http);
        }

        if (!await db.FollowedCategories.AnyAsync(f => f.UserId == userId && f.CategoryId == id, cancellationToken))
        {
            db.FollowedCategories.Add(new FollowedCategory { UserId = userId, CategoryId = id, FollowedAt = clock.UtcNow });
            await InteractionSupport.SaveIgnoringDuplicateAsync(db, cancellationToken);
        }

        return Results.NoContent();
    }

    private static async Task<IResult> UnfollowAsync(
        string slug, AgoraDbContext db, ICurrentUser user, HttpContext http, CancellationToken cancellationToken)
    {
        if (!InteractionSupport.TryGetUser(user, http, out var userId, out var failure))
        {
            return failure!;
        }

        var categoryId = await db.Categories.AsNoTracking().Where(c => c.Slug == slug).Select(c => (Guid?)c.Id).FirstOrDefaultAsync(cancellationToken);
        if (categoryId is { } id)
        {
            await db.FollowedCategories.Where(f => f.UserId == userId && f.CategoryId == id).ExecuteDeleteAsync(cancellationToken);
        }

        return Results.NoContent();
    }
}
