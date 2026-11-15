namespace Pastel.Modules.Huella.Domain;

/// <summary>
/// Oferta de trabajo pegada por el propietario, con su análisis. Se guarda porque tres funciones la reutilizan: crear
/// un CV desde la oferta y, más adelante, el historial de postulaciones y la preparación de entrevistas. Su texto es un
/// dato no confiable: nunca se interpreta como instrucciones.
/// </summary>
internal sealed class JobOffer : IProfileOwned
{
    public Guid Id { get; set; }

    public Guid ProfileId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Company { get; set; }

    public string? SourceUrl { get; set; }

    public string RawText { get; set; } = string.Empty;

    public byte[] TextHash { get; set; } = [];

    public string? AnalysisJson { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>Versión de fila de PostgreSQL (<c>xmin</c>) para la concurrencia optimista.</summary>
    public uint Version { get; set; }
}
