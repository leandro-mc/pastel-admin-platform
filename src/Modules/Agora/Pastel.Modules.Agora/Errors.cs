using Pastel.SharedKernel;

namespace Pastel.Modules.Agora;

/// <summary>
/// Códigos de error de Ágora: <c>agora.&lt;recurso&gt;.&lt;motivo&gt;</c>, mensajes en español de Costa Rica (trato de usted).
/// Cada código nuevo también se documenta en <c>MODULE.md</c> (ver <c>docs/ERROR_HANDLING_AND_LOGGING.md</c>).
/// </summary>
internal static class AgoraErrors
{
    public static readonly Error NotFound = Error.NotFound("agora.resource.not_found", "No encontramos lo que busca.");

    public static readonly Error ArticleNotFound = Error.NotFound("agora.article.not_found", "No encontramos esa pieza.");
    public static readonly Error CategoryNotFound = Error.NotFound("agora.category.not_found", "No encontramos esa categoría.");
    public static readonly Error SeriesNotFound = Error.NotFound("agora.series.not_found", "No encontramos esa serie.");
    public static readonly Error NewsNotFound = Error.NotFound("agora.news.not_found", "No encontramos ese enlace de actualidad.");
    public static readonly Error ReportNotFound = Error.NotFound("agora.error_report.not_found", "No encontramos ese aviso.");
    public static readonly Error VerificationNotFound = Error.NotFound("agora.verification.not_found", "No encontramos esa verificación.");

    public static readonly Error SelfVerification = Error.Forbidden(
        "agora.verification.self",
        "Usted escribió o editó esta pieza, así que no puede verificarla. La verificación la hace otra persona revisora.");

    public static readonly Error VerificationNotPublished = Error.Conflict(
        "agora.verification.not_published", "Solo se pueden verificar piezas publicadas.");

    public static readonly Error VerificationDuplicate = Error.Conflict(
        "agora.verification.duplicate", "Usted ya verificó esta versión de la pieza.");

    public static readonly Error VerificationAlreadyWithdrawn = Error.Conflict(
        "agora.verification.already_withdrawn", "Esa verificación ya estaba retirada.");

    public static readonly Error ArticleInvalidState = Error.Conflict(
        "agora.article.invalid_state", "La pieza no está en un estado que permita esta acción.");

    public static readonly Error DailyPickLimit = Error.Conflict(
        "agora.daily_pick.limit", "«Hoy en 5 minutos» admite hasta 5 piezas. Quite una antes de agregar otra.");

    public static readonly Error DailyPickNotPublished = Error.Conflict(
        "agora.daily_pick.not_published", "Solo las piezas publicadas pueden estar en «Hoy en 5 minutos».");

    public static readonly Error TaxonomyNameTaken = Error.Conflict(
        "agora.taxonomy.name_taken", "Ya existe un elemento con ese nombre. Use otro nombre.");

    public static readonly Error ShareCardUnavailable = Error.NotFound(
        "agora.share_card.unavailable", "La tarjeta para compartir todavía no está disponible.");
}
