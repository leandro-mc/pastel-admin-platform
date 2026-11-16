using Pastel.Modules.Huella.Cv;

namespace Pastel.Modules.Huella.Features.Studio;

internal sealed record OfferInput(string? Title, string? Company, string? SourceUrl, string? RawText);

/// <summary>Requisitos obligatorios de la oferta (<c>Total</c>) y cuántos tienen respaldo en el banco de hoy (<c>Covered</c>).</summary>
internal sealed record OfferCoverage(int Covered, int Total);

/// <summary>Una oferta con su seguimiento: es lo que muestra la lista de ofertas y el historial.</summary>
internal sealed record OfferSummary(
    Guid Id,
    string Title,
    string? Company,
    string? SourceUrl,
    DateTimeOffset CreatedAt,
    string Status,
    DateTimeOffset? StatusUpdatedAt,
    DateTimeOffset? AppliedAt,
    DateOnly? FollowUpAt,
    string Notes,
    OfferCoverage Coverage);

/// <summary>Seguimiento de una oferta: estado, fecha de postulación (opcional), día de seguimiento (opcional) y notas.</summary>
internal sealed record OfferTrackingInput(string? Status, DateTimeOffset? AppliedAt, DateOnly? FollowUpAt, string? Notes);

internal sealed record OfferView(
    Guid Id,
    string Title,
    string? Company,
    string? SourceUrl,
    string RawText,
    OfferAnalysis Analysis,
    IReadOnlyList<EvidenceItem> Evidence,
    IReadOnlyList<HardFilterRow> HardFilters,
    DateTimeOffset CreatedAt);

internal sealed record GenerateCvInput(Guid? OfferId, string? Focus, string? Level, string? Paper, string? Language, string? Name);

internal sealed record CvVersionSummary(
    Guid Id,
    string Name,
    string Level,
    string Paper,
    string Language,
    string Mode,
    string Source,
    int Pages,
    decimal LinesUsed,
    int LineBudget,
    bool IsPublic,
    DateTimeOffset? SentAt,
    Guid? OfferId,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

internal sealed record CvReport(
    IReadOnlyList<CvCheck> Checks,
    IReadOnlyList<string> FitLog,
    IReadOnlyList<EvidenceItem> Evidence,
    IReadOnlyList<HardFilterRow> HardFilters);

internal sealed record CvVersionView(
    CvVersionSummary Summary,
    CvDocument Document,
    CvReport Report,
    string AtsText,
    bool PdfAvailable);

/// <summary>Edición de una línea: <c>Target</c> es <c>summary</c> o <c>bullet</c> (con <c>Section</c> experience|projects, <c>Entry</c> e <c>Index</c>).</summary>
internal sealed record EditLineInput(string? Target, string? Section, int? Entry, int? Index, string? Text, IReadOnlyList<Guid>? SourceIds);

internal sealed record RenameInput(string? Name);

