namespace Pastel.SharedKernel;

/// <summary>Clasificación de un fallo esperable. Determina el estado HTTP y el nivel de registro.</summary>
public enum ErrorType
{
    Validation,
    Unauthorized,
    Forbidden,
    NotFound,
    Conflict,
    TooManyRequests,
    Unavailable,
    Unexpected,
}

/// <summary>
/// Fallo esperable de una operación. <see cref="Code"/> es estable (formato <c>modulo.recurso.motivo</c>);
/// <see cref="Message"/> es texto en español de Costa Rica, sin tecnicismos y con la acción posible.
/// </summary>
public sealed record Error(
    string Code,
    ErrorType Type,
    string Message,
    IReadOnlyDictionary<string, string[]>? Details = null)
{
    /// <summary>Segundos sugeridos de espera (cabecera <c>Retry-After</c>) cuando el error es de tipo <see cref="ErrorType.TooManyRequests"/> o <see cref="ErrorType.Unavailable"/>.</summary>
    public int? RetryAfterSeconds { get; init; }

    public static Error Validation(string code, string message, IReadOnlyDictionary<string, string[]>? details = null) =>
        new(code, ErrorType.Validation, message, details);

    public static Error Unauthorized(string code, string message) => new(code, ErrorType.Unauthorized, message);

    public static Error Forbidden(string code, string message) => new(code, ErrorType.Forbidden, message);

    public static Error NotFound(string code, string message) => new(code, ErrorType.NotFound, message);

    public static Error Conflict(string code, string message, IReadOnlyDictionary<string, string[]>? details = null) =>
        new(code, ErrorType.Conflict, message, details);

    public static Error TooManyRequests(string code, string message, int? retryAfterSeconds = null) =>
        new(code, ErrorType.TooManyRequests, message) { RetryAfterSeconds = retryAfterSeconds };

    public static Error Unavailable(string code, string message, int? retryAfterSeconds = null) =>
        new(code, ErrorType.Unavailable, message) { RetryAfterSeconds = retryAfterSeconds };

    public static Error Unexpected(string code, string message) => new(code, ErrorType.Unexpected, message);
}
