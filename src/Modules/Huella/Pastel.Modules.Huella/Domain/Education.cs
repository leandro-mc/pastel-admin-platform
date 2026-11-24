namespace Pastel.Modules.Huella.Domain;

/// <summary>
/// Formación académica.
/// </summary>
internal sealed class Education : IProfileOwned
{
    public Guid Id { get; set; }

    public Guid ProfileId { get; set; }

    public string Degree { get; set; } = string.Empty;

    public string Institution { get; set; } = string.Empty;

    public int? StartYear { get; set; }

    public int? EndYear { get; set; }

    public string? Note { get; set; }

    public bool IsVisible { get; set; }

    public int SortOrder { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>Versión de fila de PostgreSQL (<c>xmin</c>) para la concurrencia optimista.</summary>
    public uint Version { get; set; }
}
