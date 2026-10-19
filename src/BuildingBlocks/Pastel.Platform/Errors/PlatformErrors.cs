using Pastel.SharedKernel;

namespace Pastel.Platform.Errors;

/// <summary>Códigos de error transversales (<c>platform.*</c>) y sus mensajes en español de Costa Rica.</summary>
public static class PlatformErrors
{
    public static readonly Error ValidationFailed = Error.Validation(
        "platform.validation_failed", "Revise los datos e intente de nuevo.");

    public static readonly Error Unauthorized = Error.Unauthorized(
        "platform.unauthorized", "Debe iniciar sesión para continuar.");

    public static readonly Error Forbidden = Error.Forbidden(
        "platform.forbidden", "No tiene acceso a esta acción.");

    public static readonly Error CsrfInvalid = Error.Forbidden(
        "platform.csrf_invalid", "No se pudo validar la solicitud. Recargue la página e intente de nuevo.");

    public static readonly Error PasswordChangeRequired = Error.Forbidden(
        "platform.password_change_required", "Debe cambiar su contraseña temporal para continuar.");

    public static readonly Error NotFound = Error.NotFound(
        "platform.not_found", "No encontramos lo que busca.");

    public static readonly Error ConcurrencyConflict = Error.Conflict(
        "platform.concurrency_conflict", "Este registro cambió mientras lo editaba. Recargue para ver la versión más reciente.");

    public static readonly Error Duplicate = Error.Conflict(
        "platform.duplicate", "Ya existe un registro con esos datos.");

    public static Error RateLimited(int retryAfterSeconds = 60) => Error.TooManyRequests(
        "platform.rate_limited", "Hubo demasiados intentos. Espere un momento e intente de nuevo.", retryAfterSeconds);

    public static Error Unavailable(int retryAfterSeconds = 5) => Error.Unavailable(
        "platform.unavailable", "El servicio no está disponible por el momento. Intente de nuevo en unos segundos.", retryAfterSeconds);

    public static readonly Error Unexpected = Error.Unexpected(
        "platform.unexpected", "Ocurrió un error inesperado. Intente de nuevo; si continúa, comuníquese con administración e indique el código de soporte.");
}
