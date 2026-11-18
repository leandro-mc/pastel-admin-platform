using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Brisa.Common;
using Pastel.Platform.Security;

namespace Pastel.Modules.Brisa.Features.UpdateTask;

/// <summary><c>PUT /api/brisa/tasks/{id}</c>: reemplaza los datos de la tarea; 409 si cambió desde la versión indicada.</summary>
internal static class UpdateTaskEndpoint
{
    public static void Map(IEndpointRouteBuilder tasks) =>
        tasks.MapPut("/{id:guid}", HandleAsync)
            .RequirePermission(BrisaPermissions.Access)
            .RequirePermission(BrisaPermissions.ItemsManage);

    private static async Task<IResult> HandleAsync(
        Guid id, TaskWriteRequest request, UpdateTaskHandler handler, HttpContext http, CancellationToken cancellationToken) =>
        (await handler.HandleAsync(id, request, cancellationToken)).ToResponse(http);
}
