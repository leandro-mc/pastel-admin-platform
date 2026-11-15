using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Pastel.Platform.Errors;
using Pastel.Platform.Observability;

namespace Pastel.Platform.Security;

/// <summary>
/// Cabeceras de seguridad de las respuestas de la API. Fuente única por tipo de respuesta: la API para <c>/api</c>;
/// nginx para HTML y activos estáticos (ver <c>deploy/nginx</c>).
/// </summary>
internal sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    public Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;
            headers["X-Content-Type-Options"] = "nosniff";
            headers["X-Frame-Options"] = "DENY";
            headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
            headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
            headers["Cross-Origin-Opener-Policy"] = "same-origin";
            headers.CacheControl = "no-store";
            if (context.Request.IsHttps)
            {
                headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
            }

            return Task.CompletedTask;
        });
        return next(context);
    }
}

/// <summary>CSRF de doble envío: toda escritura bajo <c>/api</c> exige la cookie y la cabecera con el mismo valor.</summary>
internal sealed class CsrfProtectionMiddleware(RequestDelegate next, ILogger<CsrfProtectionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var request = context.Request;
        if (!request.Path.StartsWithSegments("/api") || HttpMethods.IsGet(request.Method) || HttpMethods.IsHead(request.Method)
            || HttpMethods.IsOptions(request.Method) || HttpMethods.IsTrace(request.Method))
        {
            await next(context);
            return;
        }

        var hasCookie = request.Cookies.TryGetValue(PastelCookies.Csrf, out var cookie) && !string.IsNullOrWhiteSpace(cookie);
        var header = request.Headers[PastelCookies.CsrfHeader].ToString();
        if (!hasCookie || string.IsNullOrWhiteSpace(header))
        {
            logger.LogWarning(PastelEventIds.CsrfRejected, "Escritura rechazada: falta la protección CSRF en {Path}", request.Path.Value);
            await PastelProblem.From(PlatformErrors.CsrfInvalid, context).ExecuteAsync(context);
            return;
        }

        var cookieBytes = Encoding.UTF8.GetBytes(cookie!);
        var headerBytes = Encoding.UTF8.GetBytes(header);
        if (cookieBytes.Length != headerBytes.Length || !CryptographicOperations.FixedTimeEquals(cookieBytes, headerBytes))
        {
            logger.LogWarning(PastelEventIds.CsrfRejected, "Escritura rechazada: protección CSRF inválida en {Path}", request.Path.Value);
            await PastelProblem.From(PlatformErrors.CsrfInvalid, context).ExecuteAsync(context);
            return;
        }

        await next(context);
    }
}

public sealed class ForcePasswordChangeOptions
{
    /// <summary>Rutas que una cuenta con contraseña temporal sí puede usar.</summary>
    public HashSet<string> AllowedPaths { get; } = new(StringComparer.OrdinalIgnoreCase);
}

/// <summary>Mientras la contraseña sea temporal, solo se permiten las rutas de <see cref="ForcePasswordChangeOptions"/>. Sin consultas: usa el estado ya cargado.</summary>
internal sealed class ForcePasswordChangeMiddleware(RequestDelegate next, IOptions<ForcePasswordChangeOptions> options)
{
    public async Task InvokeAsync(HttpContext context)
    {
        if (context.User.Identity?.IsAuthenticated == true
            && context.Request.Path.StartsWithSegments("/api")
            && context.GetSessionState() is { MustChangePassword: true }
            && !options.Value.AllowedPaths.Contains(context.Request.Path.Value ?? string.Empty))
        {
            await PastelProblem.From(PlatformErrors.PasswordChangeRequired, context).ExecuteAsync(context);
            return;
        }

        await next(context);
    }
}

public sealed class PublicBaseUrlOptions
{
    public Uri? BaseUri { get; set; }

    /// <summary>Prefijos de ruta en los que el esquema y el host se toman de <c>App:PublicBaseUrl</c> (OAuth: el <c>redirect_uri</c> debe coincidir exacto).</summary>
    public List<string> PathPrefixes { get; } = [];
}

/// <summary>Fija esquema y host públicos en las rutas configuradas, sin depender de cómo llegue el proxy.</summary>
internal sealed class PublicBaseUrlMiddleware(RequestDelegate next, IOptions<PublicBaseUrlOptions> options)
{
    public Task InvokeAsync(HttpContext context)
    {
        var settings = options.Value;
        if (settings.BaseUri is { } baseUri && settings.PathPrefixes.Any(p => context.Request.Path.StartsWithSegments(p)))
        {
            context.Request.Scheme = baseUri.Scheme;
            context.Request.Host = new HostString(baseUri.Authority);
        }

        return next(context);
    }
}
