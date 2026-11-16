namespace Pastel.Modules.Huella.Cv;

/// <summary>Cuánto ocupa una carta y cuánto cabe: la regla de «una sola página», igual que el cupo de un CV.</summary>
internal sealed record LetterFit(double Used, int Capacity, int BodyChars, int BodyMax)
{
    public bool Fits => Used <= Capacity;
}

/// <summary>
/// Cupo de una página para la carta. Se mide en renglones: cuántos caben según el papel y el tipo de letra (con un
/// interlineado de cálculo algo mayor que el real, para que el PDF y el Word siempre queden dentro) y cuántos ocupa cada
/// bloque de la carta (remitente, destinatario, asunto, saludo, párrafos, despedida y firma). Las medidas de la página
/// (márgenes de 2 cm arriba y abajo y 2,5 cm a los lados, Times 12 pt o Arial 11 pt) son las de <c>letter.typ</c> y
/// <c>LetterDocx</c>. La carta nunca se encoge para caber: se acorta el texto.
/// </summary>
internal static class LetterLayout
{
    /// <summary>Caracteres de sangría de la primera línea de cada párrafo, en caracteres de ancho medio.</summary>
    private const int IndentChars = 8;

    /// <summary>Medio renglón entre bloques del encabezado y entre párrafos.</summary>
    private const double Half = 0.5;

    /// <summary>Renglones de espacio para firmar entre la despedida y el nombre.</summary>
    private const double SignatureGap = 2;

    /// <summary>
    /// Renglones que caben en una página (Letter es más baja que A4; Arial 11 pt es más compacta que Times 12 pt). Medidos en el PDF
    /// y en el Word reales: el renglón mide unos 15,8 pt en Times 12 y 14,7 pt en Arial 11, sobre 678 pt (Letter) o 729 pt (A4) de alto útil.
    /// </summary>
    public static int Capacity(string font, string paper) =>
        (font, paper) switch
        {
            ("arial", "a4") => 49,
            ("arial", _) => 45,
            (_, "a4") => 45,
            _ => 42,
        };

    /// <summary>Caracteres por renglón: el promedio medido de un renglón lleno, con un 5 % menos por el ajuste de palabras.</summary>
    public static int CharsPerLine(string font, string paper) =>
        (font, paper) switch
        {
            ("arial", "a4") => 80,
            ("arial", _) => 85,
            (_, "a4") => 84,
            _ => 86,
        };

    private static double Lines(int chars, int width) => Math.Max(1, Math.Ceiling(chars / (double)width));

    /// <summary>Renglones que ocupa la carta con ese tipo de letra y papel.</summary>
    public static double Used(LetterDoc doc, string font, string paper)
    {
        var width = CharsPerLine(font, paper);

        // Encabezado: nombre y fecha comparten el primer renglón; debajo, el país o la ciudad.
        var used = 1.0 + (doc.Location.Length > 0 ? 1 : 0);
        if (doc.Recipient.Count > 0)
        {
            used += Half + doc.Recipient.Count;
        }

        if (doc.Subject.Length > 0)
        {
            // El asunto va en negrita, que ocupa más.
            used += Half + Lines(doc.Subject.Length + 9, width - 8);
        }

        used += Half + Lines(doc.Greeting.Length, width);

        // Un renglón en blanco antes del cuerpo y otro antes de la despedida.
        used += 1;
        foreach (var paragraph in doc.Paragraphs)
        {
            used += Lines(paragraph.Length + IndentChars, width);
        }

        used += Math.Max(0, doc.Paragraphs.Count - 1) * Half;
        used += 1 + Lines(doc.Closing.Length, width) + SignatureGap + 1;
        used += doc.Contact.Count(x => x.Length > 0);

        return used;
    }

    public static LetterFit Fit(LetterDoc doc, string font, string paper)
    {
        var width = CharsPerLine(font, paper);
        var capacity = Capacity(font, paper);
        var used = Used(doc, font, paper);
        var bodyChars = doc.Paragraphs.Sum(p => p.Length);

        // Cuántos caracteres de cuerpo caben con este encabezado: los renglones libres por lo que ocupa un párrafo medio.
        var paragraphs = Math.Max(1, doc.Paragraphs.Count);
        var bodyLines = doc.Paragraphs.Sum(p => Lines(p.Length + IndentChars, width)) + ((paragraphs - 1) * Half);
        var free = capacity - (used - bodyLines) - ((paragraphs - 1) * Half);
        var bodyMax = (int)Math.Max(0, (free * width) - (paragraphs * (IndentChars + (width / 2.0))));
        return new LetterFit(used, capacity, bodyChars, bodyMax);
    }

    /// <summary>
    /// Máximo de caracteres de cuerpo (todos los párrafos) para pedirle a la IA: el menor de los dos tipos de letra en ese papel,
    /// con un encabezado típico (destinatario y asunto de dos renglones, tres párrafos). Redondeado hacia abajo a 50.
    /// </summary>
    public static int BodyBudget(string paper)
    {
        var typical = new LetterDoc
        {
            Location = "Costa Rica",
            Contact = ["correo@ejemplo.com", "8888 8888"],
            Recipient = ["Equipo de selección", "Empresa"],
            Subject = new string('a', 75),
            Greeting = "Estimado equipo de la empresa:",
            Paragraphs = [new string('a', 400), new string('a', 400), new string('a', 400)],
            Closing = "Atentamente,",
        };
        var smallest = LetterLimits.Fonts.Min(font => Fit(typical, font, paper).BodyMax);
        return smallest / 50 * 50;
    }
}
