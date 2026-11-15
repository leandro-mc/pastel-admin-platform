using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Features.SetUserRoles;

internal sealed record SetUserRolesRequest(Guid[]? RoleIds);

/// <summary><c>PUT /api/admin/users/{userId}/roles</c>: reemplaza los roles de la cuenta. Responde <c>{ roles }</c>.</summary>
internal static class SetUserRolesEndpoint
{
    public static void Map(IEndpointRouteBuilder users) =>
        users.MapPut("/{userId:guid}/roles", HandleAsync).RequirePermission(IdentityPermissions.UsersUpdate);

    private static async Task<IResult> HandleAsync(
        Guid userId, SetUserRolesRequest request, SetUserRolesHandler handler, HttpContext http, CancellationToken cancellationToken) =>
        (await handler.HandleAsync(userId, request, cancellationToken)).Map(roles => new { roles }).ToResponse(http);
}
