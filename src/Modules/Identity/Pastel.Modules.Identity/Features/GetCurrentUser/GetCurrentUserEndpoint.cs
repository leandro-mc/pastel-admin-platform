using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Errors;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Features.GetCurrentUser;

/// <summary>
/// <c>GET /api/auth/me</c>: la persona de la sesión y sus permisos efectivos. Usa el mismo <see cref="IPermissionEvaluator"/> que la autorización
/// y el resumen ya cargado al validar el token: no agrega consultas propias de usuario.
/// </summary>
internal static class GetCurrentUserEndpoint
{
    public static void Map(IEndpointRouteBuilder auth) => auth.MapGet("/me", HandleAsync).RequireSession();

    private static async Task<IResult> HandleAsync(
        HttpContext http, ICurrentUser currentUser, IPermissionEvaluator evaluator, CancellationToken cancellationToken)
    {
        var user = http.GetSessionUser();
        if (user is null || currentUser.UserId is not { } userId)
        {
            return PastelProblem.From(PlatformErrors.Unauthorized, http);
        }

        var permissions = await evaluator.GetEffectivePermissionsAsync(userId, cancellationToken);
        return Results.Ok(new { user, permissions = permissions.OrderBy(x => x, StringComparer.Ordinal).ToArray() });
    }
}
