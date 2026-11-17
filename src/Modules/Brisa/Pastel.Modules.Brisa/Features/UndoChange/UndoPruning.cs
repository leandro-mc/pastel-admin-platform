using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Brisa.Persistence;

namespace Pastel.Modules.Brisa.Features;

/// <summary>Mantiene acotada la tabla de reversiones: las de más de un día de la persona ya no se pueden usar y se borran.</summary>
internal static class UndoPruning
{
    public static Task PruneAsync(BrisaDbContext db, Guid ownerId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var cutoff = now.AddDays(-1);
        return db.TaskUndos
            .Where(u => u.OwnerId == ownerId && u.CreatedAt < cutoff)
            .ExecuteDeleteAsync(cancellationToken);
    }
}
