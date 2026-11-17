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
}
