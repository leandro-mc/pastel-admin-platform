namespace Pastel.Modules.Huella.Domain;

/// <summary>
/// Experiencia laboral del banco. <c>Narrative</c> es el relato largo del propietario, con sus palabras; de ahí se
/// derivan los logros. Las fechas tienen precisión de mes (se guarda el día 1); <c>EndDate</c> nulo significa «cargo
/// actual».
/// </summary>
internal sealed class Experience : IProfileOwned
{
    public Guid Id { get; set; }

    public Guid ProfileId { get; set; }

    public string Role { get; set; } = string.Empty;

    public string? MarketRole { get; set; }

    public string Company { get; set; } = string.Empty;

    public string? Location { get; set; }

    public string? EmploymentType { get; set; }

    public string? WorkMode { get; set; }

    public DateOnly StartDate { get; set; }

    public DateOnly? EndDate { get; set; }

    public string Narrative { get; set; } = string.Empty;

    public string? CompanyContext { get; set; }

    public int? TeamSize { get; set; }

    public bool IsVisible { get; set; }

    public int SortOrder { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>Versión de fila de PostgreSQL (<c>xmin</c>) para la concurrencia optimista.</summary>
    public uint Version { get; set; }
}
