using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Features.Logout;

/// <summary><c>POST /api/auth/logout</c>: revoca el refresh token y borra las cookies. Es público para poder salir con la sesión vencida.</summary>
internal static class LogoutEndpoint
{
    public static void Map(IEndpointRouteBuilder auth) =>
        auth.MapPost("/logout", HandleAsync).AllowAnonymousExplicit();

    private static async Task<IResult> HandleAsync(
        LogoutHandler handler, SessionCookies cookies, HttpContext http, CancellationToken cancellationToken)
    {
        await handler.HandleAsync(cookies.ReadRefresh(http.Request), cancellationToken);
        cookies.Clear(http.Response);
        return Results.NoContent();
    }
}
