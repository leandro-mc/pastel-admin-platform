namespace Pastel.Modules.Brisa.Features.Import;

/// <summary>Cuerpo de la importación: el texto del archivo y si solo se quiere la vista previa.</summary>
internal sealed record ImportRequest(string? Content, bool DryRun);

internal sealed record ImportIssueDto(int? Row, string? Field, string Message);

internal sealed record ImportTotalsDto(int Records, int Open, int Done, int WithDeadline, string? From, string? To);

/// <summary>
/// Informe de la importación. Con errores, <see cref="Accepted"/> es falso y no se creó nada (todo o nada).
/// <see cref="ToCreate"/> son las tareas que se crearían (vista previa) o que se crearon.
/// </summary>
internal sealed record ImportReport(
    bool Accepted,
    bool DryRun,
    Guid? BatchId,
    ImportTotalsDto Totals,
    int ToCreate,
    int AlreadyExisting,
    int WithDifferences,
    int ExistingDeleted,
    IReadOnlyList<ImportIssueDto> Errors,
    IReadOnlyList<ImportIssueDto> Warnings,
    IReadOnlyList<ImportIssueDto> Skipped);

internal sealed record ImportBatchDto(Guid Id, DateTimeOffset CreatedAt, int TaskCount, DateTimeOffset? RevertedAt);

/// <summary>Resultado de revertir: cuántas tareas se quitaron y cuántas se conservaron por haberse editado después.</summary>
internal sealed record RevertResultDto(int Reverted, int Kept);
