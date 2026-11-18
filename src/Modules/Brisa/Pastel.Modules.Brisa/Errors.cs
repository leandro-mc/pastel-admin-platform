using Pastel.SharedKernel;

namespace Pastel.Modules.Brisa;

/// <summary>
/// Códigos de error de Brisa: <c>brisa.&lt;recurso&gt;.&lt;motivo&gt;</c>. Los mensajes van en español de Costa Rica con <b>tuteo</b>,
/// cálido y sin culpa: es la regla propia del módulo (<c>docs/modules/BRISA.md</c> §7), que prevalece sobre el trato de usted
/// de la plataforma. Cada código nuevo también se documenta en <c>MODULE.md</c> (ver <c>docs/ERROR_HANDLING_AND_LOGGING.md</c>).
/// </summary>
internal static class BrisaErrors
{
    public const string TitleRequiredCode = "brisa.task.title_required";
    public const string TitleTooLongCode = "brisa.task.title_too_long";
    public const string NotesTooLongCode = "brisa.task.notes_too_long";
    public const string DateInvalidCode = "brisa.task.date_invalid";
    public const string DueInvalidCode = "brisa.task.due_invalid";
    public const string DayAfterDeadlineCode = "brisa.task.day_after_deadline";
    public const string ColorInvalidCode = "brisa.task.color_invalid";

    public const string DayAfterDeadlineMessage =
        "El día de la tarea no puede ser después de su fecha límite. Cambia la fecha límite si necesitas más tiempo.";

    public static readonly Error NotFound = Error.NotFound("brisa.resource.not_found", "No encontramos lo que buscas.");

    public static readonly Error TaskNotFound = Error.NotFound(
        "brisa.task.not_found", "No encontramos esa tarea. Puede que ya no esté disponible.");

    public static readonly Error TaskChanged = Error.Conflict(
        "brisa.task.changed", "Esta tarea cambió mientras la editabas. Recarga para ver la versión más reciente y vuelve a intentarlo.");

    public static readonly Error VersionRequired = Error.Validation(
        "brisa.task.version_required", "No pudimos saber qué versión de la tarea estabas editando. Recárgala e inténtalo de nuevo.");

    public static readonly Error PriorityInvalid = Error.Validation(
        "brisa.task.priority_invalid", "Elige una prioridad válida: baja, media o alta.");

    public static readonly Error UndoNotFound = Error.NotFound(
        "brisa.undo.not_found", "La tarea ya no está disponible.");

    public static readonly Error UndoUsed = Error.Conflict(
        "brisa.undo.used", "Ese cambio ya se deshizo.");

    public static readonly Error UndoStale = Error.Conflict(
        "brisa.undo.stale", "No se pudo deshacer porque la tarea cambió después. Revisa su estado y repite el cambio si lo necesitas.");

    public static readonly Error ImportNotFound = Error.NotFound(
        "brisa.import.not_found", "No encontramos esa importación.");

    public static readonly Error ImportAlreadyReverted = Error.Conflict(
        "brisa.import.already_reverted", "Esa importación ya se revirtió.");

    public static readonly Error TimeZoneInvalid = Error.Validation(
        "brisa.settings.timezone_invalid", "Esa zona horaria no es válida. Elige una de la lista.");
}
