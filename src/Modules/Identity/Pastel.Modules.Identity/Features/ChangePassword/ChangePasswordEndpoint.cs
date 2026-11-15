using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Errors;
using Pastel.Platform.Hosting;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Features.ChangePassword;

internal sealed record ChangePasswordRequest(string? CurrentPassword, string? NewPassword);

/// <summary><c>POST /api/auth/change-password</c>: cambia la contraseña, cierra todas las sesiones y borra las cookies (204).</summary>
internal static class ChangePasswordEndpoint
{
    public static void Map(IEndpointRouteBuilder auth) =>
        auth.MapPost("/change-password", HandleAsync)
            .RequireSession()
            .RequireRateLimiting(PastelHostingExtensions.AuthRateLimit);

    private static async Task<IResult> HandleAsync(
        ChangePasswordRequest request, ChangePasswordHandler handler, SessionCookies cookies, HttpContext http, CancellationToken cancellationToken)
    {
        var result = await handler.HandleAsync(request, cancellationToken);
        if (result.IsFailure)
        {
            return PastelProblem.From(result.Error, http);
        }

        cookies.Clear(http.Response);
        return Results.NoContent();
    }
}
