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

internal sealed record ErrorReportsQuery(string? Status, int? Page, int? PageSize);

internal sealed record ResolveErrorReportRequest(string? Outcome, string? Note);

/// <summary>Aviso de error para la bandeja editorial. No incluye quién lo envió: se atiende el contenido, no a la persona.</summary>
internal sealed record ErrorReportDto(
    Guid Id,
    string ArticleSlug,
    string ArticleTitle,
    string Text,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ResolvedAt,
    string? ResolutionNote);

/// <summary>Bandeja de errores señalados (AG-CON-04), <c>agora.content.manage</c>. Por defecto muestra los pendientes.</summary>
internal static class ErrorReportsEditorialEndpoints
{
    public static void Map(IEndpointRouteBuilder editorial)
    {
        EditorialSupport.Manage(editorial.MapGet("/error-reports", ListAsync));
        EditorialSupport.Manage(editorial.MapPost("/error-reports/{id:guid}/resolve", ResolveAsync));
    }

    private static async Task<IResult> ListAsync([AsParameters] ErrorReportsQuery query, AgoraDbContext db, CancellationToken cancellationToken)
    {
        var paging = PageRequest.Normalize(query.Page, query.PageSize);
        var status = Wire.TryParse<ErrorReportStatus>(query.Status, out var parsed) ? parsed : ErrorReportStatus.Received;
        var reports =
            from r in db.ErrorReports.AsNoTracking()
            join a in db.Articles.AsNoTracking() on r.ArticleId equals a.Id
            where r.Status == status
            orderby r.CreatedAt descending
            select new { Report = r, a.Slug, a.Title };
        var total = await reports.CountAsync(cancellationToken);
        var page = await reports.Skip(paging.Skip).Take(paging.PageSize).ToListAsync(cancellationToken);
        var items = page.Select(x => ToDto(x.Report, x.Slug, x.Title)).ToList();
        return Results.Json(new PagedResult<ErrorReportDto>(items, paging.Page, paging.PageSize, total));
    }

    private static async Task<IResult> ResolveAsync(
        Guid id, ResolveErrorReportRequest request, AgoraDbContext db, ICurrentUser user, IClock clock, HttpContext http, CancellationToken cancellationToken)
    {
        if (!InteractionSupport.TryGetUser(user, http, out var userId, out var failure))
        {
            return failure!;
        }

        var report = await db.ErrorReports.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (report is null)
        {
            return PastelProblem.From(AgoraErrors.ReportNotFound, http);
        }

        var note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        var errors = new FieldErrors();
        if (!Wire.TryParse<ErrorReportStatus>(request.Outcome, out var outcome) || outcome == ErrorReportStatus.Received)
        {
            errors.Add("outcome", "Indique si el aviso se resolvió (resolved) o se descartó (dismissed).");
        }

        if (note is { Length: > 300 })
        {
            errors.Add("note", "La nota admite hasta 300 caracteres.");
        }

        if (errors.Any)
        {
            return PastelProblem.From(errors.ToError("agora.error_report.invalid"), http);
        }

        if (report.Status != ErrorReportStatus.Received)
        {
            return PastelProblem.From(AgoraErrors.ErrorReportClosed, http);
        }

        report.Status = outcome;
        report.ResolvedAt = clock.UtcNow;
        report.ResolvedByUserId = userId;
        report.ResolutionNote = note;
        await db.SaveChangesAsync(cancellationToken);

        var article = await db.Articles.AsNoTracking().Where(a => a.Id == report.ArticleId).Select(a => new { a.Slug, a.Title }).FirstAsync(cancellationToken);
        return Results.Json(ToDto(report, article.Slug, article.Title));
    }

    private static ErrorReportDto ToDto(ErrorReport r, string slug, string title) =>
        new(r.Id, slug, title, r.Text, Wire.Of(r.Status), r.CreatedAt, r.ResolvedAt, r.ResolutionNote);
}
