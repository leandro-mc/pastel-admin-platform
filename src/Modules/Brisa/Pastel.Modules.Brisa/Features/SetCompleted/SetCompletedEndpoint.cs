using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Brisa.Common;
using Pastel.Platform.Security;

namespace Pastel.Modules.Brisa.Features.SetCompleted;

/// <summary><c>PUT /api/brisa/tasks/{id}/completed</c>: marca o reabre (estado pedido, no alternancia). Devuelve la tarea y el id para deshacer.</summary>
internal static class SetCompletedEndpoint
{
    public static void Map(IEndpointRouteBuilder tasks) =>
        tasks.MapPut("/{id:guid}/completed", HandleAsync)
            .RequirePermission(BrisaPermissions.Access)
            .RequirePermission(BrisaPermissions.ItemsManage);

    private static async Task<IResult> HandleAsync(
        Guid id, SetCompletedRequest request, SetCompletedHandler handler, HttpContext http, CancellationToken cancellationToken) =>
        (await handler.HandleAsync(id, request.Completed, cancellationToken)).ToResponse(http);
}
