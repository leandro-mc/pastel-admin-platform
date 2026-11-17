using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Brisa.Common;
using Pastel.Modules.Brisa.Domain;
using Pastel.Modules.Brisa.Persistence;
using Pastel.Platform.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Brisa.Features.Import;

/// <summary>
/// Importa tareas (vista previa o definitivo). Todo o nada; sin duplicar por <c>(OwnerId, Id)</c>: un id que ya existe con
/// contenido igual no cambia nada y con contenido distinto se omite y se informa, nunca se sobrescribe. Los datos entran
/// tal cual (no se reprograma nada; la regla del día efectivo actúa después). Cada lote queda identificado para revertirlo.
/// </summary>
internal sealed class ImportTasksHandler(BrisaDbContext db, PersonContext people, IClock clock)
{
    public async Task<Result<ImportReport>> HandleAsync(ImportRequest request, CancellationToken cancellationToken)
    {
        var person = await people.GetAsync(cancellationToken);
        if (person.IsFailure)
        {
            return person.Error;
        }

        var me = person.Value;
        var analysis = ImportParser.Parse(request.Content);
        if (!analysis.Accepted)
        {
            return Report(analysis, request.DryRun, null, 0, 0, 0, 0, []);
        }

        // La clasificación y la creación van juntas en una transacción serializable: dos importaciones simultáneas del mismo archivo no duplican.
        return await TransactionRunner.RunSerializableAsync(
            db, token => ExecuteAsync(me, analysis, request.DryRun, token), cancellationToken);
    }

    private async Task<Result<ImportReport>> ExecuteAsync(
        Person me, ImportAnalysis analysis, bool dryRun, CancellationToken cancellationToken)
    {
        var ids = analysis.Records.Select(r => r.Id).ToList();
        var existing = (await db.Tasks.AsNoTracking()
            .Where(t => t.OwnerId == me.UserId && ids.Contains(t.Id))
            .ToListAsync(cancellationToken))
            .ToDictionary(t => t.Id);

        var toCreate = new List<ImportRecord>();
        var skipped = new List<ImportIssueDto>();
        int same = 0, different = 0, deleted = 0;
        foreach (var record in analysis.Records)
        {
            if (!existing.TryGetValue(record.Id, out var current))
            {
                toCreate.Add(record);
            }
            else if (current.DeletedAt is not null)
            {
                deleted++;
                skipped.Add(new ImportIssueDto(record.Row, "id", $"«{record.Title}» ya existía y fue eliminada; se omitió."));
            }
            else if (record.SameAs(current))
            {
                same++;
            }
            else
            {
                different++;
                skipped.Add(new ImportIssueDto(record.Row, "id", $"«{record.Title}» ya existía con diferencias; se omitió y no se sobrescribió."));
            }
        }

        Guid? batchId = null;
        if (!dryRun && toCreate.Count > 0)
        {
            var now = clock.UtcNow;
            var batch = new ImportBatch { OwnerId = me.UserId, CreatedAt = now, TaskCount = toCreate.Count };
            db.ImportBatches.Add(batch);
            foreach (var record in toCreate)
            {
                db.Tasks.Add(new BrisaTask
                {
                    Id = record.Id,
                    OwnerId = me.UserId,
                    Title = record.Title,
                    Notes = record.Notes,
                    ScheduledDate = record.ScheduledDate,
                    DueDate = record.DueDate,
                    Priority = record.Priority,
                    ColorHex = record.ColorHex,
                    IsCompleted = record.Completed,
                    CompletedAt = null,
                    CreatedAt = record.CreatedAt ?? now,
                    // Igual al instante del lote: así la reversión distingue lo que no se tocó después.
                    UpdatedAt = now,
                    ImportBatchId = batch.Id,
                });
            }

            await db.SaveChangesAsync(cancellationToken);
            batchId = batch.Id;
        }

        return Report(analysis, dryRun, batchId, toCreate.Count, same, different, deleted, skipped);
    }

    private static ImportReport Report(
        ImportAnalysis analysis,
        bool dryRun,
        Guid? batchId,
        int toCreate,
        int same,
        int different,
        int deleted,
        IReadOnlyList<ImportIssueDto> skipped)
    {
        var summary = ImportSummary.Of(analysis.Records.ToList());
        return new ImportReport(
            analysis.Accepted,
            dryRun,
            batchId,
            new ImportTotalsDto(
                summary.Records,
                summary.Open,
                summary.Done,
                summary.WithDeadline,
                summary.From is { } from ? TaskRules.FormatDate(from) : null,
                summary.To is { } to ? TaskRules.FormatDate(to) : null),
            toCreate,
            same,
            different,
            deleted,
            analysis.Errors.Select(ToDto).ToList(),
            analysis.Warnings.Select(ToDto).ToList(),
            skipped);
    }

    private static ImportIssueDto ToDto(ImportIssue issue) => new(issue.Row, issue.Field, issue.Message);
}
