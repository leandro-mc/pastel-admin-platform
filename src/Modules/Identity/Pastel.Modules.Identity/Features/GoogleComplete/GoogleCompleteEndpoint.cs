using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Hosting;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Features.GoogleComplete;

/// <summary>Identidad que Google verificó, tomada de la cookie externa. <c>sub</c> es la clave; el correo solo sirve para vincular.</summary>
internal sealed record GoogleIdentity(string Subject, string Email, bool EmailVerified, string? Name)
{
    public static GoogleIdentity? From(ClaimsPrincipal principal)
    {
        var subject = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? principal.FindFirst("sub")?.Value;
        var email = principal.FindFirst(ClaimTypes.Email)?.Value ?? principal.FindFirst("email")?.Value;
        if (string.IsNullOrWhiteSpace(subject) || subject.Length > 255 || string.IsNullOrWhiteSpace(email))
        {
            return null;
        }

        var verified = string.Equals(principal.FindFirst(GoogleClaims.EmailVerified)?.Value, "true", StringComparison.OrdinalIgnoreCase);
        return new GoogleIdentity(subject, email.Trim(), verified, principal.FindFirst(ClaimTypes.Name)?.Value ?? principal.FindFirst("name")?.Value);
    }
}

/// <summary>
/// <c>GET /api/auth/google/complete</c>: toma la identidad de <c>ExternalCookie</c>, aplica las reglas de cuenta, emite las mismas cookies de
/// sesión que el ingreso con contraseña, borra la cookie externa y redirige. Los errores vuelven a <c>/ingresar?error=&lt;codigo&gt;</c>.
/// </summary>
internal static class GoogleCompleteEndpoint
{
    public static void Map(IEndpointRouteBuilder auth) =>
        auth.MapGet("/google/complete", HandleAsync)
            .AllowAnonymousExplicit()
            .RequireRateLimiting(PastelHostingExtensions.GoogleRateLimit);

    private static async Task<IResult> HandleAsync(HttpContext http, GoogleCompleteHandler handler, SessionCookies cookies, CancellationToken cancellationToken)
    {
        var external = await http.AuthenticateAsync(ExternalSchemes.ExternalCookie);
        await http.SignOutAsync(ExternalSchemes.ExternalCookie);

        var identity = external.Succeeded && external.Principal is { } principal ? GoogleIdentity.From(principal) : null;
        if (identity is null)
        {
            return Results.Redirect($"/ingresar?error={GoogleErrorCodes.Failed}");
        }

        string? requestedReturnUrl = null;
        external.Properties?.Items.TryGetValue(ExternalSchemes.ReturnUrlItem, out requestedReturnUrl);
        var returnUrl = string.Equals(requestedReturnUrl, ReturnUrl.RememberLastApp, StringComparison.Ordinal)
            || !ReturnUrl.IsSafe(requestedReturnUrl)
                ? "/ingresar"
                : ReturnUrl.Sanitize(requestedReturnUrl);
        var outcome = await handler.HandleAsync(identity, cancellationToken);
        if (outcome.Session is not { } session)
        {
            return Results.Redirect($"/ingresar?error={outcome.ErrorCode ?? GoogleErrorCodes.Failed}");
        }

        cookies.Write(http.Response, session);
        return Results.Redirect(returnUrl);
    }
}
