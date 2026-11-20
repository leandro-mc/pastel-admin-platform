namespace Pastel.Modules.Huella.Domain;

/// <summary>
/// Proyecto del banco (código abierto, propio, académico). Sus logros se derivan de <c>Summary</c>.
/// </summary>
internal sealed class Project : IProfileOwned
{
    public Guid Id { get; set; }

    public Guid ProfileId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Url { get; set; }

    public string Summary { get; set; } = string.Empty;

    public string Approach { get; set; } = string.Empty;

    public string? Stack { get; set; }

    public int? StartYear { get; set; }

    public int? EndYear { get; set; }

    public bool IsVisible { get; set; }

    public int SortOrder { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>Versión de fila de PostgreSQL (<c>xmin</c>) para la concurrencia optimista.</summary>
    public uint Version { get; set; }
}
