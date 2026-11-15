using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace Pastel.Documents.Tests;

/// <summary>
/// Requieren Typst (versión fijada en el Dockerfile y en scripts/test-backend.ps1). La ruta se toma de
/// <c>Documents__TypstPath</c> o del PATH; sin Typst la prueba falla con un mensaje claro en vez de omitirse.
/// </summary>
public sealed class TypstRendererTests
{
    private const string Template = "#let d = json(\"data.json\")\n#set text(font: \"Source Sans 3\")\n#d.payload\n";

    private static TypstDocumentRenderer Renderer()
    {
        var options = new DocumentOptions { TypstPath = Environment.GetEnvironmentVariable("Documents__TypstPath") ?? "typst" };
        var renderer = new TypstDocumentRenderer(Options.Create(options), NullLogger<TypstDocumentRenderer>.Instance);
        Assert.True(renderer.IsAvailable, "Typst no está instalado: defina Documents__TypstPath o agréguelo al PATH.");
        return renderer;
    }

    private static string Data(string payload) => System.Text.Json.JsonSerializer.Serialize(new { payload });

    // CCR-2 / D-10: un dato con código Typst se imprime como texto; si se evaluara, panic() haría fallar la compilación
    // y read() intentaría leer fuera de la raíz.
    [Fact]
    public async Task MaliciousDataIsPrintedAsTextAndNeverExecuted()
    {
        var payload = "#panic(\"inyectado\") ]#{ read(\"/etc/passwd\") } #import \"@preview/x:0.1.0\": *";

        var result = await Renderer().RenderAsync(new DocumentRequest(Template, Data(payload), DocumentFormat.Pdf), CancellationToken.None);

        Assert.True(result.IsSuccess, result.ErrorOrNull?.Code);
        Assert.StartsWith("%PDF-", Encoding.ASCII.GetString(result.Value, 0, 5), StringComparison.Ordinal);
    }

    // Las fuentes autoalojadas viajan incrustadas en el PDF (no se depende de las del sistema del lector ni del servidor).
    [Fact]
    public async Task PdfEmbedsTheSelfHostedFont()
    {
        var result = await Renderer().RenderAsync(new DocumentRequest(Template, Data("Hola"), DocumentFormat.Pdf), CancellationToken.None);

        Assert.True(result.IsSuccess, result.ErrorOrNull?.Code);
        Assert.Contains("SourceSans3", Encoding.Latin1.GetString(result.Value), StringComparison.Ordinal);
    }
}
