using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha.Documents;

internal sealed record DocumentFile(string FileName, string ContentType, byte[] Content);

internal sealed record QuoteLineData(string Description, decimal Kilograms, decimal PricePerKg);

/// <summary>Datos operativos de una cotización. Los datos legales de la asociación (personería, registros) no se incluyen: están por verificar.</summary>
internal sealed record QuoteDocumentData(string BuyerName, DateOnly IssuedOn, IReadOnlyList<QuoteLineData> Lines);

internal sealed record ProductSheetData(string ProductName, string? Description);

internal sealed record ReceiptDocumentData(
    string ProducerName, DateOnly ReceivedOn, decimal ReceivedKg, decimal RejectedKg, decimal AcceptedKg, decimal PricePerKg, decimal AmountCrc);

/// <summary>
/// Costura del módulo para generar cotizaciones, fichas de producto y recibos en PDF. Su implementación real depende de
/// <c>Pastel.Documents</c> (CCR-2, docs/requests/CCR-2-motor-documental-typst.md), que aún no está en <c>dev</c>: mientras tanto
/// <see cref="UnavailableCosechaDocuments"/> responde «no disponible». Ninguna otra parte de Cosecha depende del motor.
/// </summary>
internal interface ICosechaDocuments
{
    Task<Result<DocumentFile>> RenderQuoteAsync(QuoteDocumentData data, CancellationToken cancellationToken);

    Task<Result<DocumentFile>> RenderProductSheetAsync(ProductSheetData data, CancellationToken cancellationToken);

    Task<Result<DocumentFile>> RenderReceiptAsync(ReceiptDocumentData data, CancellationToken cancellationToken);
}

/// <summary>Implementación mientras no exista el motor documental: toda petición falla con <c>cosecha.documents.unavailable</c> (503).</summary>
internal sealed class UnavailableCosechaDocuments : ICosechaDocuments
{
    public Task<Result<DocumentFile>> RenderQuoteAsync(QuoteDocumentData data, CancellationToken cancellationToken) => Unavailable();

    public Task<Result<DocumentFile>> RenderProductSheetAsync(ProductSheetData data, CancellationToken cancellationToken) => Unavailable();

    public Task<Result<DocumentFile>> RenderReceiptAsync(ReceiptDocumentData data, CancellationToken cancellationToken) => Unavailable();

    private static Task<Result<DocumentFile>> Unavailable() => Task.FromResult(Result.Failure<DocumentFile>(CosechaErrors.DocumentsUnavailable));
}
