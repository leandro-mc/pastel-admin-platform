using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Agora.Common;
using Pastel.Modules.Agora.Domain;
using Pastel.Modules.Agora.Features.Interaction;
using Pastel.Modules.Agora.Persistence;
using Pastel.Platform.Errors;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Agora.Features.Editorial;

internal sealed record NewsInput(string? Headline, string? Outlet, DateOnly? PublishedOn, string? Url, string? ContextNote, string? Topic, bool? IsFeatured);

/// <summary>
/// Noticias enlazadas (<c>agora.content.manage</c>): titular, medio, fecha, enlace y un contexto propio de Ágora. Nunca se copia el
/// texto ajeno. El listado es el público <c>GET /news</c>; aquí solo se crea, edita y quita.
/// </summary>
internal static class NewsEditorialEndpoints
{
    public static void Map(IEndpointRouteBuilder editorial)
    {
        EditorialSupport.Manage(editorial.MapPost("/news", CreateAsync));
        EditorialSupport.Manage(editorial.MapPut("/news/{id:guid}", UpdateAsync));
        EditorialSupport.Manage(editorial.MapDelete("/news/{id:guid}", DeleteAsync));
    }

    private static Error? Validate(NewsInput input, out string headline, out string outlet, out string url, out string context, out string? topic)
    {
        headline = (input.Headline ?? string.Empty).Trim();
        outlet = (input.Outlet ?? string.Empty).Trim();
        url = (input.Url ?? string.Empty).Trim();
        context = (input.ContextNote ?? string.Empty).Trim();
        topic = string.IsNullOrWhiteSpace(input.Topic) ? null : input.Topic.Trim();

        var errors = new FieldErrors();
        if (headline.Length is < 5 or > 200)
        {
            errors.Add("headline", "El titular debe tener entre 5 y 200 caracteres.");
        }

        if (outlet.Length is < 2 or > 100)
        {
            errors.Add("outlet", "Indique el medio (hasta 100 caracteres).");
        }

        if (input.PublishedOn is null)
        {
            errors.Add("publishedOn", "Indique la fecha de publicación de la noticia.");
        }

        if (url.Length > 500 || !MarkdownSanitizer.IsHttpUrl(url))
        {
            errors.Add("url", "Escriba una dirección web válida que empiece con http:// o https://.");
        }

        if (context.Length is < 10 or > 500)
        {
            errors.Add("contextNote", "Escriba el contexto de Ágora con sus propias palabras (10 a 500 caracteres).");
        }

        if (topic is { Length: > 80 })
        {
            errors.Add("topic", "El tema admite hasta 80 caracteres.");
        }

        return errors.Any ? errors.ToError("agora.news.invalid") : null;
    }

    private static async Task<IResult> CreateAsync(NewsInput input, AgoraDbContext db, ICurrentUser user, IClock clock, HttpContext http, CancellationToken cancellationToken)
    {
        if (!InteractionSupport.TryGetUser(user, http, out var userId, out var failure))
        {
            return failure!;
        }

        if (Validate(input, out var headline, out var outlet, out var url, out var context, out var topic) is { } invalid)
        {
            return PastelProblem.From(invalid, http);
        }

        var news = new NewsLink
        {
            Headline = headline,
            Outlet = outlet,
            PublishedOn = input.PublishedOn!.Value,
            Url = url,
            ContextNote = context,
            Topic = topic,
            IsFeatured = input.IsFeatured ?? false,
            CreatedAt = clock.UtcNow,
            CreatedByUserId = userId,
        };
        db.NewsLinks.Add(news);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Json(ArticleProjection.ToDto(news), statusCode: StatusCodes.Status201Created);
    }

    private static async Task<IResult> UpdateAsync(Guid id, NewsInput input, AgoraDbContext db, HttpContext http, CancellationToken cancellationToken)
    {
        var news = await db.NewsLinks.FirstOrDefaultAsync(n => n.Id == id, cancellationToken);
        if (news is null)
        {
            return PastelProblem.From(AgoraErrors.NewsNotFound, http);
        }

        if (Validate(input, out var headline, out var outlet, out var url, out var context, out var topic) is { } invalid)
        {
            return PastelProblem.From(invalid, http);
        }

        news.Headline = headline;
        news.Outlet = outlet;
        news.PublishedOn = input.PublishedOn!.Value;
        news.Url = url;
        news.ContextNote = context;
        news.Topic = topic;
        news.IsFeatured = input.IsFeatured ?? news.IsFeatured;
        await db.SaveChangesAsync(cancellationToken);
        return Results.Json(ArticleProjection.ToDto(news));
    }

    private static async Task<IResult> DeleteAsync(Guid id, AgoraDbContext db, HttpContext http, CancellationToken cancellationToken)
    {
        var deleted = await db.NewsLinks.Where(n => n.Id == id).ExecuteDeleteAsync(cancellationToken);
        return deleted == 0 ? PastelProblem.From(AgoraErrors.NewsNotFound, http) : Results.NoContent();
    }
}
