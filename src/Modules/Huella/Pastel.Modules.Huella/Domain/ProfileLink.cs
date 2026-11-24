namespace Pastel.Modules.Huella.Domain;

/// <summary>
/// Enlace externo del perfil (LinkedIn, GitHub, sitio). Solo los marcados <c>IsPublic</c> entran a una publicación.
/// </summary>
internal sealed class ProfileLink : IProfileOwned
{
    public Guid Id { get; set; }

    public Guid ProfileId { get; set; }

    public string Kind { get; set; } = string.Empty;

    public string Label { get; set; } = string.Empty;

    public string Url { get; set; } = string.Empty;

    public bool IsPublic { get; set; }

    /// <summary>Icono elegido del catálogo <see cref="LinkIcons"/>; <c>null</c> = el que corresponde al tipo.</summary>
    public string? Icon { get; set; }

    public int SortOrder { get; set; }
}

/// <summary>
/// Catálogo cerrado de iconos de enlace. La interfaz dibuja cada clave con un icono propio; el servidor solo guarda la clave
/// (nunca imágenes ni marcado), así que un valor fuera de esta lista se rechaza.
/// </summary>
internal static class LinkIcons
{
    public static readonly IReadOnlyList<string> Keys =
    [
        "globe", "linkedin", "github", "gitlab", "twitter", "youtube", "instagram", "facebook",
        "figma", "dribbble", "briefcase", "code", "file", "book", "mail", "link",
    ];
}
