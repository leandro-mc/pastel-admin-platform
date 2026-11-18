using Pastel.Modules.Agora.Common;
using Pastel.Modules.Agora.Features.Share;
using Xunit;

namespace Pastel.Modules.Agora.Tests;

/// <summary>Compartir: la vista previa que ve un rastreador no puede ejecutar nada que venga de un titular o un nombre.</summary>
public sealed class ShareHtmlTests
{
    [Fact]
    public void HostileTextIsEncodedInTheSharePage()
    {
        var page = new SharePage(
            "\"><script>alert(1)</script>",
            "Pendiente de verificación. <img src=x onerror=alert(1)>",
            "https://agora.example/agora/p/x",
            null,
            "Ana </script><script>alert(2)",
            new DateTimeOffset(2026, 11, 1, 12, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 11, 2, 12, 0, 0, TimeSpan.Zero));

        var html = ShareHtml.Render(page);

        Assert.DoesNotContain("<script>alert", html, StringComparison.Ordinal);
        Assert.DoesNotContain("<img", html, StringComparison.Ordinal);
        Assert.Contains("&lt;script&gt;alert(1)&lt;/script&gt;", html, StringComparison.Ordinal);
        Assert.Equal(1, html.Split("</script>", StringSplitOptions.None).Length - 1); // solo el cierre del bloque JSON-LD
    }

    [Fact]
    public void TheSealTravelsInThePreviewText()
    {
        var verified = new SealDto("verified", 1, 1, [new SealVerifierDto("Ana Rojas", DateTimeOffset.UnixEpoch)]);

        Assert.Equal("Verificada por Ana Rojas", ShareHtml.SealText(verified));
        Assert.Equal("Pendiente de verificación", ShareHtml.SealText(new SealDto("pending", 0, 1, [])));
        Assert.Equal("Modificada tras la verificación", ShareHtml.SealText(new SealDto("modifiedAfterVerification", 0, 1, [])));
    }
}
