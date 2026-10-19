using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Errors;
using Pastel.Platform.Hosting;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Features.Register;

internal sealed record RegisterRequest(string? Email, string? DisplayName, string? Password);

/// <summary><c>POST /api/auth/register</c>: autorregistro con contraseña. Desactivado por defecto (<c>Auth:Local:SelfRegistrationEnabled</c>).</summary>
internal static class RegisterEndpoint
{
    public static void Map(IEndpointRouteBuilder auth) =>
        auth.MapPost("/register", HandleAsync)
            .AllowAnonymousExplicit()
            .RequireRateLimiting(PastelHostingExtensions.AuthRateLimit);

    private static async Task<IResult> HandleAsync(
        RegisterRequest request, RegisterHandler handler, SessionCookies cookies, HttpContext http, CancellationToken cancellationToken)
    {
        var result = await handler.HandleAsync(request, cancellationToken);
        if (result.IsFailure)
        {
            return PastelProblem.From(result.Error, http);
        }

        cookies.Write(http.Response, result.Value);
        return Results.Json(result.Value.Summary, statusCode: StatusCodes.Status201Created);
    }
}
