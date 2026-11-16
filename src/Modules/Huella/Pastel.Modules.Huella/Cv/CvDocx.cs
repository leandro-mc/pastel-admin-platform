using System.IO.Compression;
using System.Text;
using System.Xml;

namespace Pastel.Modules.Huella.Cv;

/// <summary>
/// Genera el CV en formato Word (.docx) a partir del mismo <see cref="CvDocument"/> que el PDF. Se escribe el paquete Open XML
/// a mano (un zip con cinco partes fijas), sin dependencias nuevas y sin motor externo: siempre está disponible. El archivo
/// abre en Word, Google Docs y LibreOffice. Mismas reglas ATS que el PDF: una columna, texto real, viñetas de lista reales,
/// sin tablas ni imágenes y el contacto en el cuerpo, no en cabecera o pie.
/// </summary>
internal static class CvDocx
{
    public const string ContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    private const string W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    private const string Muted = "505050";

    /// <summary>Texto principal del CV como archivo .docx (bytes del zip).</summary>
    public static byte[] Build(CvDocument doc, CvRequestOptions options)
    {
        var en = options.Language == "en";
        var a4 = options.Paper == "a4";
        var labels = CvLabels.For(en);

        // Medidas en veinteavos de punto (twips): mismos márgenes que la plantilla del PDF (1,8 / 1,5 / 1,6 cm).
        var pageWidth = a4 ? 11906 : 12240;
        var pageHeight = a4 ? 16838 : 15840;
        const int marginSide = 1021;
        const int marginTop = 850;
        const int marginBottom = 907;
        var textWidth = pageWidth - (2 * marginSide);

        var body = new StringBuilder();

        body.Append(Paragraph("Title", Run(doc.Header.Name)));
        if (doc.Header.Headline.Length > 0)
        {
            body.Append(Paragraph("Subtitle", Run(doc.Header.Headline)));
        }

        foreach (var line in new[] { doc.Header.ContactLine1, doc.Header.ContactLine2 })
        {
            var joined = string.Join("  ·  ", line.Where(x => x.Length > 0));
            if (joined.Length > 0)
            {
                body.Append(Paragraph(null, Run(joined, color: Muted)));
            }
        }

        if (doc.Summary.Length > 0)
        {
            body.Append(Paragraph("Heading1", Run(labels.Summary)));
            body.Append(Paragraph(null, Run(doc.Summary)));
        }

        if (doc.Skills.Count > 0)
        {
            body.Append(Paragraph("Heading1", Run(labels.Skills)));
            foreach (var group in doc.Skills)
            {
                body.Append(Paragraph(null, Run(group.Label + ": ", bold: true) + Run(string.Join(", ", group.Items))));
            }
        }

        AppendEntries(body, labels.Experience, doc.Experience, textWidth);
        AppendEntries(body, labels.Projects, doc.Projects, textWidth);

        if (doc.Education.Count > 0)
        {
            body.Append(Paragraph("Heading1", Run(labels.Education)));
            foreach (var education in doc.Education)
            {
                var title = Run(education.Degree, bold: true) + Run(education.Institution.Length > 0 ? ", " + education.Institution : string.Empty);
                body.Append(Paragraph(null, title + DateTab(education.Dates), tabAt: textWidth, keepNext: !string.IsNullOrEmpty(education.Detail)));
                if (!string.IsNullOrEmpty(education.Detail))
                {
                    body.Append(Paragraph(null, Run(education.Detail, color: Muted, size: 19)));
                }
            }
        }

        if (doc.Extras.Count > 0)
        {
            body.Append(Paragraph("Heading1", Run(labels.Extras)));
            foreach (var extra in doc.Extras)
            {
                body.Append(Bullet(extra));
            }
        }

        var document =
            $"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="{W}"><w:body>{body}<w:sectPr><w:pgSz w:w="{pageWidth}" w:h="{pageHeight}"/><w:pgMar w:top="{marginTop}" w:right="{marginSide}" w:bottom="{marginBottom}" w:left="{marginSide}" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>""";

        using var stream = new MemoryStream();
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, leaveOpen: true))
        {
            Add(zip, "[Content_Types].xml", ContentTypesXml);
            Add(zip, "_rels/.rels", RootRelsXml);
            Add(zip, "docProps/core.xml", CoreXml($"{labels.DocumentTitle} — {doc.Header.Name}", doc.Header.Name, en));
            Add(zip, "word/document.xml", document);
            Add(zip, "word/_rels/document.xml.rels", DocumentRelsXml);
            Add(zip, "word/styles.xml", StylesXml(en));
            Add(zip, "word/numbering.xml", NumberingXml);
        }

        return stream.ToArray();
    }

    private static void AppendEntries(StringBuilder body, string heading, List<CvEntry> entries, int textWidth)
    {
        if (entries.Count == 0)
        {
            return;
        }

        body.Append(Paragraph("Heading1", Run(heading)));
        foreach (var entry in entries)
        {
            var title = Run(entry.Title, bold: true) + (entry.Subtitle.Length > 0 ? Run(" — " + entry.Subtitle) : string.Empty);
            var hasLocation = !string.IsNullOrEmpty(entry.Location);
            body.Append(Paragraph(null, title + DateTab(entry.Dates), tabAt: textWidth, keepNext: hasLocation || entry.Bullets.Count > 0, spaceBefore: 80));
            if (hasLocation)
            {
                body.Append(Paragraph(null, Run(entry.Location!, color: Muted, size: 19), keepNext: entry.Bullets.Count > 0));
            }

            foreach (var bullet in entry.Bullets)
            {
                body.Append(Bullet(bullet.Text));
            }
        }
    }

    // ───────────────────────────── Piezas de WordprocessingML ─────────────────────────────

    private static string DateTab(string dates) =>
        dates.Length == 0 ? string.Empty : "<w:r><w:tab/></w:r>" + Run(dates, color: Muted);

    private static string Run(string text, bool bold = false, string? color = null, int? size = null)
    {
        if (text.Length == 0)
        {
            return string.Empty;
        }

        var props = (bold ? "<w:b/>" : string.Empty)
            + (color is null ? string.Empty : $"<w:color w:val=\"{color}\"/>")
            + (size is null ? string.Empty : $"<w:sz w:val=\"{size}\"/><w:szCs w:val=\"{size}\"/>");
        var rPr = props.Length == 0 ? string.Empty : $"<w:rPr>{props}</w:rPr>";
        return $"<w:r>{rPr}<w:t xml:space=\"preserve\">{Escape(text)}</w:t></w:r>";
    }

    private static string Paragraph(string? style, string runs, int? tabAt = null, bool keepNext = false, int? spaceBefore = null)
    {
        var props = (style is null ? string.Empty : $"<w:pStyle w:val=\"{style}\"/>")
            + (keepNext ? "<w:keepNext/>" : string.Empty)
            + (tabAt is null ? string.Empty : $"<w:tabs><w:tab w:val=\"right\" w:pos=\"{tabAt}\"/></w:tabs>")
            + (spaceBefore is null ? string.Empty : $"<w:spacing w:before=\"{spaceBefore}\"/>");
        var pPr = props.Length == 0 ? string.Empty : $"<w:pPr>{props}</w:pPr>";
        return $"<w:p>{pPr}{runs}</w:p>";
    }

    private static string Bullet(string text) =>
        $"<w:p><w:pPr><w:pStyle w:val=\"ListBullet\"/><w:numPr><w:ilvl w:val=\"0\"/><w:numId w:val=\"1\"/></w:numPr></w:pPr>{Run(text)}</w:p>";

    /// <summary>Escapa el texto y descarta lo que XML 1.0 no admite (controles y sustitutos sueltos): el archivo siempre es válido.</summary>
    internal static string Escape(string text)
    {
        var sb = new StringBuilder(text.Length + 8);
        for (var i = 0; i < text.Length; i++)
        {
            var c = text[i];
            if (char.IsHighSurrogate(c) && i + 1 < text.Length && char.IsLowSurrogate(text[i + 1]))
            {
                sb.Append(c).Append(text[++i]);
                continue;
            }

            if (!XmlConvert.IsXmlChar(c))
            {
                continue;
            }

            sb.Append(c switch
            {
                '&' => "&amp;",
                '<' => "&lt;",
                '>' => "&gt;",
                '"' => "&quot;",
                '\'' => "&apos;",
                _ => c.ToString(),
            });
        }

        return sb.ToString();
    }

    private static void Add(ZipArchive zip, string path, string xml)
    {
        var entry = zip.CreateEntry(path, CompressionLevel.Optimal);
        using var writer = new StreamWriter(entry.Open(), new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
        writer.Write(xml);
    }

    // ───────────────────────────── Partes fijas del paquete ─────────────────────────────

    private const string ContentTypesXml =
        """<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>""";

    private const string RootRelsXml =
        """<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>""";

    private const string DocumentRelsXml =
        """<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>""";

    private static string CoreXml(string title, string author, bool en) =>
        $"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>{Escape(title)}</dc:title><dc:creator>{Escape(author)}</dc:creator><dc:language>{(en ? "en-US" : "es-ES")}</dc:language></cp:coreProperties>""";

    private static string StylesXml(bool en)
    {
        var lang = en ? "en-US" : "es-ES";
        return $"""
            <?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="{W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="{lang}" w:eastAsia="{lang}" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="252" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:after="60"/></w:pPr><w:rPr><w:b/><w:sz w:val="40"/><w:szCs w:val="40"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="80"/></w:pPr><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="969696"/></w:pBdr><w:spacing w:before="240" w:after="100"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:caps/><w:spacing w:val="8"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="ListBullet"><w:name w:val="List Bullet"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="40"/></w:pPr></w:style></w:styles>
            """;
    }

    private const string NumberingXml =
        $"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="{W}"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="340" w:hanging="227"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>""";
}
