using System.Text;

namespace Pastel.Modules.Huella.Cv;

/// <summary>
/// La carta de presentación en Word (.docx) con la forma de una carta formal: remitente arriba (nombre y datos, una línea
/// cada uno), fecha, destinatario, asunto, saludo, cuerpo con sangría y texto justificado, despedida y firma, con un renglón
/// en blanco entre cada bloque. Times New Roman o Arial; abre en Word, Google Docs y LibreOffice.
/// </summary>
internal static class LetterDocx
{
    // Márgenes de 2,5 cm en veinteavos de punto; sangría de primera línea de 1,25 cm.
    private const int Margin = 1417;
    private const int Indent = 709;

    public static byte[] Build(LetterDoc letter, string paper)
    {
        var en = letter.Language == "en";
        var a4 = paper == "a4";
        var pageWidth = a4 ? 11906 : 12240;
        var pageHeight = a4 ? 16838 : 15840;

        var body = new StringBuilder();
        void Line(string text, bool bold = false) => body.Append(Para(CvDocx.Run(text, bold: bold)));
        void Blank() => body.Append(Para(string.Empty));

        // Remitente
        Line(letter.Signature, bold: true);
        foreach (var contact in letter.Contact.Where(x => x.Length > 0))
        {
            Line(contact);
        }

        // Fecha
        var date = LetterFormat.DateText(letter.Date, letter.Language);
        if (date.Length > 0)
        {
            Blank();
            Line(date);
        }

        // Destinatario
        if (letter.Recipient.Count > 0)
        {
            Blank();
            foreach (var line in letter.Recipient)
            {
                Line(line);
            }
        }

        // Asunto y saludo
        if (letter.Subject.Length > 0)
        {
            Blank();
            Line($"{LetterFormat.SubjectLabel(letter.Language)} {letter.Subject}", bold: true);
        }

        Blank();
        Line(letter.Greeting);
        Blank();

        // Cuerpo: texto justificado con sangría de primera línea
        foreach (var paragraph in letter.Paragraphs)
        {
            body.Append(Para(CvDocx.Run(paragraph), justify: true, indent: true, after: 120));
        }

        // Despedida y firma
        Blank();
        Line(letter.Closing);
        Blank();
        Blank();
        Blank();
        Line(letter.Signature, bold: true);

        var title = $"{(en ? "Cover letter" : "Carta de presentación")} — {letter.Signature}";
        return CvDocx.Package(body.ToString(), pageWidth, pageHeight, Margin, Margin, Margin, title, letter.Signature, en, LetterFormat.WordFont(letter.Font), LetterFormat.Size(letter.Font) * 2);
    }

    /// <summary>Párrafo sin espacio extra (los renglones en blanco son párrafos vacíos), interlineado 1,15.</summary>
    private static string Para(string runs, bool justify = false, bool indent = false, int after = 0)
    {
        var props = $"<w:spacing w:before=\"0\" w:after=\"{after}\" w:line=\"276\" w:lineRule=\"auto\"/>"
            + (indent ? $"<w:ind w:firstLine=\"{Indent}\"/>" : string.Empty)
            + (justify ? "<w:jc w:val=\"both\"/>" : string.Empty);
        return $"<w:p><w:pPr>{props}</w:pPr>{runs}</w:p>";
    }
}
