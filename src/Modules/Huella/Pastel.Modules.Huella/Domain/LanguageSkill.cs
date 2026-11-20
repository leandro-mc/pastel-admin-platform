namespace Pastel.Modules.Huella.Domain;

/// <summary>
/// Idioma con nivel (Nativo o A1-C2) y cómo se demuestra.
/// </summary>
internal sealed class LanguageSkill : IProfileOwned
{
    public Guid Id { get; set; }

    public Guid ProfileId { get; set; }

    public string Language { get; set; } = string.Empty;

    public string Level { get; set; } = string.Empty;

    public string? Evidence { get; set; }

    public bool IsVisible { get; set; }

    public int SortOrder { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>Versión de fila de PostgreSQL (<c>xmin</c>) para la concurrencia optimista.</summary>
    public uint Version { get; set; }
}
