using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Brisa.Common;
using Pastel.Modules.Brisa.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Brisa.Features.ListTasks;

internal sealed class ListTasksHandler(BrisaDbContext db, PersonContext people)
{
    public async Task<Result<PagedResult<TaskDto>>> HandleAsync(ListTasksQuery query, CancellationToken cancellationToken)
    {
        var person = await people.GetAsync(cancellationToken);
        if (person.IsFailure)
        {
            return person.Error;
        }

        var me = person.Value;
        var page = PageRequest.Normalize(query.Page, query.PageSize);

        // Solo tareas de la persona. Sin updatedSince: las no eliminadas. Con él: lo que cambió desde entonces, incluidas las eliminadas.
        var tasks = db.Tasks.AsNoTracking().Where(t => t.OwnerId == me.UserId);
        tasks = query.UpdatedSince is { } since
            ? tasks.Where(t => t.UpdatedAt > since)
            : tasks.Where(t => t.DeletedAt == null);

        var total = await tasks.CountAsync(cancellationToken);
        var rows = await tasks
            .OrderBy(t => t.UpdatedAt).ThenBy(t => t.Id)
            .Skip(page.Skip).Take(page.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<TaskDto>(rows.Select(t => t.ToDto(me.Today, me.Zone)).ToList(), page.Page, page.PageSize, total);
    }
}
