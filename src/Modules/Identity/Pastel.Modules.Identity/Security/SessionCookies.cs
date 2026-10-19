using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Security;

/// <summary>Cookies de sesión: acceso y refresh <c>HttpOnly</c>, <c>Secure</c>, <c>SameSite=Strict</c>; CSRF legible por el cliente.</summary>
internal sealed class SessionCookies
{
    private static CookieOptions Base(DateTimeOffset? expires = null, bool httpOnly = true) => new()
    {
        HttpOnly = httpOnly,
        Secure = true,
        SameSite = SameSiteMode.Strict,
        Path = "/",
        IsEssential = true,
        Expires = expires,
    };

    public void Write(HttpResponse response, IssuedSession session)
    {
        response.Cookies.Append(PastelCookies.Access, session.AccessToken, Base(session.AccessExpiresAt));
        response.Cookies.Append(PastelCookies.Refresh, session.RefreshToken, Base(session.RefreshExpiresAt));
        NoStore(response);
    }

    public void Clear(HttpResponse response)
    {
        var expired = Base(DateTimeOffset.UnixEpoch);
        response.Cookies.Delete(PastelCookies.Access, expired);
        response.Cookies.Delete(PastelCookies.Refresh, expired);
        NoStore(response);
    }

    public string? ReadRefresh(HttpRequest request) =>
        request.Cookies.TryGetValue(PastelCookies.Refresh, out var value) && !string.IsNullOrWhiteSpace(value) ? value : null;

    /// <summary>Emite un token CSRF nuevo (doble envío): cookie legible por el cliente y el mismo valor en el cuerpo.</summary>
    public string IssueCsrf(HttpResponse response)
    {
        var token = TokenSecrets.NewOpaqueToken(32);
        var options = Base(httpOnly: false);
        options.MaxAge = TimeSpan.FromHours(8);
        response.Cookies.Append(PastelCookies.Csrf, token, options);
        NoStore(response);
        return token;
    }

    private static void NoStore(HttpResponse response)
    {
        response.Headers.CacheControl = "no-store";
        response.Headers.Pragma = "no-cache";
    }
}
