using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Pastel.Modules.Agora.Common;
using Pastel.Modules.Agora.Domain;
using Pastel.Modules.Agora.Features.Editorial;
using Pastel.Modules.Agora.Features.Interaction;
using Pastel.Modules.Agora.Features.Public;
using Pastel.Modules.Agora.Persistence;
using Pastel.Platform.Auditing;
using Pastel.Platform.Errors;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Agora.Features.Review;

internal sealed record VerifyRequest(string? Scope, string? Note);

internal sealed record WithdrawRequest(string? Note);

/// <summary>Verificación vigente con la pieza a la que pertenece (para revisarla o retirarla).</summary>
internal sealed record ReviewVerificationDto(
    Guid Id,
    string ArticleSlug,
    string ArticleTitle,
    string ReviewerName,
    DateTimeOffset VerifiedAt,
    string Scope,
    string? Note,
    bool IsCurrent);

/// <summary>
/// Revisión y verificación (<c>agora.content.review</c>, AG-VER-01 y AG-VER-02). Reglas del servidor: nadie verifica una pieza que
/// escribió o editó (403 <c>agora.verification.self</c>); solo se verifican piezas publicadas; una persona verifica cada versión una
/// sola vez; el alcance revisado se escribe siempre. «Verificado» aparece cuando hay tantas verificaciones vigentes de personas
/// distintas como pide <c>Agora:Verification:RequiredReviewers</c>.
/// </summary>
internal static class ReviewEndpoints
{
    public const int MinScopeLength = 10;
    public const int MaxScopeLength = 500;
    public const int MinWithdrawalLength = 10;
    public const int MaxNoteLength = 500;
    private const int MaxQueueCandidates = 300;

    public static void Map(IEndpointRouteBuilder editorial)
    {
        Review(editorial.MapGet("/review", QueueAsync));
        Review(editorial.MapGet("/review/verifications", ListVerificationsAsync));
        Review(editorial.MapPost("/articles/{id:guid}/verify", VerifyAsync));
        Review(editorial.MapPost("/verifications/{id:guid}/withdraw", WithdrawAsync));
    }

    private static void Review(RouteHandlerBuilder builder) => builder.RequirePermission(AgoraPermissions.ContentReview);

    /// <summary>
    /// Cola de revisión: piezas publicadas sin sello «Verificado» para su versión actual, las modificadas tras verificar primero y luego
    /// las que más esperan. Excluye lo que la persona escribió o editó y lo que ya verificó en su versión actual.
    /// </summary>
    private static async Task<IResult> QueueAsync(
        [AsParameters] PageQuery query, AgoraDbContext db, ICurrentUser user, IOptions<AgoraOptions> options, HttpContext http, CancellationToken cancellationToken)
    {
        if (!InteractionSupport.TryGetUser(user, http, out var userId, out var failure))
        {
            return failure!;
        }

        var paging = PageRequest.Normalize(query.Page, query.PageSize);
        var mine = db.ArticleContributors.Where(c => c.UserId == userId).Select(c => c.ArticleId);
        var candidates = await ArticlesEndpoints.Published(db)
            .Where(a => !mine.Contains(a.Id))
            .OrderBy(a => a.PublishedAt)
            .Take(MaxQueueCandidates)
            .ToListAsync(cancellationToken);
        var cards = await ArticleProjection.CardsAsync(db, options.Value, candidates, cancellationToken);
        var verifiedByMe = (await db.Verifications.AsNoTracking()
                .Where(v => v.ReviewerUserId == userId && v.Status == VerificationStatus.Active)
                .ToListAsync(cancellationToken))
            .Select(v => (v.ArticleId, v.SubstantiveVersion))
            .ToHashSet();

        var pending = new List<ArticleCardDto>();
        for (var i = 0; i < candidates.Count; i++)
        {
            if (cards[i].Seal.State != Wire.Of(SealState.Verified) && !verifiedByMe.Contains((candidates[i].Id, candidates[i].SubstantiveVersion)))
            {
                pending.Add(cards[i]);
            }
        }

        var modified = Wire.Of(SealState.ModifiedAfterVerification);
        var ordered = pending
            .OrderBy(card => card.Seal.State == modified ? 0 : 1)
            .ThenBy(card => card.PublishedAt)
            .ToList();
        var page = ordered.Skip(paging.Skip).Take(paging.PageSize).ToList();
        return Results.Json(new PagedResult<ArticleCardDto>(page, paging.Page, paging.PageSize, ordered.Count));
    }

    private static async Task<IResult> ListVerificationsAsync([AsParameters] PageQuery query, AgoraDbContext db, CancellationToken cancellationToken)
    {
        var paging = PageRequest.Normalize(query.Page, query.PageSize);
        var rows =
            from v in db.Verifications.AsNoTracking()
            join a in db.Articles.AsNoTracking() on v.ArticleId equals a.Id
            where v.Status == VerificationStatus.Active && a.Status == ArticleStatus.Published
            orderby v.VerifiedAt descending
            select new { Verification = v, a.Slug, a.Title, ArticleVersion = a.SubstantiveVersion };
        var total = await rows.CountAsync(cancellationToken);
        var page = await rows.Skip(paging.Skip).Take(paging.PageSize).ToListAsync(cancellationToken);
        var items = page
            .Select(x => new ReviewVerificationDto(
                x.Verification.Id,
                x.Slug,
                x.Title,
                x.Verification.ReviewerName,
                x.Verification.VerifiedAt,
                x.Verification.Scope,
                x.Verification.Note,
                x.Verification.SubstantiveVersion == x.ArticleVersion))
            .ToList();
        return Results.Json(new PagedResult<ReviewVerificationDto>(items, paging.Page, paging.PageSize, total));
    }

    private static async Task<IResult> VerifyAsync(
        Guid id, VerifyRequest request, AgoraDbContext db, ICurrentUser user, IClock clock, IAuditTrail audit, HttpContext http, CancellationToken cancellationToken)
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

        var contributors = (await db.ArticleContributors.AsNoTracking()
                .Where(c => c.ArticleId == id).Select(c => c.UserId).ToListAsync(cancellationToken))
            .ToHashSet();
        var existing = await db.Verifications.AsNoTracking().Where(v => v.ArticleId == id).ToListAsync(cancellationToken);
        var blocked = VerificationPolicy.CanVerify(
            article.Status, userId, contributors, existing.Select(ArticleProjection.ToFact), article.SubstantiveVersion);
        if (blocked is not null)
        {
            return PastelProblem.From(blocked, http);
        }

        var scope = (request.Scope ?? string.Empty).Trim();
        var note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        var errors = new FieldErrors();
        if (scope.Length < MinScopeLength || scope.Length > MaxScopeLength)
        {
            errors.Add("scope", $"Escriba qué revisó, en {MinScopeLength} a {MaxScopeLength} caracteres. El sello avala solo ese alcance.");
        }

        if (note is { Length: > MaxNoteLength })
        {
            errors.Add("note", $"La nota admite hasta {MaxNoteLength} caracteres.");
        }

        if (errors.Any)
        {
            return PastelProblem.From(errors.ToError("agora.verification.invalid"), http);
        }

        var verification = new Verification
        {
            ArticleId = id,
            ReviewerUserId = userId,
            ReviewerName = user.DisplayName ?? "Persona revisora",
            VerifiedAt = clock.UtcNow,
            Scope = scope,
            Note = note,
            SubstantiveVersion = article.SubstantiveVersion,
        };
        db.Verifications.Add(verification);
        await db.SaveChangesAsync(cancellationToken);
        await EditorialSupport.AuditAsync(
            audit, user, "agora.verification.verified", article.Slug, new { scope, note, version = article.SubstantiveVersion }, cancellationToken);

        return Results.Json(
            new VerificationDto(verification.Id, verification.ReviewerName, verification.VerifiedAt, scope, note, true),
            statusCode: StatusCodes.Status201Created);
    }

    private static async Task<IResult> WithdrawAsync(
        Guid id, WithdrawRequest request, AgoraDbContext db, ICurrentUser user, IClock clock, IAuditTrail audit, HttpContext http, CancellationToken cancellationToken)
    {
        if (!InteractionSupport.TryGetUser(user, http, out var userId, out var failure))
        {
            return failure!;
        }

        var verification = await db.Verifications.FirstOrDefaultAsync(v => v.Id == id, cancellationToken);
        if (verification is null)
        {
            return PastelProblem.From(AgoraErrors.VerificationNotFound, http);
        }

        if (verification.Status == VerificationStatus.Withdrawn)
        {
            return PastelProblem.From(AgoraErrors.VerificationAlreadyWithdrawn, http);
        }

        var note = (request.Note ?? string.Empty).Trim();
        if (note.Length < MinWithdrawalLength || note.Length > MaxNoteLength)
        {
            var errors = new FieldErrors().Add("note", $"Explique por qué retira la verificación, en {MinWithdrawalLength} a {MaxNoteLength} caracteres.");
            return PastelProblem.From(errors.ToError("agora.verification.invalid"), http);
        }

        verification.Status = VerificationStatus.Withdrawn;
        verification.WithdrawnAt = clock.UtcNow;
        verification.WithdrawnByUserId = userId;
        verification.WithdrawalNote = note;
        await db.SaveChangesAsync(cancellationToken);

        var slug = await db.Articles.AsNoTracking().Where(a => a.Id == verification.ArticleId).Select(a => a.Slug).FirstAsync(cancellationToken);
        await EditorialSupport.AuditAsync(audit, user, "agora.verification.withdrawn", slug, new { verificationId = id, note }, cancellationToken);
        return Results.NoContent();
    }
}
