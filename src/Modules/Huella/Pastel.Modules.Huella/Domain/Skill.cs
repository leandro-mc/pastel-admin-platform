namespace Pastel.Modules.Huella.Domain;

/// <summary>
/// Habilidad del banco, sin barras de nivel. Se respalda con evidencia mediante <c>AchievementSkill</c>; una habilidad
/// sin logros se marca «sin respaldo». <c>NormalizedName</c> evita duplicados.
/// </summary>
internal sealed class Skill : IProfileOwned
{
    public Guid Id { get; set; }

    public Guid ProfileId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string NormalizedName { get; set; } = string.Empty;

    public string? Aliases { get; set; }

    public string Category { get; set; } = string.Empty;

    public int? FirstUsedYear { get; set; }

    public int? LastUsedYear { get; set; }

    public string Why { get; set; } = string.Empty;

    public bool IsVisible { get; set; }

    public int SortOrder { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>Versión de fila de PostgreSQL (<c>xmin</c>) para la concurrencia optimista.</summary>
    public uint Version { get; set; }
}
