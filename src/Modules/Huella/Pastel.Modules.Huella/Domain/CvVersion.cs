namespace Pastel.Modules.Huella.Domain;

/// <summary>
/// CV generado: se guarda el JSON (<c>ContentJson</c>, validado contra los límites), no el PDF; el PDF se regenera al
/// pedirlo. <c>JobOfferId</c> queda nulo en el modo «enfocado». A lo sumo un CV por perfil puede ser público.
/// </summary>
internal sealed class CvVersion : IProfileOwned
{
    public Guid Id { get; set; }

    public Guid ProfileId { get; set; }

    public Guid? JobOfferId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Level { get; set; } = string.Empty;

    public string Paper { get; set; } = string.Empty;

    public string Language { get; set; } = string.Empty;

    public string Mode { get; set; } = string.Empty;

    public string? Focus { get; set; }

    public string ContentJson { get; set; } = string.Empty;

    public string? ReportJson { get; set; }

    public short Pages { get; set; }

    public decimal LinesUsed { get; set; }

    public int LineBudget { get; set; }

    public bool IsPublic { get; set; }

    /// <summary>Cuándo se envió esta versión (a su oferta o a quien corresponda); <c>null</c> = sin enviar.</summary>
    public DateTimeOffset? SentAt { get; set; }

    public string Source { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>Versión de fila de PostgreSQL (<c>xmin</c>) para la concurrencia optimista.</summary>
    public uint Version { get; set; }
}
