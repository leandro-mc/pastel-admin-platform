using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Features.ResetUserPassword;

internal sealed record ResetUserPasswordResponse(string TemporaryPassword, bool MustChangePassword);

/// <summary><c>POST /api/admin/users/{userId}/reset-password</c>: genera una contraseña temporal y se muestra una sola vez.</summary>
internal static class ResetUserPasswordEndpoint
{
    public static void Map(IEndpointRouteBuilder users) =>
        users.MapPost("/{userId:guid}/reset-password", HandleAsync).RequirePermission(IdentityPermissions.UsersResetPassword);

    private static async Task<IResult> HandleAsync(
        Guid userId, ResetUserPasswordHandler handler, HttpContext http, CancellationToken cancellationToken)
    {
        http.Response.Headers.CacheControl = "no-store";
        return (await handler.HandleAsync(userId, cancellationToken)).ToResponse(http);
    }
}
