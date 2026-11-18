using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Brisa.Common;
using Pastel.Modules.Brisa.Domain;
using Pastel.Modules.Brisa.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Brisa.Features.UpdateTask;

internal sealed class UpdateTaskHandler(BrisaDbContext db, PersonContext people, IClock clock)
{
    public async Task<Result<TaskDto>> HandleAsync(Guid id, TaskWriteRequest request, CancellationToken cancellationToken)
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

        if (!uint.TryParse(request.Version, NumberStyles.None, CultureInfo.InvariantCulture, out var version))
        {
            return BrisaErrors.VersionRequired;
        }

        // Se valida el día elegido (el que llega), no el efectivo que muestra el editor (§13.2).
        var draft = TaskRules.Validate(request.Title, request.Notes, request.ScheduledDate, request.DueDate, request.ColorHex);
        if (draft.IsFailure)
        {
            return draft.Error;
        }

        if (!TaskPriorities.TryParse(request.Priority, out var priority))
        {
            return BrisaErrors.PriorityInvalid;
        }

        var data = draft.Value;
        db.Entry(task).Property(t => t.Version).OriginalValue = version;
        task.Title = data.Title;
        task.Notes = data.Notes;
        task.ScheduledDate = data.ScheduledDate;
        task.DueDate = data.DueDate;
        task.Priority = string.IsNullOrWhiteSpace(request.Priority) ? task.Priority : priority;
        task.ColorHex = data.ColorHex ?? task.ColorHex;
        task.UpdatedAt = clock.UtcNow;

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return BrisaErrors.TaskChanged;
        }

        return task.ToDto(me.Today, me.Zone);
    }
}
