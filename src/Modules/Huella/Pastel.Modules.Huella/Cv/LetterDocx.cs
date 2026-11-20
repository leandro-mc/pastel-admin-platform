using System.Text;

namespace Pastel.Modules.Huella.Cv;

/// <summary>
/// La carta de presentación en Word (.docx) con la forma de una carta formal compacta: arriba el nombre con la fecha a la
/// derecha y el país o la ciudad; después destinatario, asunto y saludo, cada bloque separado por medio renglón; un renglón
/// en blanco antes del cuerpo (sangría de primera línea y texto justificado) y otro antes de la despedida; y al pie, bajo el
/// nombre de la firma, el correo y el teléfono, uno por renglón. Times New Roman o Arial; abre en Word, Google Docs y LibreOffice. Las medidas
/// de la página son las que supone <see cref="LetterLayout"/> para garantizar que quepa en una sola hoja.
/// </summary>
internal static class LetterDocx
{
    // Márgenes en veinteavos de punto: 2 cm arriba y abajo, 2,5 cm a los lados; sangría de primera línea de 1,25 cm.
    private const int MarginVertical = 1134;
    private const int MarginSide = 1417;
    private const int Indent = 709;

    /// <summary>Medio renglón (8 pt) de separación entre bloques del encabezado.</summary>
    private const int HalfLine = 160;

    /// <summary>Separación entre párrafos del cuerpo (6 pt).</summary>
    private const int ParagraphGap = 120;

    public static byte[] Build(LetterDoc letter, string paper)
    {
        var en = letter.Language == "en";
        var a4 = paper == "a4";
        var pageWidth = a4 ? 11906 : 12240;
        var pageHeight = a4 ? 16838 : 15840;
        var textWidth = pageWidth - (2 * MarginSide);

        var body = new StringBuilder();
        void Line(string text, bool bold = false, int after = 0) => body.Append(Para(CvDocx.Run(text, bold: bold), after: after));
        void Blank() => body.Append(Para(string.Empty));

        // Nombre a la izquierda y fecha a la derecha, en el mismo renglón; debajo, el país o la ciudad.
        var date = LetterFormat.DateText(letter.Date, letter.Language);
        var row = CvDocx.Run(letter.Signature, bold: true) + (date.Length > 0 ? "<w:r><w:tab/></w:r>" + CvDocx.Run(date) : string.Empty);
        var hasLocation = letter.Location.Length > 0;
        body.Append(Para(row, tabAt: textWidth, after: hasLocation ? 0 : HalfLine));
        if (hasLocation)
        {
            Line(letter.Location, after: HalfLine);
        }

        // Destinatario
        for (var i = 0; i < letter.Recipient.Count; i++)
        {
            Line(letter.Recipient[i], after: i == letter.Recipient.Count - 1 ? HalfLine : 0);
        }

        // Asunto y saludo
        if (letter.Subject.Length > 0)
        {
            Line($"{LetterFormat.SubjectLabel(letter.Language)} {letter.Subject}", bold: true, after: HalfLine);
        }

        Line(letter.Greeting);
        Blank();

        // Cuerpo: texto justificado con sangría de primera línea
        for (var i = 0; i < letter.Paragraphs.Count; i++)
        {
            body.Append(Para(CvDocx.Run(letter.Paragraphs[i]), justify: true, indent: true, after: i == letter.Paragraphs.Count - 1 ? 0 : ParagraphGap));
        }

        // Despedida y firma, con los datos de contacto debajo del nombre
        Blank();
        Line(letter.Closing);
        Blank();
        Blank();
        Line(letter.Signature, bold: true);
        foreach (var contact in letter.Contact.Where(x => x.Length > 0))
        {
            Line(contact);
        }

        var title = $"{(en ? "Cover letter" : "Carta de presentación")} — {letter.Signature}";
        return CvDocx.Package(body.ToString(), pageWidth, pageHeight, MarginVertical, MarginSide, MarginVertical, title, letter.Signature, en, LetterFormat.WordFont(letter.Font), LetterFormat.Size(letter.Font) * 2);
    }

    /// <summary>Párrafo con interlineado 1,15; los renglones en blanco son párrafos vacíos.</summary>
    private static string Para(string runs, bool justify = false, bool indent = false, int after = 0, int? tabAt = null)
    {
        var props = (tabAt is null ? string.Empty : $"<w:tabs><w:tab w:val=\"right\" w:pos=\"{tabAt}\"/></w:tabs>")
            + $"<w:spacing w:before=\"0\" w:after=\"{after}\" w:line=\"276\" w:lineRule=\"auto\"/>"
            + (indent ? $"<w:ind w:firstLine=\"{Indent}\"/>" : string.Empty)
            + (justify ? "<w:jc w:val=\"both\"/>" : string.Empty);
        return $"<w:p><w:pPr>{props}</w:pPr>{runs}</w:p>";
    }
}
