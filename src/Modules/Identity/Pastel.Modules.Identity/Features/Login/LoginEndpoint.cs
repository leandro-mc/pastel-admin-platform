using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Errors;
using Pastel.Platform.Hosting;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Features.Login;

internal sealed record LoginRequest(string? Email, string? Password);

/// <summary><c>POST /api/auth/login</c>: ingreso con correo y contraseña. Responde con la sesión y fija las cookies.</summary>
internal static class LoginEndpoint
{
    public static void Map(IEndpointRouteBuilder auth) =>
        auth.MapPost("/login", HandleAsync)
            .AllowAnonymousExplicit()
            .RequireRateLimiting(PastelHostingExtensions.AuthRateLimit);

    private static async Task<IResult> HandleAsync(
        LoginRequest request, LoginHandler handler, SessionCookies cookies, HttpContext http, CancellationToken cancellationToken)
    {
        var result = await handler.HandleAsync(request, cancellationToken);
        if (result.IsFailure)
        {
            return PastelProblem.From(result.Error, http);
        }

        cookies.Write(http.Response, result.Value);
        return Results.Ok(result.Value.Summary);
    }
}
