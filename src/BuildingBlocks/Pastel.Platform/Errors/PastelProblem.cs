using System.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Pastel.Platform.Observability;
using Pastel.SharedKernel;

namespace Pastel.Platform.Errors;

/// <summary>Traduce un <see cref="Error"/> a <c>application/problem+json</c> (RFC 9457) con <c>code</c> y <c>traceId</c>.</summary>
public static class PastelProblem
{
    public const string TraceHeader = "X-Trace-Id";

    /// <summary>
    /// Clave de <c>HttpContext.Items</c> para indicar que el llamador ya registró este rechazo (p. ej. con límite de frecuencia)
    /// y que <see cref="From"/> no debe volver a registrarlo en cada petición.
    /// </summary>
    public const string LogSuppressedItem = "pastel.problem.log-suppressed";

    public static string TraceId(HttpContext context) => Activity.Current?.TraceId.ToString() ?? context.TraceIdentifier;

    public static int StatusFor(ErrorType type) => type switch
    {
        ErrorType.Validation => StatusCodes.Status400BadRequest,
        ErrorType.Unauthorized => StatusCodes.Status401Unauthorized,
        ErrorType.Forbidden => StatusCodes.Status403Forbidden,
        ErrorType.NotFound => StatusCodes.Status404NotFound,
        ErrorType.Conflict => StatusCodes.Status409Conflict,
        ErrorType.TooManyRequests => StatusCodes.Status429TooManyRequests,
        ErrorType.Unavailable => StatusCodes.Status503ServiceUnavailable,
        _ => StatusCodes.Status500InternalServerError,
    };

    public static string TitleFor(ErrorType type) => type switch
    {
        ErrorType.Validation => "Hay datos que corregir",
        ErrorType.Unauthorized => "Debe iniciar sesión",
        ErrorType.Forbidden => "No tiene acceso a esta acción",
        ErrorType.NotFound => "No encontramos lo que busca",
        ErrorType.Conflict => "No se pudo completar la operación",
        ErrorType.TooManyRequests => "Demasiados intentos",
        ErrorType.Unavailable => "Servicio no disponible por el momento",
        _ => "Ocurrió un error inesperado",
    };

    public static string TypeFor(ErrorType type) => "urn:pastel:error:" + type switch
    {
        ErrorType.Validation => "validation",
        ErrorType.Unauthorized => "unauthorized",
        ErrorType.Forbidden => "forbidden",
        ErrorType.NotFound => "not-found",
        ErrorType.Conflict => "conflict",
        ErrorType.TooManyRequests => "rate-limited",
        ErrorType.Unavailable => "unavailable",
        _ => "unexpected",
    };

    /// <summary>
    /// Construye la respuesta y deja el registro técnico según el tipo (ver <c>ERROR_HANDLING_AND_LOGGING.md</c> 2.2).
    /// Nunca incluye pila, SQL ni nombres de tablas.
    /// </summary>
    public static IResult From(Error error, HttpContext context, Exception? exception = null)
    {
        if (!context.Items.ContainsKey(LogSuppressedItem))
        {
            Log(error, context, exception);
        }

        var extensions = new Dictionary<string, object?>
        {
            ["code"] = error.Code,
            ["traceId"] = TraceId(context),
        };
        if (error.RetryAfterSeconds is { } retry)
        {
            context.Response.Headers.RetryAfter = retry.ToString(System.Globalization.CultureInfo.InvariantCulture);
        }

        var status = StatusFor(error.Type);
        var type = TypeFor(error.Type);
        var title = TitleFor(error.Type);
        return error.Details is { Count: > 0 }
            ? Results.ValidationProblem(
                error.Details.ToDictionary(x => x.Key, x => x.Value),
                detail: error.Message, statusCode: status, title: title, type: type, extensions: extensions)
            : Results.Problem(detail: error.Message, statusCode: status, title: title, type: type, extensions: extensions);
    }

    public static IResult ToHttpResult(this Result result, HttpContext context) =>
        result.IsFailure ? From(result.Error, context) : Results.NoContent();

    private static void Log(Error error, HttpContext context, Exception? exception)
    {
        var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("Pastel.Http");
        var path = context.Request.Path.Value;
        switch (error.Type)
        {
            case ErrorType.Validation or ErrorType.NotFound:
                logger.LogDebug("Respuesta {Status} {ErrorCode} en {Path}", StatusFor(error.Type), error.Code, path);
                break;
            case ErrorType.Unauthorized or ErrorType.Conflict:
                logger.LogInformation("Respuesta {Status} {ErrorCode} en {Path}", StatusFor(error.Type), error.Code, path);
                break;
            case ErrorType.Forbidden or ErrorType.TooManyRequests:
                logger.LogWarning(PastelEventIds.RequestRejected, "Respuesta {Status} {ErrorCode} en {Path}", StatusFor(error.Type), error.Code, path);
                break;
            default:
                logger.LogError(PastelEventIds.UnhandledError, exception, "Fallo {Status} {ErrorCode} en {Method} {Path}", StatusFor(error.Type), error.Code, context.Request.Method, path);
                break;
        }
    }
}
