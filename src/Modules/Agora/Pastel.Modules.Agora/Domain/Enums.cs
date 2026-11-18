namespace Pastel.Modules.Agora.Domain;

/// <summary>Tipo de contenido visible en cada pieza (ficha §5): hechos, análisis u opinión.</summary>
internal enum ContentType
{
    Facts,
    Analysis,
    Opinion,
}

internal enum ArticleStatus
{
    Draft,
    Published,
    Archived,
}

/// <summary>Naturaleza de una fuente citada por la pieza.</summary>
internal enum SourceKind
{
    Official,
    Press,
    Academic,
    Document,
    Other,
}

internal enum VerificationStatus
{
    Active,
    Withdrawn,
}

/// <summary>Reacciones constructivas permitidas (sin enojo ni contadores públicos de vanidad).</summary>
internal enum ReactionKind
{
    Helped,
    MoreSources,
}

internal enum ErrorReportStatus
{
    Received,
    Resolved,
    Dismissed,
}

/// <summary>Estado del sello de una pieza. Se calcula; no se guarda (ver <see cref="SealCalculator"/>).</summary>
internal enum SealState
{
    Pending,
    Verified,
    ModifiedAfterVerification,
}
