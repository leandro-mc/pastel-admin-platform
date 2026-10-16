using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Pastel.Application.Abstractions;
using Pastel.Infrastructure.Persistence;

namespace Pastel.Api.Middleware;

public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;
            headers["X-Content-Type-Options"] = "nosniff";
            headers["X-Frame-Options"] = "DENY";
            headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
            headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
            headers["Cross-Origin-Opener-Policy"] = "same-origin";
            headers["Cache-Control"] = "no-store";
            if (context.Request.IsHttps) headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
            return Task.CompletedTask;
        });
        await next(context);
    }
}

public sealed class CsrfProtectionMiddleware(RequestDelegate next, ILogger<CsrfProtectionMiddleware> logger)
{
    private const string CookieName = "__Host-pastel_csrf";
    private const string HeaderName = "X-CSRF-TOKEN";

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path;
        if (!path.StartsWithSegments("/api") || HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsHead(context.Request.Method) || HttpMethods.IsOptions(context.Request.Method) || HttpMethods.IsTrace(context.Request.Method))
        {
            await next(context);
            return;
        }

        if (!context.Request.Cookies.TryGetValue(CookieName, out var cookieToken)
            || string.IsNullOrWhiteSpace(cookieToken)
            || !context.Request.Headers.TryGetValue(HeaderName, out var headerValues)
            || string.IsNullOrWhiteSpace(headerValues.ToString()))
        {
            logger.LogWarning("Blocked state-changing request without CSRF token: {Path}", path);
            await RejectAsync(context);
            return;
        }

        var cookieBytes = Encoding.UTF8.GetBytes(cookieToken);
        var headerBytes = Encoding.UTF8.GetBytes(headerValues.ToString());
        if (cookieBytes.Length != headerBytes.Length || !CryptographicOperations.FixedTimeEquals(cookieBytes, headerBytes))
        {
            logger.LogWarning("Blocked request with invalid CSRF token: {Path}", path);
            await RejectAsync(context);
            return;
        }
        await next(context);
    }

    private static async Task RejectAsync(HttpContext context)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new { title = "Solicitud no válida", status = 400, detail = "No se pudo validar la protección CSRF. Recargá la página e intentá de nuevo." }));
    }
}

public sealed class ForcePasswordChangeMiddleware(RequestDelegate next)
{
    private static readonly string[] AllowedPaths = ["/api/auth/me", "/api/auth/change-password", "/api/auth/logout", "/api/auth/csrf"];

    public async Task InvokeAsync(HttpContext context, AppDbContext db)
    {
        if (context.User.Identity?.IsAuthenticated == true && context.Request.Path.StartsWithSegments("/api")
            && !AllowedPaths.Any(x => context.Request.Path.Equals(x, StringComparison.OrdinalIgnoreCase)))
        {
            var sub = context.User.FindFirst("sub")?.Value;
            if (Guid.TryParse(sub, out var userId) && await db.Users.AsNoTracking().AnyAsync(x => x.Id == userId && x.MustChangePassword, context.RequestAborted))
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/problem+json";
                await context.Response.WriteAsync(JsonSerializer.Serialize(new { title = "Cambio de contraseña requerido", status = 403, detail = "Cambiá tu contraseña temporal para continuar." }));
                return;
            }
        }
        await next(context);
    }
}

public sealed class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try { await next(context); }
        catch (KeyNotFoundException ex)
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            await WriteProblem(context, "No encontrado", 404, ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await WriteProblem(context, "No autorizado", 401, ex.Message);
        }
        catch (ArgumentException ex)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await WriteProblem(context, "Solicitud inválida", 400, ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            context.Response.StatusCode = StatusCodes.Status409Conflict;
            await WriteProblem(context, "Operación no permitida", 409, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception for {Path}", context.Request.Path);
            if (context.Response.HasStarted) throw;
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await WriteProblem(context, "Error interno", 500, "Ocurrió un error inesperado. Si persiste, contactá a administración.");
        }
    }

    private static async Task WriteProblem(HttpContext context, string title, int status, string detail)
    {
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(new { type = "about:blank", title, status, detail }));
    }
}
