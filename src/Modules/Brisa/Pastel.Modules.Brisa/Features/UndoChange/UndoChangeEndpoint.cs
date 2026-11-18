using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Brisa.Common;
using Pastel.Platform.Security;

namespace Pastel.Modules.Brisa.Features.UndoChange;

/// <summary><c>POST /api/brisa/undo/{undoId}</c>: deshace marcar/reabrir o eliminar (un solo uso; 409 si la tarea cambió después).</summary>
internal static class UndoChangeEndpoint
{
    public static void Map(IEndpointRouteBuilder undo) =>
        undo.MapPost("/{undoId:guid}", HandleAsync)
            .RequirePermission(BrisaPermissions.Access)
            .RequirePermission(BrisaPermissions.ItemsManage);

    private static async Task<IResult> HandleAsync(
        Guid undoId, UndoChangeHandler handler, HttpContext http, CancellationToken cancellationToken) =>
        (await handler.HandleAsync(undoId, cancellationToken)).ToResponse(http);
}
