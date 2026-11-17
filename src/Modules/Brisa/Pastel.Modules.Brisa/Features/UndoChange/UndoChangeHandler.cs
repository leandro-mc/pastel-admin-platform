using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Brisa.Common;
using Pastel.Modules.Brisa.Persistence;
using Pastel.Platform.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Brisa.Features.UndoChange;

/// <summary>
/// «Deshacer» seguro (BR-19): restaura el estado exacto anterior tocando solo hecha, instante de cierre y eliminación lógica;
/// se rechaza con 409 si la tarea cambió después de la acción; es de un solo paso y de un solo uso.
/// </summary>
internal sealed class UndoChangeHandler(BrisaDbContext db, PersonContext people, IClock clock)
{
    public async Task<Result<TaskDto>> HandleAsync(Guid undoId, CancellationToken cancellationToken)
    {
        var person = await people.GetAsync(cancellationToken);
        if (person.IsFailure)
        {
            return person.Error;
        }

        var me = person.Value;

        // Transacción serializable: dos «Deshacer» simultáneos no pueden aplicarse ambos.
        return await TransactionRunner.RunSerializableAsync(db, token => ApplyAsync(me, undoId, token), cancellationToken);
    }

    private async Task<Result<TaskDto>> ApplyAsync(Person me, Guid undoId, CancellationToken cancellationToken)
    {
        var undo = await db.TaskUndos.FirstOrDefaultAsync(u => u.Id == undoId && u.OwnerId == me.UserId, cancellationToken);
        if (undo is null)
        {
            return BrisaErrors.UndoNotFound;
        }

        if (undo.UsedAt is not null)
        {
            return BrisaErrors.UndoUsed;
        }

        // Incluye eliminadas: restaurar una eliminación es el caso de uso.
        var task = await db.Tasks.FirstOrDefaultAsync(t => t.OwnerId == me.UserId && t.Id == undo.TaskId, cancellationToken);
        if (task is null)
        {
            return BrisaErrors.UndoNotFound;
        }

        if (task.UpdatedAt != undo.AfterUpdatedAt)
        {
            return BrisaErrors.UndoStale;
        }

        var now = clock.UtcNow;
        task.IsCompleted = undo.BeforeCompleted;
        task.CompletedAt = undo.BeforeCompletedAt;
        task.DeletedAt = undo.BeforeDeletedAt;
        task.UpdatedAt = now;
        undo.UsedAt = now;

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return BrisaErrors.UndoStale;
        }

        return task.ToDto(me.Today, me.Zone);
    }
}
