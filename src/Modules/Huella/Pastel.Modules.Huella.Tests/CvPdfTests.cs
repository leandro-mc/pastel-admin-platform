using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Pastel.Documents;
using Pastel.Modules.Huella.Cv;
using Xunit;

namespace Pastel.Modules.Huella.Tests;

/// <summary>Requiere Typst, igual que <c>Pastel.Documents.Tests</c> (ruta en <c>Documents__TypstPath</c> o en el PATH).</summary>
public sealed class CvPdfTests
{
    // La plantilla fija del CV compila con un CV real del banco: si se rompe, ningún PDF se puede descargar.
    [Fact]
    public async Task CvTemplateRendersAGeneratedCvAsPdf()
    {
        var bank = SampleBank.Create();
        var limits = CvLimits.For("mid", "letter");
        var analysis = OfferAnalyzer.Analyze("Buscamos QA con Playwright, k6 y GitHub Actions.", isFocus: false, bank);
        var document = CvComposer.Compose(bank, new CvRequestOptions("mid", "letter", "es"), analysis, limits);
        CvLayout.Fit(document, limits);

        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Documents:TypstPath"] = Environment.GetEnvironmentVariable("Documents__TypstPath") ?? "typst",
        }).Build();
        using var services = new ServiceCollection().AddLogging().AddPastelDocuments(configuration).BuildServiceProvider();
        var documents = services.GetRequiredService<IDocumentRenderer>();
        Assert.True(documents.IsAvailable, "Typst no está instalado: defina Documents__TypstPath o agréguelo al PATH.");

        var pdf = await new TypstCvRenderer(documents).RenderPdfAsync(document, new CvRequestOptions("mid", "letter", "es"), CancellationToken.None);

        Assert.True(pdf.IsSuccess, pdf.ErrorOrNull?.Code);
        Assert.True(pdf.Value.Length > 1000);
        if (Environment.GetEnvironmentVariable("HUELLA_CV_SAMPLE_OUT") is { Length: > 0 } path)
        {
            await File.WriteAllBytesAsync(path, pdf.Value);
        }
    }
}
