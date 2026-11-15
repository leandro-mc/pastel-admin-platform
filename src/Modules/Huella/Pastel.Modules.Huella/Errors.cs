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

    public static Error Invalid(IReadOnlyDictionary<string, string[]> details) =>
        Error.Validation("huella.input.invalid", "Revise los campos marcados.", details);

    public static Error LineRejected(string reason) =>
        Error.Validation("huella.cv.line_rejected", reason, new Dictionary<string, string[]> { ["text"] = [reason] });
}
