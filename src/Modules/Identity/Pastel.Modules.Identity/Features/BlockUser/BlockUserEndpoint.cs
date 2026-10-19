using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Features.BlockUser;

/// <summary><c>POST /api/admin/users/{userId}/block</c>: desactiva la cuenta y cierra todas sus sesiones (204).</summary>
internal static class BlockUserEndpoint
{
    public static void Map(IEndpointRouteBuilder users) =>
        users.MapPost("/{userId:guid}/block", HandleAsync).RequirePermission(IdentityPermissions.UsersLock);

    private static async Task<IResult> HandleAsync(Guid userId, BlockUserHandler handler, HttpContext http, CancellationToken cancellationToken) =>
        (await handler.HandleAsync(userId, cancellationToken)).ToNoContent(http);
}
