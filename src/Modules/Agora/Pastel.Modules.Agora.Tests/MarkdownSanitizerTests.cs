using Pastel.Modules.Agora.Domain;
using Xunit;

namespace Pastel.Modules.Agora.Tests;

/// <summary>Seguridad del contenido (ficha §7, prueba esencial 4): el Markdown malicioso se sanitiza y lo legítimo se conserva.</summary>
public sealed class MarkdownSanitizerTests
{
    private static readonly string[] Forbidden =
    [
        "<script", "<iframe", "<img", "<div", "<a ", "onerror", "onclick", "javascript:", "data:text", "evil.example",
    ];

    [Theory]
    [InlineData("Hola <script>alert(1)</script> mundo")]
    [InlineData("<img src=x onerror=alert(1)>Texto")]
    [InlineData("[clic](javascript:alert(1))")]
    [InlineData("[clic](JaVaScRiPt:alert(1))")]
    [InlineData("[clic]( javascript:alert(1))")]
    [InlineData("[clic](&#106;avascript:alert(1))")]
    [InlineData("[clic](data:text/html;base64,PHNjcmlwdD4=)")]
    [InlineData("<iframe src=\"https://evil.example\"></iframe>")]
    [InlineData("<div onclick=\"x()\">texto</div>")]
    [InlineData("![pixel](https://evil.example/pixel.png)")]
    [InlineData("[ref]: javascript:alert(1)")]
    [InlineData("<scr<script>ipt>alert(1)</script>")]
    [InlineData("<a href=\"javascript:alert(1)\">x</a>")]
    [InlineData("<!-- <script>alert(1)</script> -->")]
    public void MaliciousMarkdownIsNeutralized(string input)
    {
        var result = MarkdownSanitizer.Sanitize(input);

        foreach (var token in Forbidden)
        {
            Assert.DoesNotContain(token, result, StringComparison.OrdinalIgnoreCase);
        }
    }

    [Fact]
    public void LegitimateContentIsKept()
    {
        const string input = """
            ## Título

            Texto con **negrita** y un [enlace](https://example.org/ley?a=1&b=2).

            - uno
            - dos

            > Cita

            Si a < b y b > c, entonces a < c.

            ```html
            <div>ejemplo</div>
            ```
            """;

        var result = MarkdownSanitizer.Sanitize(input);

        Assert.Contains("## Título", result, StringComparison.Ordinal);
        Assert.Contains("**negrita**", result, StringComparison.Ordinal);
        Assert.Contains("[enlace](https://example.org/ley?a=1&b=2)", result, StringComparison.Ordinal);
        Assert.Contains("- uno", result, StringComparison.Ordinal);
        Assert.Contains("> Cita", result, StringComparison.Ordinal);
        Assert.Contains("a < b y b > c", result, StringComparison.Ordinal);
        Assert.Contains("<div>ejemplo</div>", result, StringComparison.Ordinal);
    }
}
