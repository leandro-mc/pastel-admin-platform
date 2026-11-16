using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Cosecha.Common;
using Pastel.Modules.Cosecha.Features.Producers;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha.Features.Buyers;

/// <summary><c>/api/cosecha/buyers</c>: compradores y sus contactos. Lectura con <c>buyers.read</c>; cambios con <c>buyers.manage</c>.</summary>
internal static class BuyersEndpoint
{
    public static void Map(IEndpointRouteBuilder buyers)
    {
        buyers.MapGet("/", ListAsync).RequirePermission(CosechaPermissions.BuyersRead);
        buyers.MapGet("/{id:guid}", GetAsync).RequirePermission(CosechaPermissions.BuyersRead);
        buyers.MapPost("/", CreateAsync).RequirePermission(CosechaPermissions.BuyersManage);
        buyers.MapPut("/{id:guid}", UpdateAsync).RequirePermission(CosechaPermissions.BuyersManage);
        buyers.MapPost("/{id:guid}/archive", ArchiveAsync).RequirePermission(CosechaPermissions.BuyersManage);
    }

    private static async Task<IResult> ListAsync(string? search, bool? includeArchived, int? page, int? pageSize, BuyersHandler handler, CancellationToken ct) =>
        Results.Json(await handler.ListAsync(search, includeArchived ?? false, PageRequest.Normalize(page, pageSize), ct));

    private static async Task<IResult> GetAsync(Guid id, BuyersHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.GetAsync(id, ct)).ToResponse(http);

    private static async Task<IResult> CreateAsync(BuyerRequest request, BuyersHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.CreateAsync(request, ct)).ToResponse(http, StatusCodes.Status201Created);

    private static async Task<IResult> UpdateAsync(Guid id, BuyerRequest request, BuyersHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.UpdateAsync(id, request, ct)).ToResponse(http);

    private static async Task<IResult> ArchiveAsync(Guid id, ArchiveRequest request, BuyersHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.ArchiveAsync(id, request, ct)).ToResponse(http);
}
