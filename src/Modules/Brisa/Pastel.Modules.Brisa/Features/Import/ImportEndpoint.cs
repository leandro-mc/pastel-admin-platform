using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Brisa.Common;
using Pastel.Platform.Security;

namespace Pastel.Modules.Brisa.Features.Import;

/// <summary>
/// Importación de tareas: <c>POST /api/brisa/import</c> (vista previa o definitivo, todo o nada),
/// <c>GET /api/brisa/import</c> (lotes recientes) y <c>POST /api/brisa/import/{batchId}/revert</c> (revertir un lote).
/// </summary>
internal static class ImportEndpoint
{
    public static void Map(IEndpointRouteBuilder import)
    {
        import.MapPost("/", ImportAsync)
            .RequirePermission(BrisaPermissions.Access)
            .RequirePermission(BrisaPermissions.ItemsManage);
        import.MapGet("/", ListAsync).RequirePermission(BrisaPermissions.Access);
        import.MapPost("/{batchId:guid}/revert", RevertAsync)
            .RequirePermission(BrisaPermissions.Access)
            .RequirePermission(BrisaPermissions.ItemsManage);
    }

    private static async Task<IResult> ImportAsync(
        ImportRequest request, ImportTasksHandler handler, HttpContext http, CancellationToken cancellationToken) =>
        (await handler.HandleAsync(request, cancellationToken)).ToResponse(http);

    private static async Task<IResult> ListAsync(ImportBatchesHandler handler, HttpContext http, CancellationToken cancellationToken) =>
        (await handler.ListAsync(cancellationToken)).ToResponse(http);

    private static async Task<IResult> RevertAsync(
        Guid batchId, ImportBatchesHandler handler, HttpContext http, CancellationToken cancellationToken) =>
        (await handler.RevertAsync(batchId, cancellationToken)).ToResponse(http);
}
