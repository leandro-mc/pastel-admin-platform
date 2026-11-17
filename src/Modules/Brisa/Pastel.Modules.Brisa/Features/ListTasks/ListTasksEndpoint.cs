using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Brisa.Common;
using Pastel.Platform.Security;

namespace Pastel.Modules.Brisa.Features.ListTasks;

/// <summary>Paginación (<c>page</c>, <c>pageSize</c> ≤ 100) y lectura incremental (<c>updatedSince</c>, incluye eliminadas).</summary>
internal sealed record ListTasksQuery(int? Page, int? PageSize, DateTimeOffset? UpdatedSince);

/// <summary><c>GET /api/brisa/tasks</c>: tareas de la persona con su día efectivo calculado, por <c>UpdatedAt</c> ascendente.</summary>
internal static class ListTasksEndpoint
{
    public static void Map(IEndpointRouteBuilder tasks) =>
        tasks.MapGet("/", HandleAsync).RequirePermission(BrisaPermissions.Access);

    private static async Task<IResult> HandleAsync(
        [AsParameters] ListTasksQuery query, ListTasksHandler handler, HttpContext http, CancellationToken cancellationToken) =>
        (await handler.HandleAsync(query, cancellationToken)).ToResponse(http);
}
