using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Features.ListUsers;

/// <summary>Parámetros de <c>GET /api/admin/users</c>. <c>Status</c>: <c>active</c> o <c>blocked</c>; <c>Role</c>: nombre del rol.</summary>
internal sealed record ListUsersQuery(int? Page, int? PageSize, string? Search, string? Role, string? Status);

/// <summary><c>GET /api/admin/users</c>: <c>{ items, page, pageSize, totalCount }</c>, paginado y filtrado en el servidor.</summary>
internal static class ListUsersEndpoint
{
    public static void Map(IEndpointRouteBuilder users) =>
        users.MapGet("/", HandleAsync).RequirePermission(IdentityPermissions.UsersRead);

    private static async Task<IResult> HandleAsync(
        [AsParameters] ListUsersQuery query, ListUsersHandler handler, HttpContext http, CancellationToken cancellationToken) =>
        (await handler.HandleAsync(query, cancellationToken)).ToResponse(http);
}
