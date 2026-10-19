using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Features.SetUserPermissions;

internal sealed record PermissionChangeRequest(Guid PermissionId, PermissionEffect Effect);

internal sealed record SetUserPermissionsRequest(PermissionChangeRequest[]? Changes);

/// <summary><c>PUT /api/admin/users/{userId}/permissions</c>: reemplaza las excepciones individuales de la cuenta (204).</summary>
internal static class SetUserPermissionsEndpoint
{
    public static void Map(IEndpointRouteBuilder users) =>
        users.MapPut("/{userId:guid}/permissions", HandleAsync).RequirePermission(IdentityPermissions.UsersUpdate);

    private static async Task<IResult> HandleAsync(
        Guid userId, SetUserPermissionsRequest request, SetUserPermissionsHandler handler, HttpContext http, CancellationToken cancellationToken) =>
        (await handler.HandleAsync(userId, request, cancellationToken)).ToNoContent(http);
}
