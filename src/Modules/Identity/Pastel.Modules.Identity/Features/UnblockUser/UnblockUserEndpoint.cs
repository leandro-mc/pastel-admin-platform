using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Features.UnblockUser;

/// <summary><c>POST /api/admin/users/{userId}/unblock</c>: reactiva la cuenta y limpia el bloqueo por contraseña (204).</summary>
internal static class UnblockUserEndpoint
{
    public static void Map(IEndpointRouteBuilder users) =>
        users.MapPost("/{userId:guid}/unblock", HandleAsync).RequirePermission(IdentityPermissions.UsersLock);

    private static async Task<IResult> HandleAsync(
        Guid userId, UnblockUserHandler handler, HttpContext http, CancellationToken cancellationToken) =>
        (await handler.HandleAsync(userId, cancellationToken)).ToNoContent(http);
}
