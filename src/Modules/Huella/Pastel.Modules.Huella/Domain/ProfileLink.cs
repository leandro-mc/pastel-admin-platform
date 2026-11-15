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

    public int SortOrder { get; set; }
}
