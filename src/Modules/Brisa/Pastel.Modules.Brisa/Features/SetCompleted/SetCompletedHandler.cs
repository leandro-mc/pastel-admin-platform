using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Brisa.Common;
using Pastel.Modules.Brisa.Domain;
using Pastel.Modules.Brisa.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Brisa.Features.SetCompleted;

/// <summary>Marca o reabre una tarea. <c>CompletedAt</c> lo asigna el servidor y vuelve a nulo al reabrir (BR-11).</summary>
internal sealed class SetCompletedHandler(BrisaDbContext db, PersonContext people, IClock clock)
{
    public async Task<Result<TaskChangeResponse>> HandleAsync(Guid id, bool completed, CancellationToken cancellationToken)
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

        // Pedir el estado en que ya está no cambia nada (un doble toque no deja un «Deshacer» sin efecto).
        if (task.IsCompleted == completed)
        {
            return new TaskChangeResponse(task.ToDto(me.Today, me.Zone), null);
        }

        var now = clock.UtcNow;
        var undo = new TaskUndo
        {
            OwnerId = me.UserId,
            TaskId = task.Id,
            Kind = TaskUndo.KindToggle,
            BeforeCompleted = task.IsCompleted,
            BeforeCompletedAt = task.CompletedAt,
            BeforeDeletedAt = task.DeletedAt,
            AfterUpdatedAt = now,
            CreatedAt = now,
        };

        task.IsCompleted = completed;
        task.CompletedAt = completed ? now : null;
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

        return new TaskChangeResponse(task.ToDto(me.Today, me.Zone), undo.Id);
    }
}
