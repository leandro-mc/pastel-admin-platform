using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using Pastel.SharedKernel;

namespace Pastel.Modules.Brisa.Domain;

/// <summary>Fechas de una tarea que intervienen en la regla del día efectivo.</summary>
internal readonly record struct TaskDates(DateOnly Scheduled, DateOnly? Due, bool Completed, DateTimeOffset? CompletedAt);

/// <summary>Datos de una tarea ya recortados y validados.</summary>
internal sealed record TaskDraft(string Title, string Notes, DateOnly ScheduledDate, DateOnly? DueDate, string? ColorHex);

/// <summary>
/// Reglas puras de fechas y validación de Brisa. Es el port de <c>docs/requirements/brisa/prototype/logic.js</c>
/// (inventario §13.1–§13.4): reprogramación diaria <b>derivada</b> (el día asignado no se reescribe; se calcula el
/// «día efectivo»), dos criterios de «Vencida» y validación día ≤ fecha límite. «Hoy» sale siempre de la zona de la
/// persona, nunca de la del servidor ni de la del navegador.
/// </summary>
internal static class TaskRules
{
    public const int TitleMaxLength = 150;
    public const int NotesMaxLength = 2000;
    public const string DefaultTimeZoneId = "America/Costa_Rica";
    public const string DefaultColorHex = "#DDE8D5";

    private const string DateFormat = "yyyy-MM-dd";

    /// <summary>Resuelve un identificador de zona. Falso si está vacío o no existe.</summary>
    public static bool TryResolveZone(string? id, [NotNullWhen(true)] out TimeZoneInfo? zone)
    {
        zone = null;
        return !string.IsNullOrWhiteSpace(id) && TimeZoneInfo.TryFindSystemTimeZoneById(id, out zone);
    }

    /// <summary>Fecha de calendario del instante indicado en la zona de la persona (p. ej. «hoy» o el día de <c>CompletedAt</c>).</summary>
    public static DateOnly LocalDate(DateTimeOffset instant, TimeZoneInfo zone) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instant, zone).DateTime);

    /// <summary>Fecha estricta <c>aaaa-mm-dd</c>. Cualquier otra forma es inválida.</summary>
    public static bool TryParseDate(string? value, out DateOnly date) =>
        DateOnly.TryParseExact(value, DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out date);

    public static string FormatDate(DateOnly date) => date.ToString(DateFormat, CultureInfo.InvariantCulture);

    /// <summary>
    /// Día efectivo (§13.1). Abierta: la referencia es hoy. Hecha: el día local de <c>CompletedAt</c>; si es desconocido, se queda en su día asignado.
    /// Sin fecha límite nunca se mueve. Un dato inconsistente (límite anterior al día) se devuelve sin error.
    /// </summary>
    public static DateOnly EffectiveDate(TaskDates task, DateOnly today, TimeZoneInfo zone)
    {
        DateOnly reference;
        if (task.Completed)
        {
            if (task.CompletedAt is not { } completedAt)
            {
                return task.Scheduled;
            }

            reference = LocalDate(completedAt, zone);
        }
        else
        {
            reference = today;
        }

        if (task.Due is not { } due)
        {
            return task.Scheduled;
        }

        if (task.Scheduled >= reference)
        {
            return task.Scheduled;
        }

        if (due >= reference)
        {
            return reference;
        }

        return task.Scheduled > due ? task.Scheduled : due;
    }

    /// <summary>
    /// «Vencida» (§13.2, dos criterios): abierta y, con fecha límite, esa fecha ya pasó; sin fecha límite, su día efectivo ya pasó.
    /// </summary>
    public static bool IsOverdue(TaskDates task, DateOnly today, TimeZoneInfo zone)
    {
        if (task.Completed)
        {
            return false;
        }

        return task.Due is { } due ? due < today : EffectiveDate(task, today, zone) < today;
    }

    /// <summary>
    /// Validación bloqueante al crear, modificar e importar (§13.2 y §13.4). Se compara el día elegido (o el guardado),
    /// no el efectivo. Título y notas se cuentan tras recortar; nada se trunca en silencio.
    /// </summary>
    public static Result<TaskDraft> Validate(string? title, string? notes, string? scheduledDate, string? dueDate, string? colorHex)
    {
        var cleanTitle = (title ?? string.Empty).Trim();
        var cleanNotes = (notes ?? string.Empty).Trim();
        var problems = new List<(string Field, string Code, string Message)>();

        if (cleanTitle.Length == 0)
        {
            problems.Add(("title", BrisaErrors.TitleRequiredCode, "Escribe un título para guardar la tarea."));
        }
        else if (cleanTitle.Length > TitleMaxLength)
        {
            problems.Add(("title", BrisaErrors.TitleTooLongCode, "El título admite hasta 150 caracteres."));
        }

        if (cleanNotes.Length > NotesMaxLength)
        {
            problems.Add(("notes", BrisaErrors.NotesTooLongCode, "Las notas admiten hasta 2000 caracteres."));
        }

        var hasDay = TryParseDate(scheduledDate, out var day);
        if (!hasDay)
        {
            problems.Add(("scheduledDate", BrisaErrors.DateInvalidCode, "Elige un día válido."));
        }

        var hasDue = TryParseDate(dueDate, out var due);
        if (!string.IsNullOrWhiteSpace(dueDate) && !hasDue)
        {
            problems.Add(("dueDate", BrisaErrors.DueInvalidCode, "Elige una fecha límite válida."));
        }

        if (hasDay && hasDue && day > due)
        {
            problems.Add(("dueDate", BrisaErrors.DayAfterDeadlineCode, BrisaErrors.DayAfterDeadlineMessage));
        }

        var color = string.IsNullOrWhiteSpace(colorHex) ? null : colorHex.Trim();
        if (color is not null && !IsHexColor(color))
        {
            problems.Add(("colorHex", BrisaErrors.ColorInvalidCode, "El color debe tener formato #RRGGBB."));
        }

        if (problems.Count > 0)
        {
            var details = problems
                .GroupBy(p => p.Field, StringComparer.Ordinal)
                .ToDictionary(g => g.Key, g => g.Select(p => p.Message).ToArray(), StringComparer.Ordinal);
            return Error.Validation(problems[0].Code, problems[0].Message, details);
        }

        return new TaskDraft(cleanTitle, cleanNotes, day, hasDue ? due : null, color);
    }

    private static bool IsHexColor(string value) =>
        value.Length == 7 && value[0] == '#' && value.Skip(1).All(Uri.IsHexDigit);
}
