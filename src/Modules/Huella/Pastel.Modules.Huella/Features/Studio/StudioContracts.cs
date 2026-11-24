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

/// <summary><c>PairId</c>: el borrador sin IA en dos idiomas crea una versión por llamada; ambas llevan el mismo id para quedar emparejadas.</summary>
internal sealed record GenerateCvInput(Guid? OfferId, string? Focus, string? Level, string? Paper, string? Language, string? Name, Guid? PairId = null);

internal sealed record CvVersionSummary(
    Guid Id,
    string Name,
    string Level,
    string Paper,
    string Language,
    string Format,
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

/// <summary>La otra versión de una pareja generada junta (español e inglés): <c>Pending</c> = esta versión no refleja aún cambios de la otra; <c>TwinPending</c> = la otra no refleja cambios de esta.</summary>
internal sealed record CvPairView(Guid TwinId, string TwinLanguage, string TwinName, bool Pending, bool TwinPending);

internal sealed record CvVersionView(
    CvVersionSummary Summary,
    CvDocument Document,
    CvReport Report,
    string AtsText,
    bool PdfAvailable,
    CvPairView? Pair);

/// <summary>Edición de una línea: <c>Target</c> es <c>summary</c> o <c>bullet</c> (con <c>Section</c> experience|projects, <c>Entry</c> e <c>Index</c>).</summary>
internal sealed record EditLineInput(string? Target, string? Section, int? Entry, int? Index, string? Text, IReadOnlyList<Guid>? SourceIds);

/// <summary>Regenerar una sección en la edición libre: cuál y cómo está el borrador (para que la IA no repita lo que dicen las demás).</summary>
/// <remarks><c>Json</c> solo se usa al importar la respuesta de una IA externa (<c>section/ai-result</c>).</remarks>
internal sealed record CvSectionInput(string? Section, CvDocumentInput? Draft, string? Json = null);

/// <summary>La sección regenerada: un documento con solo esa parte llena y lo que se descartó. No se guarda: la persona la revisa y guarda.</summary>
internal sealed record CvSectionView(string Section, CvDocument Document, IReadOnlyList<string> Warnings);

internal sealed record RenameInput(string? Name);

