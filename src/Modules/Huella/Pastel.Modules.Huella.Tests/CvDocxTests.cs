using System.IO.Compression;
using System.Xml.Linq;
using Pastel.Modules.Huella.Cv;
using Xunit;

namespace Pastel.Modules.Huella.Tests;

public sealed class CvDocxTests
{
    // El Word es el mismo CV que el PDF: cada parte del paquete es XML válido, el texto de la IA o del banco nunca se
    // interpreta como marcado y los caracteres que XML no admite no rompen el archivo (Word lo rechazaría como dañado).
    [Fact]
    public void DocxIsValidAndTextIsNeverTreatedAsMarkup()
    {
        var document = new CvDocument
        {
            Header = new CvHeader { Name = "Ana <b>Pérez</b> & Co", Headline = "QA \"Engineer\"", ContactLine1 = ["ana@example.com"] },
            Summary = "R&D <script>alert(1)</script> con control \u0001 y emoji 😀.",
            Experience =
            [
                new CvEntry { Title = "QA", Subtitle = "Acme", Dates = "2020 – 2024", Bullets = [new CvBullet { Text = "Reduje la regresión 40 %." }] },
            ],
        };

        var bytes = CvDocx.Build(document, new CvRequestOptions("mid", "a4", "es"));

        using var zip = new ZipArchive(new MemoryStream(bytes), ZipArchiveMode.Read);
        foreach (var entry in zip.Entries)
        {
            using var reader = new StreamReader(entry.Open());
            XDocument.Parse(reader.ReadToEnd());
        }

        using var documentPart = new StreamReader(zip.GetEntry("word/document.xml")!.Open());
        var xml = XDocument.Parse(documentPart.ReadToEnd());
        var text = string.Concat(xml.Descendants(XName.Get("t", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")).Select(t => t.Value));

        Assert.Contains("Ana <b>Pérez</b> & Co", text, StringComparison.Ordinal);
        Assert.Contains("<script>alert(1)</script>", text, StringComparison.Ordinal);
        Assert.Contains("😀", text, StringComparison.Ordinal);
        Assert.DoesNotContain('\u0001', text);
        Assert.Contains("Reduje la regresión 40 %.", text, StringComparison.Ordinal);
    }
}
