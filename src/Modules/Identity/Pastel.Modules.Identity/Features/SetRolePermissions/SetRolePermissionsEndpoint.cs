using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Features.SetRolePermissions;

internal sealed record SetRolePermissionsRequest(Guid[]? PermissionIds);

/// <summary><c>PUT /api/admin/roles/{roleId}/permissions</c>: reemplaza los permisos del rol (204). Administrator siempre conserva todos.</summary>
internal static class SetRolePermissionsEndpoint
{
    public static void Map(IEndpointRouteBuilder roles) =>
        roles.MapPut("/{roleId:guid}/permissions", HandleAsync).RequirePermission(IdentityPermissions.RolesUpdate);

    private static async Task<IResult> HandleAsync(
        Guid roleId, SetRolePermissionsRequest request, SetRolePermissionsHandler handler, HttpContext http, CancellationToken cancellationToken) =>
        (await handler.HandleAsync(roleId, request, cancellationToken)).ToNoContent(http);
}
