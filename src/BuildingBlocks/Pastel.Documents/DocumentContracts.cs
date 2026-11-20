using Pastel.SharedKernel;

namespace Pastel.Documents;

/// <summary>Formato de salida de un documento.</summary>
public enum DocumentFormat
{
    Pdf,
    Png,
}

/// <summary>
/// Petición de render. <see cref="Template"/> es el código Typst FIJO del módulo (nunca texto del usuario ni de una IA);
/// <see cref="DataJson"/> son los datos, que la plantilla lee con <c>json("data.json")</c>. Los valores de cadena del
/// JSON se imprimen como texto: Typst no los interpreta como marcado ni como código.
/// </summary>
public sealed record DocumentRequest(string Template, string DataJson, DocumentFormat Format);

/// <summary>Motor documental compartido (CCR-2). Los módulos lo usan solo por este contrato.</summary>
public interface IDocumentRenderer
{
    /// <summary>Indica si el motor está instalado y responde. Se comprueba una vez y se recuerda.</summary>
    bool IsAvailable { get; }

    Task<Result<byte[]>> RenderAsync(DocumentRequest request, CancellationToken cancellationToken);
}

/// <summary>Errores estables del motor documental.</summary>
public static class DocumentErrors
{
    public static readonly Error Unavailable = Error.Unavailable(
        "documents.renderer_unavailable",
        "El generador de documentos no está disponible en este servidor. Intente más tarde o use el texto para copiar.");

    public static readonly Error Timeout = Error.Unavailable(
        "documents.timeout",
        "El documento tardó demasiado en generarse. Intente de nuevo en un momento.",
        retryAfterSeconds: 10);

    public static readonly Error Failed = Error.Unexpected(
        "documents.failed",
        "No se pudo generar el documento. Intente de nuevo; si sigue fallando, avise a quien administra la plataforma.");

    public static readonly Error TooLarge = Error.Unexpected(
        "documents.too_large",
        "El documento generado excede el tamaño permitido.");
}

/// <summary>Configuración (<c>Documents:*</c>).</summary>
public sealed class DocumentOptions
{
    public const string Section = "Documents";

    /// <summary>Ruta del binario de Typst. Por defecto se busca <c>typst</c> en el PATH.</summary>
    public string TypstPath { get; set; } = "typst";

    /// <summary>Carpeta de fuentes. Por defecto, <c>Fonts</c> junto a la aplicación.</summary>
    public string? FontPath { get; set; }

    public int TimeoutSeconds { get; set; } = 20;

    /// <summary>Límite de memoria virtual del proceso en Linux (ulimit -v). 0 lo desactiva.</summary>
    public int MemoryLimitMb { get; set; } = 512;

    public int MaxOutputBytes { get; set; } = 10 * 1024 * 1024;

    public int MaxDataBytes { get; set; } = 512 * 1024;
}
