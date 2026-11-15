using Pastel.SharedKernel;

namespace Pastel.Modules.Huella;

/// <summary>
/// Códigos de error de Huella: <c>huella.&lt;recurso&gt;.&lt;motivo&gt;</c>, mensajes en español de Costa Rica (trato de usted).
/// Cada código nuevo también se documenta en <c>MODULE.md</c> (ver <c>docs/ERROR_HANDLING_AND_LOGGING.md</c>).
/// </summary>
internal static class HuellaErrors
{
    public static readonly Error NotFound = Error.NotFound("huella.resource.not_found", "No encontramos lo que busca.");

    /// <summary>Respuesta única del perfil público: token ausente, mal formado, revocado o perfil sin publicar. No distingue el motivo.</summary>
    public static readonly Error PublicProfileUnavailable = Error.NotFound(
        "huella.public.not_found", "Este enlace no está disponible. Pida uno nuevo a quien se lo compartió.");

    public static readonly Error SessionRequired = Error.Unauthorized(
        "huella.session.required", "Debe iniciar sesión para continuar.");

    public static readonly Error NothingToPublish = Error.Validation(
        "huella.publication.empty", "Escriba al menos su nombre y su titular antes de publicar.");

    public static readonly Error PublicCvMissing = Error.NotFound(
        "huella.cv.not_public", "Esta publicación no incluye un CV para descargar.");

    public static readonly Error RendererUnavailable = Error.Unavailable(
        "huella.cv.renderer_unavailable",
        "La generación de PDF todavía no está disponible en este servidor. Mientras tanto puede copiar el texto del CV.",
        60);

    public static readonly Error CvRequiresAchievements = Error.Validation(
        "huella.cv.empty_bank", "Su banco aún no tiene logros. Cuente al menos una experiencia y confirme sus logros antes de generar un CV.");

    public static readonly Error AiResultInvalid = Error.Validation(
        "huella.ai.invalid_json", "La respuesta pegada no es un JSON válido para esta tarea. Copie solo el bloque JSON que devolvió el asistente.");

    // ───────── IA automática (proveedor con la clave del propietario) ─────────
    public static readonly Error AiNotConfigured = Error.Conflict(
        "huella.ai.not_configured", "Aún no ha configurado un proveedor de IA. Abra «Configurar IA», elija el proveedor, pegue su clave y elija el modelo.");

    public static readonly Error AiKeyUnreadable = Error.Conflict(
        "huella.ai.key_unreadable", "La clave guardada ya no se puede leer (cambió el secreto del servidor). Ingrésela de nuevo en «Configurar IA».");

    public static readonly Error AiKeyRejected = Error.Validation(
        "huella.ai.key_rejected", "El proveedor rechazó la clave. Revise que esté completa y vigente.");

    public static readonly Error AiKeyOrModelRejected = Error.Validation(
        "huella.ai.key_or_model_rejected", "Gemini rechazó la solicitud: revise que la clave sea válida y que el modelo exista para su cuenta.");

    public static readonly Error AiModelNotFound = Error.Validation(
        "huella.ai.model_not_found", "El modelo elegido no existe o su cuenta no tiene acceso. Cargue la lista de modelos y elija otro.");

    public static readonly Error AiQuota = Error.TooManyRequests(
        "huella.ai.quota", "El proveedor indicó que se alcanzó el límite de uso o de saldo de su cuenta. Espere un momento o revise su plan.", 60);

    public static readonly Error AiRequestRejected = Error.Validation(
        "huella.ai.request_rejected", "El proveedor rechazó la solicitud. Pruebe con otro modelo o use la opción de IA externa.");

    public static readonly Error AiUnreachable = Error.Unavailable(
        "huella.ai.unreachable", "No se pudo contactar al proveedor de IA. Intente de nuevo en un momento.", 30);

    public static readonly Error AiTimeout = Error.Unavailable(
        "huella.ai.timeout", "El proveedor de IA tardó demasiado en responder. Intente de nuevo o elija un modelo más rápido.", 30);

    public static readonly Error AiBadResponse = Error.Unavailable(
        "huella.ai.bad_response", "El proveedor de IA devolvió una respuesta que no se pudo leer. Intente de nuevo.", 10);

    public static readonly Error AiEmptyResponse = Error.Unavailable(
        "huella.ai.empty_response", "El proveedor de IA no devolvió contenido (puede haberlo bloqueado su filtro). Intente de nuevo o use otro modelo.", 10);

    public static readonly Error AiProviderInvalidJson = Error.Validation(
        "huella.ai.provider_invalid_json", "La IA respondió con algo que no es el JSON esperado. Intente de nuevo; no se cambió nada.");

    public static Error Invalid(IReadOnlyDictionary<string, string[]> details) =>
        Error.Validation("huella.input.invalid", "Revise los campos marcados.", details);

    public static Error LineRejected(string reason) =>
        Error.Validation("huella.cv.line_rejected", reason, new Dictionary<string, string[]> { ["text"] = [reason] });
}
