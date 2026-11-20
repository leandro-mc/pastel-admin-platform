namespace Pastel.Modules.Huella.Domain;

/// <summary>
/// Raíz de todo lo que Huella guarda: un único registro por cuenta Owner/Superuser (<c>OwnerUserId</c>). Contiene lo
/// publicable en borrador y el estado de publicación; lo privado vive en <c>PrivateNote</c> y en el banco. Nada de este
/// tipo cruza al esquema de Identity: <c>OwnerUserId</c> es solo un identificador.
/// </summary>
internal sealed class Profile
{
    public Guid Id { get; set; }

    public Guid OwnerUserId { get; set; }

    public string DisplayName { get; set; } = string.Empty;

    public string Headline { get; set; } = string.Empty;

    public string Summary { get; set; } = string.Empty;

    public string? Location { get; set; }

    public string? Availability { get; set; }

    public string? ContactEmail { get; set; }

    public string? ContactPhone { get; set; }

    public bool ShowContactEmail { get; set; }

    public bool ShowContactPhone { get; set; }

    public bool ShowLocation { get; set; }

    public bool ShowAvailability { get; set; }

    public byte[]? PublicTokenHash { get; set; }

    public DateTimeOffset? PublicTokenCreatedAt { get; set; }

    /// <summary>Token del enlace cifrado (AES-GCM, ver <c>AiKeyProtector</c>) para que el propietario pueda copiarlo de nuevo. Nulo en enlaces creados antes de existir esta columna: hay que regenerarlos.</summary>
    public string? PublicTokenCipher { get; set; }

    public bool IsPublished { get; set; }

    public int? PublishedVersion { get; set; }

    public DateTimeOffset? PublishedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>Versión de fila de PostgreSQL (<c>xmin</c>) para la concurrencia optimista.</summary>
    public uint Version { get; set; }
}
