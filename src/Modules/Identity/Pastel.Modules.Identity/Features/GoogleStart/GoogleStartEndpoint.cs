using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Hosting;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Features.GoogleStart;

/// <summary>
/// <c>GET /api/auth/google/start?returnUrl=…</c>: valida <c>returnUrl</c> y envía a Google (<c>Challenge</c>). El destino de retorno viaja
/// dentro del estado protegido de OAuth, nunca como parámetro libre. Si Google no está configurado, vuelve al ingreso con un error.
/// </summary>
internal static class GoogleStartEndpoint
{
    public static void Map(IEndpointRouteBuilder auth) =>
        auth.MapGet("/google/start", HandleAsync)
            .AllowAnonymousExplicit()
            .RequireRateLimiting(PastelHostingExtensions.GoogleRateLimit);

    private static async Task<IResult> HandleAsync(string? returnUrl, IAuthenticationSchemeProvider schemes)
    {
        if (await schemes.GetSchemeAsync(ExternalSchemes.Google) is null)
        {
            return Results.Redirect($"/ingresar?error={GoogleErrorCodes.Failed}");
        }

        var properties = new AuthenticationProperties { RedirectUri = ExternalSchemes.CompletePath };
        properties.Items[ExternalSchemes.ReturnUrlItem] = ReturnUrl.IsSafe(returnUrl)
            ? ReturnUrl.Sanitize(returnUrl)
            : ReturnUrl.RememberLastApp;
        return Results.Challenge(properties, [ExternalSchemes.Google]);
    }
}
