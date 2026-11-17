using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Brisa.Common;
using Pastel.Platform.Security;

namespace Pastel.Modules.Brisa.Features.DeleteTask;

/// <summary>
/// <c>POST /api/brisa/tasks/{id}/delete</c>: eliminación lógica. Devuelve el id para deshacer. Es un <c>POST</c> (y no un
/// <c>DELETE</c>) porque la respuesta lleva cuerpo y la acción es deshacible, como <c>/completed</c>.
/// </summary>
internal static class DeleteTaskEndpoint
{
    public static void Map(IEndpointRouteBuilder tasks) =>
        tasks.MapPost("/{id:guid}/delete", HandleAsync)
            .RequirePermission(BrisaPermissions.Access)
            .RequirePermission(BrisaPermissions.ItemsManage);

    private static async Task<IResult> HandleAsync(
        Guid id, DeleteTaskHandler handler, HttpContext http, CancellationToken cancellationToken) =>
        (await handler.HandleAsync(id, cancellationToken)).ToResponse(http);
}
