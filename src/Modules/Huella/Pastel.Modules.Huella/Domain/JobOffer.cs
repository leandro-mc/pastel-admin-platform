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

    /// <summary>Estado de la postulación (<see cref="OfferStatus"/>): <c>saved</c> hasta que la persona postula.</summary>
    public string Status { get; set; } = OfferStatus.Saved;

    public DateTimeOffset? StatusUpdatedAt { get; set; }

    /// <summary>Cuándo se postuló (se fija al pasar a «postulada» o al marcar un documento como enviado).</summary>
    public DateTimeOffset? AppliedAt { get; set; }

    /// <summary>Día en que conviene hacer seguimiento; el historial resalta el vencido.</summary>
    public DateOnly? FollowUpAt { get; set; }

    public string Notes { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>Versión de fila de PostgreSQL (<c>xmin</c>) para la concurrencia optimista.</summary>
    public uint Version { get; set; }
}

/// <summary>Estados del seguimiento de una oferta. Abiertos: guardada, postulada, entrevista y oferta; cerrados: el resto.</summary>
internal static class OfferStatus
{
    public const string Saved = "saved";
    public const string Applied = "applied";
    public const string Interview = "interview";
    public const string Offer = "offer";
    public const string Rejected = "rejected";
    public const string NoResponse = "no_response";
    public const string Discarded = "discarded";

    public static readonly IReadOnlyList<string> All = [Saved, Applied, Interview, Offer, Rejected, NoResponse, Discarded];

    /// <summary>¿La persona ya postuló? (el estado supone que se envió el CV).</summary>
    public static bool WasApplied(string status) => status is Applied or Interview or Offer or Rejected or NoResponse;
}
