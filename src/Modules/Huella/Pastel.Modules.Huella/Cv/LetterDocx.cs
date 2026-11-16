using System.Text;

namespace Pastel.Modules.Huella.Cv;

/// <summary>
/// La carta de presentación en Word (.docx), con el mismo paquete que el CV: texto real, sin tablas ni imágenes. Abre en
/// Word, Google Docs y LibreOffice.
/// </summary>
internal static class LetterDocx
{
    public static byte[] Build(LetterDoc letter, string paper)
    {
        var en = letter.Language == "en";
        var a4 = paper == "a4";
        // Márgenes de 2,2 / 2 / 2 cm en veinteavos de punto.
        const int marginSide = 1247;
        const int marginVertical = 1134;
        var pageWidth = a4 ? 11906 : 12240;
        var pageHeight = a4 ? 16838 : 15840;

        var body = new StringBuilder();
        body.Append(CvDocx.Paragraph("Title", CvDocx.Run(letter.Signature)));
        var contact = string.Join("  ·  ", letter.Contact.Where(x => x.Length > 0));
        if (contact.Length > 0)
        {
            body.Append(CvDocx.Paragraph(null, CvDocx.Run(contact, color: CvDocx.Muted), spaceBefore: 0));
        }

        body.Append(CvDocx.Paragraph(null, string.Empty, spaceBefore: 120));
        if (letter.Subject.Length > 0)
        {
            body.Append(CvDocx.Paragraph(null, CvDocx.Run(letter.Subject, bold: true), spaceBefore: 120));
        }

        body.Append(CvDocx.Paragraph(null, CvDocx.Run(letter.Greeting), spaceBefore: 120));
        foreach (var paragraph in letter.Paragraphs)
        {
            body.Append(CvDocx.Paragraph(null, CvDocx.Run(paragraph), spaceBefore: 120));
        }

        body.Append(CvDocx.Paragraph(null, CvDocx.Run(letter.Closing), spaceBefore: 120));
        body.Append(CvDocx.Paragraph(null, CvDocx.Run(letter.Signature, bold: true), spaceBefore: 240));
        return CvDocx.Package(body.ToString(), pageWidth, pageHeight, marginVertical, marginSide, marginVertical, $"{(en ? "Cover letter" : "Carta de presentación")} — {letter.Signature}", letter.Signature, en);
    }
}
