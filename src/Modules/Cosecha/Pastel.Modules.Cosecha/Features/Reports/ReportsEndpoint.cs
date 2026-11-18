using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Cosecha.Common;
using Pastel.Platform.Security;

namespace Pastel.Modules.Cosecha.Features.Reports;

/// <summary>
/// <c>/api/cosecha/reports/{kind}</c> (shipments, producers, buyers, season) en JSON y <c>/csv</c> para Excel. Solo <c>reports.read</c>:
/// incluyen montos a productores y márgenes, que el comprador nunca debe ver.
/// </summary>
internal static class ReportsEndpoint
{
    public static void Map(IEndpointRouteBuilder reports)
    {
        reports.MapGet("/{kind}", BuildAsync).RequirePermission(CosechaPermissions.ReportsRead);
        reports.MapGet("/{kind}/csv", ExportAsync).RequirePermission(CosechaPermissions.ReportsRead);
    }

    private static async Task<IResult> BuildAsync(
        string kind, Guid? seasonId, DateOnly? from, DateOnly? to, ReportsHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.BuildAsync(kind, new ReportFilter(seasonId, from, to), ct)).ToResponse(http);

    private static async Task<IResult> ExportAsync(
        string kind, Guid? seasonId, DateOnly? from, DateOnly? to, ReportsHandler handler, HttpContext http, CancellationToken ct)
    {
        var file = await handler.ExportCsvAsync(kind, new ReportFilter(seasonId, from, to), ct);
        return file.IsFailure
            ? Pastel.Platform.Errors.PastelProblem.From(file.Error, http)
            : Results.File(file.Value.Content, "text/csv; charset=utf-8", file.Value.FileName);
    }
}
