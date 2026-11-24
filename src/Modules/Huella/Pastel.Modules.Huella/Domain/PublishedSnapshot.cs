namespace Pastel.Modules.Huella.Domain;

/// <summary>
/// Versión publicada, inmutable: el JSON que lee la página pública (nunca el borrador). <c>Number</c> crece de uno en
/// uno por perfil. <c>CvContentJson</c> congela el CV marcado como público en ese momento, para que la descarga pública
/// no cambie hasta publicar de nuevo.
/// </summary>
internal sealed class PublishedSnapshot : IProfileOwned
{
    public Guid Id { get; set; }

    public Guid ProfileId { get; set; }

    public int Number { get; set; }

    public string ContentJson { get; set; } = string.Empty;

    public string? CvContentJson { get; set; }

    public byte[] ContentHash { get; set; } = [];

    public DateTimeOffset CreatedAt { get; set; }
}
