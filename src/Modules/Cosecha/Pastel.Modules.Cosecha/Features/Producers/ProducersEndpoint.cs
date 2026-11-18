using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Cosecha.Common;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha.Features.Producers;

/// <summary><c>/api/cosecha/producers</c>: productores y su capacidad por temporada. Lectura con <c>producers.read</c>; cambios con <c>producers.manage</c>.</summary>
internal static class ProducersEndpoint
{
    public static void Map(IEndpointRouteBuilder producers)
    {
        producers.MapGet("/", ListAsync).RequirePermission(CosechaPermissions.ProducersRead);
        producers.MapGet("/{id:guid}", GetAsync).RequirePermission(CosechaPermissions.ProducersRead);
        producers.MapPost("/", CreateAsync).RequirePermission(CosechaPermissions.ProducersManage);
        producers.MapPut("/{id:guid}", UpdateAsync).RequirePermission(CosechaPermissions.ProducersManage);
        producers.MapPost("/{id:guid}/archive", ArchiveAsync).RequirePermission(CosechaPermissions.ProducersManage);
        producers.MapPut("/{id:guid}/capacities/{seasonId:guid}", SetCapacityAsync).RequirePermission(CosechaPermissions.ProducersManage);
    }

    private static async Task<IResult> ListAsync(
        string? search, bool? includeArchived, Guid? seasonId, int? page, int? pageSize, ProducersHandler handler, CancellationToken ct) =>
        Results.Json(await handler.ListAsync(search, includeArchived ?? false, seasonId, PageRequest.Normalize(page, pageSize), ct));

    private static async Task<IResult> GetAsync(Guid id, ProducersHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.GetAsync(id, ct)).ToResponse(http);

    private static async Task<IResult> CreateAsync(ProducerRequest request, ProducersHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.CreateAsync(request, ct)).ToResponse(http, StatusCodes.Status201Created);

    private static async Task<IResult> UpdateAsync(Guid id, ProducerRequest request, ProducersHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.UpdateAsync(id, request, ct)).ToResponse(http);

    private static async Task<IResult> ArchiveAsync(Guid id, ArchiveRequest request, ProducersHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.ArchiveAsync(id, request, ct)).ToResponse(http);

    private static async Task<IResult> SetCapacityAsync(
        Guid id, Guid seasonId, CapacityRequest request, ProducersHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.SetCapacityAsync(id, seasonId, request, ct)).ToResponse(http);
}
