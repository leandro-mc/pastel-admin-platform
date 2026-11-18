using Pastel.SharedKernel;

namespace Pastel.Modules.Agora.Features.Share;

/// <summary>Datos de la tarjeta para compartir (AG-CON-01): titular, resumen y el sello con su texto.</summary>
internal sealed record ShareCardModel(string Title, string Summary, string SealText, string PublicUrl);

/// <summary>
/// Genera la imagen PNG que viaja por WhatsApp con el sello y el titular. Depende del motor documental de CCR-2
/// (<c>Pastel.Documents</c>, Typst), que todavía no está en <c>dev</c>: mientras tanto se usa
/// <see cref="UnavailableShareCardRenderer"/> y la vista previa se limita a los metadatos <c>og:*</c> sin imagen.
/// Para activarla basta registrar otra implementación (el módulo usa <c>TryAddSingleton</c>).
/// </summary>
internal interface IShareCardRenderer
{
    /// <summary>Falso mientras no exista una implementación real; el HTML de compartir omite entonces <c>og:image</c>.</summary>
    bool IsAvailable { get; }

    Task<Result<byte[]>> RenderPngAsync(ShareCardModel model, CancellationToken cancellationToken);
}

/// <summary>Implementación predeterminada: la tarjeta aún no está disponible (pendiente de CCR-2).</summary>
internal sealed class UnavailableShareCardRenderer : IShareCardRenderer
{
    public bool IsAvailable => false;

    public Task<Result<byte[]>> RenderPngAsync(ShareCardModel model, CancellationToken cancellationToken) =>
        Task.FromResult<Result<byte[]>>(AgoraErrors.ShareCardUnavailable);
}
