using Pastel.Modules.Brisa.Common;
using Pastel.Modules.Brisa.Domain;
using Pastel.Modules.Brisa.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Brisa.Features.CreateTask;

internal sealed class CreateTaskHandler(BrisaDbContext db, PersonContext people, IClock clock)
{
    public async Task<Result<TaskDto>> HandleAsync(TaskWriteRequest request, CancellationToken cancellationToken)
    {
        var person = await people.GetAsync(cancellationToken);
        if (person.IsFailure)
        {
            return person.Error;
        }

        var me = person.Value;

        // Alta rápida: solo el título basta. Sin día, es hoy (en la zona de la persona).
        var day = string.IsNullOrWhiteSpace(request.ScheduledDate) ? TaskRules.FormatDate(me.Today) : request.ScheduledDate;
        var draft = TaskRules.Validate(request.Title, request.Notes, day, request.DueDate, request.ColorHex);
        if (draft.IsFailure)
        {
            return draft.Error;
        }

        if (!TaskPriorities.TryParse(request.Priority, out var priority))
        {
            return BrisaErrors.PriorityInvalid;
        }

        var data = draft.Value;
        var now = clock.UtcNow;
        var task = new BrisaTask
        {
            OwnerId = me.UserId,
            Title = data.Title,
            Notes = data.Notes,
            ScheduledDate = data.ScheduledDate,
            DueDate = data.DueDate,
            Priority = priority,
            ColorHex = data.ColorHex ?? TaskPalette.Pick(),
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.Tasks.Add(task);
        await db.SaveChangesAsync(cancellationToken);
        return task.ToDto(me.Today, me.Zone);
    }
}
