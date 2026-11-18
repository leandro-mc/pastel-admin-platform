using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Agora.Common;
using Pastel.Modules.Agora.Domain;
using Pastel.Modules.Agora.Persistence;
using Pastel.Platform.Errors;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Agora.Features.Interaction;

internal sealed record ErrorReportRequest(string? Text);

internal sealed record ErrorReportCreatedDto(Guid Id);

/// <summary>
/// Reacciones constructivas y aviso de errores (AG-CON-02, AG-CON-04). Las reacciones no tienen contador público: la persona solo ve
/// las suyas. El aviso de error llega a la bandeja editorial; tras varios avisos pendientes sobre la misma pieza se pide esperar.
/// </summary>
internal static class ReactionAndReportEndpoints
{
    public const int MinReportLength = 10;
    public const int MaxReportLength = 500;
    public const int MaxOpenReportsPerPersonAndArticle = 3;

    public static void Map(IEndpointRouteBuilder api)
    {
        api.MapPut("/articles/{slug}/reactions/{kind}", ReactAsync)
            .RequirePermission(AgoraPermissions.SavedManage).RequireRateLimiting(AgoraRateLimits.Interaction);
        api.MapDelete("/articles/{slug}/reactions/{kind}", RemoveReactionAsync)
            .RequirePermission(AgoraPermissions.SavedManage).RequireRateLimiting(AgoraRateLimits.Interaction);
        api.MapPost("/articles/{slug}/error-reports", ReportAsync)
            .RequirePermission(AgoraPermissions.SavedManage).RequireRateLimiting(AgoraRateLimits.Interaction);
    }

    private static async Task<IResult> ReactAsync(
        string slug, string kind, AgoraDbContext db, ICurrentUser user, IClock clock, HttpContext http, CancellationToken cancellationToken)
    {
        if (!InteractionSupport.TryGetUser(user, http, out var userId, out var failure))
        {
            return failure!;
        }

        if (!Wire.TryParse<ReactionKind>(kind, out var reaction))
        {
            return PastelProblem.From(InvalidKind(), http);
        }

        if (await InteractionSupport.FindPublishedAsync(db, slug, cancellationToken) is not { } ids)
        {
            return PastelProblem.From(AgoraErrors.ArticleNotFound, http);
        }

        if (!await db.Reactions.AnyAsync(r => r.ArticleId == ids.ArticleId && r.UserId == userId && r.Kind == reaction, cancellationToken))
        {
            db.Reactions.Add(new Reaction { ArticleId = ids.ArticleId, UserId = userId, Kind = reaction, CreatedAt = clock.UtcNow });
            await InteractionSupport.SaveIgnoringDuplicateAsync(db, cancellationToken);
        }

        return Results.NoContent();
    }

    private static async Task<IResult> RemoveReactionAsync(
        string slug, string kind, AgoraDbContext db, ICurrentUser user, HttpContext http, CancellationToken cancellationToken)
    {
        if (!InteractionSupport.TryGetUser(user, http, out var userId, out var failure))
        {
            return failure!;
        }

        if (!Wire.TryParse<ReactionKind>(kind, out var reaction))
        {
            return PastelProblem.From(InvalidKind(), http);
        }

        var articleId = await db.Articles.AsNoTracking().Where(a => a.Slug == slug).Select(a => (Guid?)a.Id).FirstOrDefaultAsync(cancellationToken);
        if (articleId is { } id)
        {
            await db.Reactions.Where(r => r.ArticleId == id && r.UserId == userId && r.Kind == reaction).ExecuteDeleteAsync(cancellationToken);
        }

        return Results.NoContent();
    }

    private static async Task<IResult> ReportAsync(
        string slug, ErrorReportRequest request, AgoraDbContext db, ICurrentUser user, IClock clock, HttpContext http, CancellationToken cancellationToken)
    {
        if (!InteractionSupport.TryGetUser(user, http, out var userId, out var failure))
        {
            return failure!;
        }

        var text = (request.Text ?? string.Empty).Trim();
        if (text.Length < MinReportLength || text.Length > MaxReportLength)
        {
            var errors = new FieldErrors().Add("text", $"Cuéntenos el error en {MinReportLength} a {MaxReportLength} caracteres.");
            return PastelProblem.From(errors.ToError("agora.error_report.invalid"), http);
        }

        if (await InteractionSupport.FindPublishedAsync(db, slug, cancellationToken) is not { } ids)
        {
            return PastelProblem.From(AgoraErrors.ArticleNotFound, http);
        }

        var open = await db.ErrorReports.CountAsync(
            r => r.ArticleId == ids.ArticleId && r.ReporterUserId == userId && r.Status == ErrorReportStatus.Received, cancellationToken);
        if (open >= MaxOpenReportsPerPersonAndArticle)
        {
            return PastelProblem.From(AgoraErrors.ErrorReportLimit, http);
        }

        var report = new ErrorReport { ArticleId = ids.ArticleId, ReporterUserId = userId, Text = text, CreatedAt = clock.UtcNow };
        db.ErrorReports.Add(report);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Json(new ErrorReportCreatedDto(report.Id), statusCode: StatusCodes.Status201Created);
    }

    private static Error InvalidKind() =>
        new FieldErrors().Add("kind", "Esa reacción no existe. Use «helped» o «moreSources».").ToError("agora.reaction.invalid");
}
