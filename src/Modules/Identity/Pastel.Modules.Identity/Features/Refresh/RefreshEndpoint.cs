using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Errors;
using Pastel.Platform.Hosting;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Features.Refresh;

/// <summary><c>POST /api/auth/refresh</c>: rota el refresh token (cookie) y emite un acceso nuevo. Sin cuerpo.</summary>
internal static class RefreshEndpoint
{
    public static void Map(IEndpointRouteBuilder auth) =>
        auth.MapPost("/refresh", HandleAsync)
            .AllowAnonymousExplicit()
            .RequireRateLimiting(PastelHostingExtensions.AuthRateLimit);

    private static async Task<IResult> HandleAsync(
        RefreshHandler handler, SessionCookies cookies, HttpContext http, CancellationToken cancellationToken)
    {
        var result = await handler.HandleAsync(cookies.ReadRefresh(http.Request), cancellationToken);
        if (result.IsFailure)
        {
            return PastelProblem.From(result.Error, http);
        }

        cookies.Write(http.Response, result.Value);
        return Results.Ok(result.Value.Summary);
    }
}
