namespace Pastel.Modules.Huella.Domain;

/// <summary>
/// Competencia del catálogo del banco: <c>Kind</c> es <c>personal</c> (blanda) o <c>technical</c>. <c>Description</c> dice qué
/// significa en el trabajo y <c>Evidence</c> cómo la demuestra la persona con hechos del banco. El CV de competencias solo
/// usa las que están aquí: la IA elige entre ellas y nunca inventa una.
/// </summary>
internal sealed class Competency : IProfileOwned
{
    public Guid Id { get; set; }

    public Guid ProfileId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string NormalizedName { get; set; } = string.Empty;

    public string Kind { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string Evidence { get; set; } = string.Empty;

    public bool IsVisible { get; set; }

    public int SortOrder { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>Versión de fila de PostgreSQL (<c>xmin</c>) para la concurrencia optimista.</summary>
    public uint Version { get; set; }
}

/// <summary>Tipos de competencia admitidos.</summary>
internal static class CompetencyKinds
{
    public const string Personal = "personal";
    public const string Technical = "technical";

    public static readonly IReadOnlyList<string> All = [Personal, Technical];
}
