using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Brisa.Common;
using Pastel.Platform.Security;

namespace Pastel.Modules.Brisa.Features.CreateTask;

/// <summary><c>POST /api/brisa/tasks</c>: crea una tarea (201). Alta rápida: basta el título.</summary>
internal static class CreateTaskEndpoint
{
    public static void Map(IEndpointRouteBuilder tasks) =>
        tasks.MapPost("/", HandleAsync)
            .RequirePermission(BrisaPermissions.Access)
            .RequirePermission(BrisaPermissions.ItemsManage);

    private static async Task<IResult> HandleAsync(
        TaskWriteRequest request, CreateTaskHandler handler, HttpContext http, CancellationToken cancellationToken) =>
        (await handler.HandleAsync(request, cancellationToken)).ToResponse(http, StatusCodes.Status201Created);
}
