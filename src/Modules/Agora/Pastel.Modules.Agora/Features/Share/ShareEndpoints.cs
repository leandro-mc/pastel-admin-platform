using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Pastel.Modules.Agora.Common;
using Pastel.Modules.Agora.Features.Public;
using Pastel.Modules.Agora.Persistence;
using Pastel.Platform.Errors;
using Pastel.Platform.Security;

namespace Pastel.Modules.Agora.Features.Share;

/// <summary>
/// <c>GET /api/agora/share/{slug}</c> es el enlace que se comparte (WhatsApp primero): devuelve HTML con la vista previa, donde el
/// sello viaja en la descripción, y lleva a quien lo abre a <c>/agora/p/{slug}</c>. <c>GET .../card.png</c> es la imagen de la
/// tarjeta, detrás de <see cref="IShareCardRenderer"/>. Ambos solo ven piezas publicadas.
/// </summary>
internal static class ShareEndpoints
{
    public static void Map(IEndpointRouteBuilder api)
    {
        api.MapGet("/share/{slug}", PageAsync).AllowAnonymousExplicit().RequireRateLimiting(AgoraRateLimits.Public);
        api.MapGet("/share/{slug}/card.png", CardAsync).AllowAnonymousExplicit().RequireRateLimiting(AgoraRateLimits.Public);
    }

    private static async Task<IResult> PageAsync(
        string slug,
        AgoraDbContext db,
        IOptions<AgoraOptions> options,
        IOptions<PublicBaseUrlOptions> publicBase,
        IShareCardRenderer renderer,
        HttpContext http,
        CancellationToken cancellationToken)
    {
        var article = await ArticlesEndpoints.Published(db).FirstOrDefaultAsync(a => a.Slug == slug, cancellationToken);
        if (article is null)
        {
            return PastelProblem.From(AgoraErrors.ArticleNotFound, http);
        }

        var card = (await ArticleProjection.CardsAsync(db, options.Value, [article], cancellationToken))[0];
        var baseUri = publicBase.Value.BaseUri ?? new Uri($"{http.Request.Scheme}://{http.Request.Host}");
        var escaped = Uri.EscapeDataString(article.Slug);
        var page = new SharePage(
            article.Title,
            $"{ShareHtml.SealText(card.Seal)}. {article.Summary}",
            new Uri(baseUri, $"/agora/p/{escaped}").ToString(),
            renderer.IsAvailable ? new Uri(baseUri, $"/api/agora/share/{escaped}/card.png").ToString() : null,
            article.AuthorName,
            article.PublishedAt,
            article.UpdatedAt);
        return Results.Content(ShareHtml.Render(page), "text/html; charset=utf-8");
    }

    private static async Task<IResult> CardAsync(
        string slug,
        AgoraDbContext db,
        IOptions<AgoraOptions> options,
        IOptions<PublicBaseUrlOptions> publicBase,
        IShareCardRenderer renderer,
        HttpContext http,
        CancellationToken cancellationToken)
    {
        if (!renderer.IsAvailable)
        {
            return PastelProblem.From(AgoraErrors.ShareCardUnavailable, http);
        }

        var article = await ArticlesEndpoints.Published(db).FirstOrDefaultAsync(a => a.Slug == slug, cancellationToken);
        if (article is null)
        {
            return PastelProblem.From(AgoraErrors.ArticleNotFound, http);
        }

        var card = (await ArticleProjection.CardsAsync(db, options.Value, [article], cancellationToken))[0];
        var baseUri = publicBase.Value.BaseUri ?? new Uri($"{http.Request.Scheme}://{http.Request.Host}");
        var model = new ShareCardModel(
            article.Title,
            article.Summary,
            ShareHtml.SealText(card.Seal),
            new Uri(baseUri, $"/agora/p/{Uri.EscapeDataString(article.Slug)}").ToString());
        var result = await renderer.RenderPngAsync(model, cancellationToken);
        return result.IsFailure ? PastelProblem.From(result.Error, http) : Results.File(result.Value, "image/png");
    }
}
