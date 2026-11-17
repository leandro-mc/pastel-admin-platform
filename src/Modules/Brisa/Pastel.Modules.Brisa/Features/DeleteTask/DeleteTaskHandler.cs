using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Brisa.Common;
using Pastel.Modules.Brisa.Domain;
using Pastel.Modules.Brisa.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Brisa.Features.DeleteTask;

/// <summary>Elimina de forma lógica (<c>DeletedAt</c>): la tarea deja de verse y se puede restaurar con «Deshacer».</summary>
internal sealed class DeleteTaskHandler(BrisaDbContext db, PersonContext people, IClock clock)
{
    public async Task<Result<TaskDeletedResponse>> HandleAsync(Guid id, CancellationToken cancellationToken)
    {
        var person = await people.GetAsync(cancellationToken);
        if (person.IsFailure)
        {
            return person.Error;
        }

        var me = person.Value;
        var task = await db.Tasks.FirstOrDefaultAsync(t => t.OwnerId == me.UserId && t.Id == id && t.DeletedAt == null, cancellationToken);
        if (task is null)
        {
            return BrisaErrors.TaskNotFound;
        }

        var now = clock.UtcNow;
        var undo = new TaskUndo
        {
            OwnerId = me.UserId,
            TaskId = task.Id,
            Kind = TaskUndo.KindDelete,
            BeforeCompleted = task.IsCompleted,
            BeforeCompletedAt = task.CompletedAt,
            BeforeDeletedAt = task.DeletedAt,
            AfterUpdatedAt = now,
            CreatedAt = now,
        };

        task.DeletedAt = now;
        task.UpdatedAt = now;

        db.TaskUndos.Add(undo);
        await UndoPruning.PruneAsync(db, me.UserId, now, cancellationToken);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return BrisaErrors.TaskChanged;
        }

        return new TaskDeletedResponse(task.Id, undo.Id);
    }
}
