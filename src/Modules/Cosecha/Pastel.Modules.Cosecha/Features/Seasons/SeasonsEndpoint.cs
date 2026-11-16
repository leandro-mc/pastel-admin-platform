using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Cosecha.Common;
using Pastel.Platform.Security;

namespace Pastel.Modules.Cosecha.Features.Seasons;

/// <summary><c>/api/cosecha/seasons</c>: temporadas (antes «campañas»). Lectura con <c>catalog.read</c>; cambios con <c>catalog.manage</c>.</summary>
internal static class SeasonsEndpoint
{
    public static void Map(IEndpointRouteBuilder seasons)
    {
        seasons.MapGet("/", ListAsync).RequirePermission(CosechaPermissions.CatalogRead);
        seasons.MapPost("/", CreateAsync).RequirePermission(CosechaPermissions.CatalogManage);
        seasons.MapPut("/{id:guid}", UpdateAsync).RequirePermission(CosechaPermissions.CatalogManage);
        seasons.MapPost("/{id:guid}/status", SetStatusAsync).RequirePermission(CosechaPermissions.CatalogManage);
    }

    private static async Task<IResult> ListAsync(SeasonsHandler handler, CancellationToken ct) => Results.Json(await handler.ListAsync(ct));

    private static async Task<IResult> CreateAsync(SeasonRequest request, SeasonsHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.CreateAsync(request, ct)).ToResponse(http, StatusCodes.Status201Created);

    private static async Task<IResult> UpdateAsync(Guid id, SeasonRequest request, SeasonsHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.UpdateAsync(id, request, ct)).ToResponse(http);

    private static async Task<IResult> SetStatusAsync(Guid id, SeasonStatusRequest request, SeasonsHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.SetStatusAsync(id, request, ct)).ToResponse(http);
}
