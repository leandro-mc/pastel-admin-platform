using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Brisa.Common;
using Pastel.Platform.Security;

namespace Pastel.Modules.Brisa.Features.DeleteTask;

/// <summary><c>DELETE /api/brisa/tasks/{id}</c>: eliminación lógica. Devuelve el id para deshacer.</summary>
internal static class DeleteTaskEndpoint
{
    public static void Map(IEndpointRouteBuilder tasks) =>
        tasks.MapDelete("/{id:guid}", HandleAsync)
            .RequirePermission(BrisaPermissions.Access)
            .RequirePermission(BrisaPermissions.ItemsManage);

    private static async Task<IResult> HandleAsync(
        Guid id, DeleteTaskHandler handler, HttpContext http, CancellationToken cancellationToken) =>
        (await handler.HandleAsync(id, cancellationToken)).ToResponse(http);
}
