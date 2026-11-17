using Pastel.Modules.Brisa.Domain;

namespace Pastel.Modules.Brisa.Common;

/// <summary>
/// Cuerpo de crear (<c>POST</c>) y modificar (<c>PUT</c>, reemplazo completo) una tarea. Las fechas son <c>aaaa-mm-dd</c> sin zona.
/// <see cref="Version"/> es obligatoria al modificar: es la versión que la persona estaba editando.
/// </summary>
internal sealed record TaskWriteRequest(
    string? Title, string? Notes, string? ScheduledDate, string? DueDate, string? Priority, string? ColorHex, string? Version);

/// <summary>
/// Tarea tal como la ve la persona. <see cref="EffectiveDate"/> es el día efectivo calculado en el servidor con la zona de la
/// persona (inventario §13.1); <see cref="ScheduledDate"/> es lo que ella eligió y nunca se reescribe.
/// </summary>
internal sealed record TaskDto(
    Guid Id,
    string Title,
    string Notes,
    string ScheduledDate,
    string? DueDate,
    string EffectiveDate,
    string Priority,
    string ColorHex,
    bool Completed,
    DateTimeOffset? CompletedAt,
    bool IsOverdue,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? DeletedAt,
    string Version);

/// <summary>Resultado de marcar/reabrir: la tarea y, si hubo cambio, el identificador para deshacerlo.</summary>
internal sealed record TaskChangeResponse(TaskDto Task, Guid? UndoId);

/// <summary>Resultado de eliminar: el identificador para deshacerlo.</summary>
internal sealed record TaskDeletedResponse(Guid TaskId, Guid UndoId);

internal sealed record SetCompletedRequest(bool Completed);

internal static class TaskMapping
{
    public static TaskDto ToDto(this BrisaTask task, DateOnly today, TimeZoneInfo zone) => new(
        task.Id,
        task.Title,
        task.Notes,
        TaskRules.FormatDate(task.ScheduledDate),
        task.DueDate is { } due ? TaskRules.FormatDate(due) : null,
        TaskRules.FormatDate(TaskRules.EffectiveDate(task.Dates, today, zone)),
        TaskPriorities.ToWire(task.Priority),
        task.ColorHex,
        task.IsCompleted,
        task.CompletedAt,
        task.DeletedAt is null && TaskRules.IsOverdue(task.Dates, today, zone),
        task.CreatedAt,
        task.UpdatedAt,
        task.DeletedAt,
        task.Version.ToString(System.Globalization.CultureInfo.InvariantCulture));
}
