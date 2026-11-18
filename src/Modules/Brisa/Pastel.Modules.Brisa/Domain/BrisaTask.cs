namespace Pastel.Modules.Brisa.Domain;

/// <summary>
/// Pendiente de una persona. La clave es <c>(OwnerId, Id)</c>: toda consulta por identificador exige el dueño, así que un
/// identificador ajeno nunca se encuentra (404). <see cref="ScheduledDate"/> y <see cref="DueDate"/> son fechas sin zona;
/// el día efectivo no se guarda: se calcula (<see cref="TaskRules"/>).
/// </summary>
internal sealed class BrisaTask
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    public Guid OwnerId { get; set; }

    public required string Title { get; set; }

    public string Notes { get; set; } = string.Empty;

    /// <summary>Día asignado por la persona. Nunca lo reescribe el sistema.</summary>
    public DateOnly ScheduledDate { get; set; }

    public DateOnly? DueDate { get; set; }

    public TaskPriority Priority { get; set; } = TaskPriority.Medium;

    public required string ColorHex { get; set; }

    public bool IsCompleted { get; set; }

    /// <summary>La asigna el servidor al marcar como hecha; nula al reabrir y en datos importados (se desconoce).</summary>
    public DateTimeOffset? CompletedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>Borrado lógico (preparado para sincronización y para «Deshacer»).</summary>
    public DateTimeOffset? DeletedAt { get; set; }

    /// <summary>Lote de importación que creó la tarea, para poder revertirlo.</summary>
    public Guid? ImportBatchId { get; set; }

    /// <summary>Token de concurrencia (<c>xmin</c> de PostgreSQL).</summary>
    public uint Version { get; set; }

    public TaskDates Dates => new(ScheduledDate, DueDate, IsCompleted, CompletedAt);
}
