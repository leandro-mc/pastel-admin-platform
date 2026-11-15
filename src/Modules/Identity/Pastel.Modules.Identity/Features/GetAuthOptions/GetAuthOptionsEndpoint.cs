using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Options;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Hosting;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Features.GetAuthOptions;

/// <summary>
/// GET /api/auth/options: configuración pública de acceso y política única de contraseñas.
/// <c>google</c> es true solo si el esquema Google está registrado (credenciales configuradas o proveedor de pruebas).
/// </summary>
internal static class GetAuthOptionsEndpoint
{
    public static void Map(IEndpointRouteBuilder auth) =>
        auth.MapGet("/options", Handle)
            .AllowAnonymousExplicit()
            .RequireRateLimiting(PastelHostingExtensions.AuthRateLimit);

    private static async Task<IResult> Handle(IOptions<AuthOptions> options, IAuthenticationSchemeProvider schemes)
    {
        var local = options.Value.Local;
        var google = await schemes.GetSchemeAsync(ExternalSchemes.Google) is not null;
        return Results.Ok(new AuthOptionsResponse(
            Google: google,
            LocalLogin: local.Enabled,
            LocalRegistration: local.Enabled && local.SelfRegistrationEnabled,
            PasswordPolicy: new PasswordPolicyInfo(
                PasswordPolicy.MinLength,
                PasswordPolicy.MaxLength,
                PasswordPolicy.Description)));
    }
}

internal sealed record AuthOptionsResponse(
    bool Google,
    bool LocalLogin,
    bool LocalRegistration,
    PasswordPolicyInfo PasswordPolicy);

internal sealed record PasswordPolicyInfo(int MinLength, int MaxLength, string Description);
