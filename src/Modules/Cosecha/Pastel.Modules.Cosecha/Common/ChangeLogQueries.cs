using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Cosecha.Persistence;

namespace Pastel.Modules.Cosecha.Common;

internal sealed record ChangeDto(string EntityType, Guid EntityId, string Field, string? OldValue, string? NewValue, string? Note, string? ChangedByName, DateTimeOffset ChangedAt);

internal static class ChangeLogQueries
{
    /// <summary>Cambios más recientes de uno o varios registros de un tipo, del más nuevo al más antiguo.</summary>
    public static async Task<IReadOnlyList<ChangeDto>> RecentChangesAsync(
        this CosechaDbContext db, string entityType, IEnumerable<Guid> entityIds, int take, CancellationToken ct)
    {
        var ids = entityIds.ToArray();
        var entries = await db.ChangeLog.AsNoTracking()
            .Where(c => c.EntityType == entityType && ids.Contains(c.EntityId))
            .OrderByDescending(c => c.ChangedAt).ThenByDescending(c => c.Id)
            .Take(take)
            .ToListAsync(ct);
        return entries.Select(c => new ChangeDto(c.EntityType, c.EntityId, c.Field, c.OldValue, c.NewValue, c.Note, c.ChangedByName, c.ChangedAt)).ToList();
    }
}
