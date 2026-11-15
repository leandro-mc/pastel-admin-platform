using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Security;

/// <summary>Nombres de los esquemas de autenticación externa. Build/QA registran un esquema <c>Google</c> falso con estos nombres.</summary>
internal static class ExternalSchemes
{
    public const string Google = "Google";
    public const string ExternalCookie = "ExternalCookie";
    public const string GoogleCallbackPath = "/api/auth/google/callback";
    public const string CompletePath = "/api/auth/google/complete";

    /// <summary>Clave con la que <c>returnUrl</c> viaja protegido dentro del estado de OAuth.</summary>
    public const string ReturnUrlItem = "pastel.return_url";
}

/// <summary>
/// Autenticación con Google (OAuth 2.0 con PKCE y OIDC). El esquema <c>ExternalCookie</c> es solo un paso intermedio de 5 minutos:
/// guarda la identidad verificada por Google hasta que <c>/api/auth/google/complete</c> aplica las reglas de cuenta y emite
/// las mismas cookies de sesión que el ingreso con contraseña. Sin credenciales, Google queda desactivado y la aplicación arranca.
/// </summary>
internal static class GoogleSignInSetup
{
    public static IServiceCollection AddGoogleSignIn(this IServiceCollection services, IConfiguration configuration)
    {
        var authentication = services.AddAuthentication().AddCookie(ExternalSchemes.ExternalCookie, options =>
        {
            options.Cookie.Name = PastelCookies.ExternalLogin;
            options.Cookie.HttpOnly = true;
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.Path = "/";
            options.ExpireTimeSpan = TimeSpan.FromMinutes(5);
            options.SlidingExpiration = false;
            // Es un paso interno: nunca redirige a una pantalla de acceso del servidor.
            options.Events.OnRedirectToLogin = context =>
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            };
            options.Events.OnRedirectToAccessDenied = context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            };
        });

        var clientId = configuration["Authentication:Google:ClientId"];
        var clientSecret = configuration["Authentication:Google:ClientSecret"];
        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
        {
            return services;
        }

        authentication.AddGoogle(ExternalSchemes.Google, options =>
        {
            options.ClientId = clientId;
            options.ClientSecret = clientSecret;
            options.SignInScheme = ExternalSchemes.ExternalCookie;
            options.CallbackPath = ExternalSchemes.GoogleCallbackPath;
            options.SaveTokens = false;
            options.UsePkce = true;
            options.Scope.Clear();
            options.Scope.Add("openid");
            options.Scope.Add("email");
            options.Scope.Add("profile");
            options.ClaimActions.MapJsonKey(GoogleClaims.EmailVerified, "email_verified");
            // El retorno de Google es una navegación de nivel superior: Lax basta y no exige SameSite=None.
            options.CorrelationCookie.SameSite = SameSiteMode.Lax;
            options.CorrelationCookie.SecurePolicy = CookieSecurePolicy.Always;
            options.Events.OnRemoteFailure = context =>
            {
                // No se registra ni el code ni el state de OAuth: solo si la persona canceló o si falló otra cosa.
                var denied = string.Equals(context.Request.Query["error"], "access_denied", StringComparison.Ordinal);
                context.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("Pastel.Identity.Google")
                    .LogWarning(IdentityEventIds.GoogleRejected, "Google no completó el ingreso (cancelado: {Denied})", denied);
                context.Response.Redirect($"/ingresar?error={(denied ? GoogleErrorCodes.Denied : GoogleErrorCodes.Failed)}");
                context.HandleResponse();
                return Task.CompletedTask;
            };
        });
        return services;
    }
}

/// <summary>Reclamaciones que usa el flujo de Google. <c>sub</c> llega como <c>NameIdentifier</c>.</summary>
internal static class GoogleClaims
{
    public const string EmailVerified = "email_verified";
}

/// <summary>Códigos que el ingreso devuelve en <c>/ingresar?error=…</c>; el frontend los traduce a mensajes claros.</summary>
internal static class GoogleErrorCodes
{
    public const string Denied = "google_denied";
    public const string EmailUnverified = "email_unverified";
    public const string AccountDisabled = "account_disabled";
    public const string SignupClosed = "signup_closed";
    public const string Failed = "failed";
}
