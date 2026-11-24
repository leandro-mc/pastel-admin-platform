namespace Pastel.Modules.Huella.Domain;

/// <summary>
/// Unidad atómica de evidencia: un logro con su métrica, de una experiencia o de un proyecto (exactamente uno).
/// <c>ShortText</c> y <c>LongText</c> son líneas listas para el CV (1 y 2 líneas); la escalera de ajuste alterna entre
/// ellas sin llamar a la IA. Todo CV cita estos <c>Id</c> en <c>sourceIds</c>.
/// </summary>
internal sealed class Achievement
{
    public Guid Id { get; set; }

    public Guid? ExperienceId { get; set; }

    public Guid? ProjectId { get; set; }

    public string? RawText { get; set; }

    public string? Situation { get; set; }

    public string? Action { get; set; }

    public string? ResultValue { get; set; }

    public string? ResultUnit { get; set; }

    public string? ResultBaseline { get; set; }

    public string ImpactType { get; set; } = string.Empty;

    public short Strength { get; set; }

    public string ShortText { get; set; } = string.Empty;

    public string LongText { get; set; } = string.Empty;

    public bool Verified { get; set; }

    public string Source { get; set; } = string.Empty;

    public string Visibility { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>Versión de fila de PostgreSQL (<c>xmin</c>) para la concurrencia optimista.</summary>
    public uint Version { get; set; }
}
