namespace Pastel.Modules.Brisa.Domain;

/// <summary>
/// Estado anterior de una acción deshacible (marcar/reabrir o eliminar), guardado en el servidor para que la reversión sea
/// segura: restaura el estado exacto (sin recalcular <c>CompletedAt</c>), toca solo esos tres campos, se rechaza si la tarea
/// cambió después (<see cref="AfterUpdatedAt"/>) y es de un solo uso (<see cref="UsedAt"/>). BR-19.
/// </summary>
internal sealed class TaskUndo
{
    public const string KindToggle = "toggle";
    public const string KindDelete = "delete";

    public Guid Id { get; set; } = Guid.CreateVersion7();

    public Guid OwnerId { get; set; }

    public Guid TaskId { get; set; }

    public required string Kind { get; set; }

    public bool BeforeCompleted { get; set; }

    public DateTimeOffset? BeforeCompletedAt { get; set; }

    public DateTimeOffset? BeforeDeletedAt { get; set; }

    /// <summary>Valor de <c>UpdatedAt</c> de la tarea justo después de la acción; si cambió, la tarea se modificó y no se revierte.</summary>
    public DateTimeOffset AfterUpdatedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? UsedAt { get; set; }
}
