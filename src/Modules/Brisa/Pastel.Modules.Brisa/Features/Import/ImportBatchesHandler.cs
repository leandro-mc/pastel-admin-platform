using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Brisa.Common;
using Pastel.Modules.Brisa.Persistence;
using Pastel.Platform.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Brisa.Features.Import;

/// <summary>Lotes de importación de la persona y su reversión.</summary>
internal sealed class ImportBatchesHandler(BrisaDbContext db, PersonContext people, IClock clock)
{
    private const int RecentLimit = 10;

    public async Task<Result<IReadOnlyList<ImportBatchDto>>> ListAsync(CancellationToken cancellationToken)
    {
        var person = await people.GetAsync(cancellationToken);
        if (person.IsFailure)
        {
            return person.Error;
        }

        var me = person.Value;
        var batches = await db.ImportBatches.AsNoTracking()
            .Where(b => b.OwnerId == me.UserId)
            .OrderByDescending(b => b.CreatedAt)
            .Take(RecentLimit)
            .Select(b => new ImportBatchDto(b.Id, b.CreatedAt, b.TaskCount, b.RevertedAt))
            .ToListAsync(cancellationToken);
        return batches;
    }

    /// <summary>
    /// Revierte un lote con borrado lógico de lo creado. Solo quita las tareas que no se tocaron desde la importación
    /// (<c>UpdatedAt</c> igual al instante del lote); las editadas después se conservan y se informan.
    /// </summary>
    public async Task<Result<RevertResultDto>> RevertAsync(Guid batchId, CancellationToken cancellationToken)
    {
        var person = await people.GetAsync(cancellationToken);
        if (person.IsFailure)
        {
            return person.Error;
        }

        var me = person.Value;
        return await TransactionRunner.RunSerializableAsync(
            db, token => ApplyAsync(me, batchId, token), cancellationToken);
    }

    private async Task<Result<RevertResultDto>> ApplyAsync(Person me, Guid batchId, CancellationToken cancellationToken)
    {
        var batch = await db.ImportBatches.FirstOrDefaultAsync(b => b.Id == batchId && b.OwnerId == me.UserId, cancellationToken);
        if (batch is null)
        {
            return BrisaErrors.ImportNotFound;
        }

        if (batch.RevertedAt is not null)
        {
            return BrisaErrors.ImportAlreadyReverted;
        }

        var tasks = await db.Tasks
            .Where(t => t.OwnerId == me.UserId && t.ImportBatchId == batchId && t.DeletedAt == null)
            .ToListAsync(cancellationToken);

        var now = clock.UtcNow;
        int reverted = 0, kept = 0;
        foreach (var task in tasks)
        {
            if (task.UpdatedAt == batch.CreatedAt)
            {
                task.DeletedAt = now;
                task.UpdatedAt = now;
                reverted++;
            }
            else
            {
                kept++;
            }
        }

        batch.RevertedAt = now;
        await db.SaveChangesAsync(cancellationToken);
        return new RevertResultDto(reverted, kept);
    }
}
