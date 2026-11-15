namespace Pastel.Modules.Huella.Domain;

/// <summary>
/// Certificación o curso con credencial.
/// </summary>
internal sealed class Certification : IProfileOwned
{
    public Guid Id { get; set; }

    public Guid ProfileId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Issuer { get; set; }

    public int? IssuedYear { get; set; }

    public int? ExpiresYear { get; set; }

    public string? CredentialUrl { get; set; }

    public bool IsVisible { get; set; }

    public int SortOrder { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>Versión de fila de PostgreSQL (<c>xmin</c>) para la concurrencia optimista.</summary>
    public uint Version { get; set; }
}
