using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Pastel.Modules.Agora.Common;
using Pastel.Modules.Agora.Domain;
using Pastel.Modules.Agora.Features.Interaction;
using Pastel.Modules.Agora.Persistence;
using Pastel.Platform.Auditing;
using Pastel.Platform.Errors;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Agora.Features.Editorial;

internal sealed record EditorialListQuery(string? Status, string? Q, int? Page, int? PageSize);

internal sealed record CorrectionRequest(string? Text);

/// <summary>
/// Piezas del panel editorial (<c>agora.content.manage</c>): crear, editar, publicar, despublicar, archivar y corregir. Publicar exige
/// al menos 2 fuentes, tipo y resumen (AG-EDI-01). Si el contenido sustantivo cambia, la versión sube y el sello lo refleja; quien
/// edita contenido sustantivo queda como colaborador y por eso no puede verificar la pieza.
/// </summary>
internal static class ArticleEditorialEndpoints
{
    public const int MinSourcesToPublish = 2;
    public const int MinCorrectionLength = 10;
    public const int MaxCorrectionLength = 600;

    public static void Map(IEndpointRouteBuilder editorial)
    {
        EditorialSupport.Manage(editorial.MapGet("/articles", ListAsync));
        EditorialSupport.Manage(editorial.MapGet("/articles/{id:guid}", GetAsync));
        EditorialSupport.Manage(editorial.MapPost("/articles", CreateAsync));
        EditorialSupport.Manage(editorial.MapPut("/articles/{id:guid}", UpdateAsync));
        EditorialSupport.Manage(editorial.MapPost("/articles/{id:guid}/publish", PublishAsync));
        EditorialSupport.Manage(editorial.MapPost("/articles/{id:guid}/unpublish", UnpublishAsync));
        EditorialSupport.Manage(editorial.MapPost("/articles/{id:guid}/archive", ArchiveAsync));
        EditorialSupport.Manage(editorial.MapPost("/articles/{id:guid}/corrections", AddCorrectionAsync));
    }

    private static async Task<IResult> ListAsync(
        [AsParameters] EditorialListQuery query, AgoraDbContext db, IOptions<AgoraOptions> options, CancellationToken cancellationToken)
    {
        var paging = PageRequest.Normalize(query.Page, query.PageSize);
        var articles = db.Articles.AsNoTracking();
        if (Wire.TryParse<ArticleStatus>(query.Status, out var status))
        {
            articles = articles.Where(a => a.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var pattern = LikePattern.Contains(query.Q);
            articles = articles.Where(a => EF.Functions.ILike(a.Title, pattern, LikePattern.EscapeCharacter));
        }

        var total = await articles.CountAsync(cancellationToken);
        var page = await articles.OrderByDescending(a => a.UpdatedAt).ThenByDescending(a => a.Id)
            .Skip(paging.Skip).Take(paging.PageSize).ToListAsync(cancellationToken);
        var cards = await ArticleProjection.CardsAsync(db, options.Value, page, cancellationToken);

        var ids = page.Select(a => a.Id).ToList();
        var openReports = await db.ErrorReports.AsNoTracking()
            .Where(r => ids.Contains(r.ArticleId) && r.Status == ErrorReportStatus.Received)
            .GroupBy(r => r.ArticleId)
            .Select(g => new { ArticleId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ArticleId, x => x.Count, cancellationToken);

        var items = new List<EditorialListItemDto>(page.Count);
        for (var i = 0; i < page.Count; i++)
        {
            var article = page[i];
            items.Add(new EditorialListItemDto(
                cards[i], Wire.Of(article.Status), article.UpdatedAt, article.DailyPickOrder, openReports.GetValueOrDefault(article.Id)));
        }

        return Results.Json(new PagedResult<EditorialListItemDto>(items, paging.Page, paging.PageSize, total));
    }

    private static async Task<IResult> GetAsync(
        Guid id, AgoraDbContext db, IOptions<AgoraOptions> options, HttpContext http, CancellationToken cancellationToken)
    {
        var article = await db.Articles.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        return article is null
            ? PastelProblem.From(AgoraErrors.ArticleNotFound, http)
            : Results.Json(await EditorialSupport.ToDtoAsync(db, options, article, cancellationToken));
    }

    private static async Task<IResult> CreateAsync(
        ArticleInput input,
        AgoraDbContext db,
        ICurrentUser user,
        IClock clock,
        IOptions<AgoraOptions> options,
        HttpContext http,
        CancellationToken cancellationToken)
    {
        if (!InteractionSupport.TryGetUser(user, http, out var userId, out var failure))
        {
            return failure!;
        }

        var validation = await ArticleInputValidator.ValidateAsync(db, input, cancellationToken);
        if (validation.IsFailure)
        {
            return PastelProblem.From(validation.Error, http);
        }

        var valid = validation.Value;
        var now = clock.UtcNow;
        var article = new Article
        {
            Slug = await EditorialSupport.UniqueSlugAsync(db, valid.Title, cancellationToken),
            Title = valid.Title,
            Summary = valid.Summary,
            AuthorUserId = userId,
            AuthorName = user.DisplayName ?? EditorialSupport.UnknownAuthorName,
            CreatedAt = now,
            UpdatedAt = now,
        };
        EditorialSupport.ApplyContent(article, valid);
        db.Articles.Add(article);
        db.ArticleContributors.Add(new ArticleContributor { ArticleId = article.Id, UserId = userId });
        await EditorialSupport.ReplaceRelatedAsync(db, article.Id, valid, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Json(await EditorialSupport.ToDtoAsync(db, options, article, cancellationToken), statusCode: StatusCodes.Status201Created);
    }

    private static async Task<IResult> UpdateAsync(
        Guid id,
        ArticleInput input,
        AgoraDbContext db,
        ICurrentUser user,
        IClock clock,
        IOptions<AgoraOptions> options,
        HttpContext http,
        CancellationToken cancellationToken)
    {
        if (!InteractionSupport.TryGetUser(user, http, out var userId, out var failure))
        {
            return failure!;
        }

        var article = await db.Articles.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (article is null)
        {
            return PastelProblem.From(AgoraErrors.ArticleNotFound, http);
        }

        if (article.Status == ArticleStatus.Archived)
        {
            return PastelProblem.From(AgoraErrors.ArticleInvalidState, http);
        }

        if (input.Version is not { } version)
        {
            var errors = new FieldErrors().Add("version", "Falta la versión de la pieza. Recargue la página e intente de nuevo.");
            return PastelProblem.From(errors.ToError("agora.article.invalid"), http);
        }

        var validation = await ArticleInputValidator.ValidateAsync(db, input, cancellationToken);
        if (validation.IsFailure)
        {
            return PastelProblem.From(validation.Error, http);
        }

        var valid = validation.Value;
        var oldSources = await db.Sources.AsNoTracking()
            .Where(s => s.ArticleId == id).OrderBy(s => s.Position).ToListAsync(cancellationToken);
        var before = new SubstantiveContent(
            article.Title, article.Summary, article.ContentType, article.KnownText, article.UnknownText, article.WhyItMatters, article.Body,
            oldSources.Select(s => new SourceContent(s.Title, s.Url, s.Kind, s.Author, s.PublishedOn, s.ContextNote)).ToList());
        var substantive = before.Fingerprint() != valid.Substantive().Fingerprint();

        EditorialSupport.ApplyContent(article, valid);
        article.UpdatedAt = clock.UtcNow;
        if (substantive)
        {
            article.SubstantiveVersion++;
            if (!await db.ArticleContributors.AnyAsync(c => c.ArticleId == id && c.UserId == userId, cancellationToken))
            {
                db.ArticleContributors.Add(new ArticleContributor { ArticleId = id, UserId = userId });
            }
        }

        await EditorialSupport.ReplaceRelatedAsync(db, id, valid, cancellationToken);
        db.Entry(article).Property(a => a.Version).OriginalValue = (version is >= 0 and <= uint.MaxValue) ? (uint)version : uint.MaxValue;
        if (await EditorialSupport.TrySaveAsync(db, cancellationToken) is { } conflict)
        {
            return PastelProblem.From(conflict, http);
        }

        return Results.Json(await EditorialSupport.ToDtoAsync(db, options, article, cancellationToken));
    }

    private static async Task<IResult> PublishAsync(
        Guid id, AgoraDbContext db, ICurrentUser user, IClock clock, IAuditTrail audit, IOptions<AgoraOptions> options, HttpContext http, CancellationToken cancellationToken)
    {
        var article = await db.Articles.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (article is null)
        {
            return PastelProblem.From(AgoraErrors.ArticleNotFound, http);
        }

        if (article.Status != ArticleStatus.Published)
        {
            var sourceCount = await db.Sources.CountAsync(s => s.ArticleId == id, cancellationToken);
            var errors = new FieldErrors();
            if (sourceCount < MinSourcesToPublish)
            {
                errors.Add("sources", $"Agregue al menos {MinSourcesToPublish} fuentes para publicar.");
            }

            if (string.IsNullOrWhiteSpace(article.Body))
            {
                errors.Add("body", "Escriba el cuerpo de la pieza para publicar.");
            }

            if (errors.Any)
            {
                return PastelProblem.From(errors.ToError("agora.article.not_ready", "La pieza todavía no está lista para publicar."), http);
            }

            var now = clock.UtcNow;
            article.Status = ArticleStatus.Published;
            article.PublishedAt ??= now;
            article.UpdatedAt = now;
            if (await EditorialSupport.TrySaveAsync(db, cancellationToken) is { } conflict)
            {
                return PastelProblem.From(conflict, http);
            }

            await EditorialSupport.AuditAsync(audit, user, "agora.article.published", article.Slug, new { article.Title }, cancellationToken);
        }

        return Results.Json(await EditorialSupport.ToDtoAsync(db, options, article, cancellationToken));
    }

    private static async Task<IResult> UnpublishAsync(
        Guid id, AgoraDbContext db, ICurrentUser user, IClock clock, IAuditTrail audit, IOptions<AgoraOptions> options, HttpContext http, CancellationToken cancellationToken)
    {
        var article = await db.Articles.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (article is null)
        {
            return PastelProblem.From(AgoraErrors.ArticleNotFound, http);
        }

        if (article.Status != ArticleStatus.Draft)
        {
            article.Status = ArticleStatus.Draft;
            article.DailyPickOrder = null;
            article.UpdatedAt = clock.UtcNow;
            if (await EditorialSupport.TrySaveAsync(db, cancellationToken) is { } conflict)
            {
                return PastelProblem.From(conflict, http);
            }

            await EditorialSupport.AuditAsync(audit, user, "agora.article.unpublished", article.Slug, new { article.Title }, cancellationToken);
        }

        return Results.Json(await EditorialSupport.ToDtoAsync(db, options, article, cancellationToken));
    }

    private static async Task<IResult> ArchiveAsync(
        Guid id, AgoraDbContext db, ICurrentUser user, IClock clock, IAuditTrail audit, IOptions<AgoraOptions> options, HttpContext http, CancellationToken cancellationToken)
    {
        var article = await db.Articles.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (article is null)
        {
            return PastelProblem.From(AgoraErrors.ArticleNotFound, http);
        }

        if (article.Status != ArticleStatus.Archived)
        {
            article.Status = ArticleStatus.Archived;
            article.DailyPickOrder = null;
            article.UpdatedAt = clock.UtcNow;
            if (await EditorialSupport.TrySaveAsync(db, cancellationToken) is { } conflict)
            {
                return PastelProblem.From(conflict, http);
            }

            await EditorialSupport.AuditAsync(audit, user, "agora.article.archived", article.Slug, new { article.Title }, cancellationToken);
        }

        return Results.Json(await EditorialSupport.ToDtoAsync(db, options, article, cancellationToken));
    }

    private static async Task<IResult> AddCorrectionAsync(
        Guid id, CorrectionRequest request, AgoraDbContext db, ICurrentUser user, IClock clock, IAuditTrail audit, HttpContext http, CancellationToken cancellationToken)
    {
        if (!InteractionSupport.TryGetUser(user, http, out var userId, out var failure))
        {
            return failure!;
        }

        var article = await db.Articles.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (article is null)
        {
            return PastelProblem.From(AgoraErrors.ArticleNotFound, http);
        }

        if (article.Status != ArticleStatus.Published)
        {
            return PastelProblem.From(AgoraErrors.ArticleInvalidState, http);
        }

        var text = (request.Text ?? string.Empty).Trim();
        if (text.Length < MinCorrectionLength || text.Length > MaxCorrectionLength)
        {
            var errors = new FieldErrors().Add("text", $"Explique la corrección en {MinCorrectionLength} a {MaxCorrectionLength} caracteres.");
            return PastelProblem.From(errors.ToError("agora.correction.invalid"), http);
        }

        var correction = new Correction { ArticleId = id, CorrectedAt = clock.UtcNow, Text = text, CreatedByUserId = userId };
        db.Corrections.Add(correction);
        await db.SaveChangesAsync(cancellationToken);
        await EditorialSupport.AuditAsync(audit, user, "agora.article.corrected", article.Slug, new { text }, cancellationToken);
        return Results.Json(new CorrectionDto(correction.Id, correction.CorrectedAt, correction.Text), statusCode: StatusCodes.Status201Created);
    }
}
