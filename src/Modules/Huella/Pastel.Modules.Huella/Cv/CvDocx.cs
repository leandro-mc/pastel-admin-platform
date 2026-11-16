using System.Globalization;
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
    private const string R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    internal const string Muted = "555555";

    /// <summary>Texto principal del CV como archivo .docx (bytes del zip).</summary>
    public static byte[] Build(CvDocument doc, CvRequestOptions options)
    {
        var en = options.Language == "en";
        var a4 = options.Paper == "a4";
        var labels = CvLabels.For(en);

        // Medidas en veinteavos de punto (twips): mismos márgenes que la plantilla del PDF (1,9 / 1,6 / 1,7 cm).
        var pageWidth = a4 ? 11906 : 12240;
        var pageHeight = a4 ? 16838 : 15840;
        const int marginSide = 1077;
        const int marginTop = 907;
        const int marginBottom = 964;
        var textWidth = pageWidth - (2 * marginSide);

        var body = new StringBuilder();

        // Encabezado centrado, como el PDF.
        body.Append(Paragraph("Title", Run(doc.Header.Name)));
        if (doc.Header.Headline.Length > 0)
        {
            body.Append(Paragraph("Subtitle", Run(doc.Header.Headline)));
        }

        // Contacto: el correo y los enlaces son vínculos reales (relaciones externas del paquete); el texto visible no cambia.
        var links = new List<(string Id, string Url)>();
        foreach (var line in new[] { doc.Header.ContactLine1, doc.Header.ContactLine2 })
        {
            var items = line.Where(x => x.Length > 0).ToList();
            if (items.Count == 0)
            {
                continue;
            }

            var runs = new StringBuilder();
            for (var i = 0; i < items.Count; i++)
            {
                if (i > 0)
                {
                    runs.Append(Run("  |  ", color: Muted));
                }

                if (ContactHref(items[i], line == doc.Header.ContactLine2) is { } href)
                {
                    var id = $"rIdL{links.Count + 1}";
                    links.Add((id, href));
                    runs.Append(CultureInfo.InvariantCulture, $"<w:hyperlink r:id=\"{id}\">{Run(items[i], color: Muted)}</w:hyperlink>");
                }
                else
                {
                    runs.Append(Run(items[i], color: Muted));
                }
            }

            body.Append(Paragraph("Contact", runs.ToString()));
        }

        void Summary()
        {
            if (doc.Summary.Length > 0)
            {
                body.Append(Paragraph("Heading1", Run(labels.Summary)));
                body.Append(Paragraph(null, Run(doc.Summary)));
            }
        }

        void Skills()
        {
            if (doc.Skills.Count == 0)
            {
                return;
            }

            body.Append(Paragraph("Heading1", Run(labels.Skills)));
            foreach (var group in doc.Skills)
            {
                body.Append(Paragraph(null, Run(group.Label + ": ", bold: true) + Run(string.Join(", ", group.Items)), spaceAfter: 40));
            }
        }

        void Competencies()
        {
            if (doc.Competencies.Count == 0)
            {
                return;
            }

            body.Append(Paragraph("Heading1", Run(labels.Competencies)));
            foreach (var group in doc.Competencies)
            {
                body.Append(Paragraph(null, Run(group.Label + ": ", bold: true) + Run(string.Join(", ", group.Items.Select(c => c.Name))), spaceAfter: 40));
            }
        }

        void Education()
        {
            if (doc.Education.Count == 0)
            {
                return;
            }

            body.Append(Paragraph("Heading1", Run(labels.Education)));
            foreach (var education in doc.Education)
            {
                body.Append(Head(education.Degree, ", ", education.Institution, education.Dates, string.IsNullOrEmpty(education.Detail) ? null : education.Detail, textWidth, keepNext: false, spaceBefore: 60));
            }
        }

        void Extras()
        {
            if (doc.Extras.Count == 0)
            {
                return;
            }

            body.Append(Paragraph("Heading1", Run(doc.ExtrasLabel ?? labels.Extras)));
            foreach (var extra in doc.Extras)
            {
                body.Append(Bullet(Run(extra)));
            }
        }

        Summary();
        if (doc.Format == CvFormats.Competencies)
        {
            AppendEntries(body, labels.Experience, doc.Experience, textWidth, experience: true);
            Competencies();
            Education();
            Extras();
        }
        else
        {
            AppendEntries(body, labels.Experience, doc.Experience, textWidth, experience: true);
            AppendEntries(body, labels.Projects, doc.Projects, textWidth, experience: false);
            Skills();
            Education();
            Extras();
        }

        return Package(body.ToString(), pageWidth, pageHeight, marginTop, marginSide, marginBottom, $"{labels.DocumentTitle} — {doc.Header.Name}", doc.Header.Name, en, "Arial", 20, links);
    }

    /// <summary>
    /// Destino de un dato de contacto: <c>mailto:</c> para el correo y <c>https://</c> para un enlace (se guarda sin el esquema).
    /// Solo se vinculan textos sin espacios con forma de correo o de dominio; lo demás queda como texto.
    /// </summary>
    internal static string? ContactHref(string text, bool isLink)
    {
        if (text.Contains(' ', StringComparison.Ordinal) || text.Length > 200)
        {
            return null;
        }

        if (!isLink)
        {
            return text.Contains('@', StringComparison.Ordinal) ? "mailto:" + text : null;
        }

        var url = text.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ? text : "https://" + text;
        return Uri.TryCreate(url, UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps && uri.Host.Contains('.', StringComparison.Ordinal) ? uri.AbsoluteUri : null;
    }

    /// <summary>Arma el paquete .docx (zip con las partes fijas) alrededor del cuerpo ya escrito; lo comparten el CV y la carta.</summary>
    internal static byte[] Package(string body, int pageWidth, int pageHeight, int marginTop, int marginSide, int marginBottom, string title, string author, bool en, string font = "Calibri", int halfPoints = 21, IReadOnlyList<(string Id, string Url)>? links = null)
    {
        var document =
            $"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="{W}" xmlns:r="{R}"><w:body>{body}<w:sectPr><w:pgSz w:w="{pageWidth}" w:h="{pageHeight}"/><w:pgMar w:top="{marginTop}" w:right="{marginSide}" w:bottom="{marginBottom}" w:left="{marginSide}" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>""";

        using var stream = new MemoryStream();
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, leaveOpen: true))
        {
            Add(zip, "[Content_Types].xml", ContentTypesXml);
            Add(zip, "_rels/.rels", RootRelsXml);
            Add(zip, "docProps/core.xml", CoreXml(title, author, en));
            Add(zip, "word/document.xml", document);
            Add(zip, "word/_rels/document.xml.rels", DocumentRelsXml(links ?? []));
            Add(zip, "word/styles.xml", StylesXml(en, font, halfPoints));
            Add(zip, "word/numbering.xml", NumberingXml);
        }

        return stream.ToArray();
    }

    private static void AppendEntries(StringBuilder body, string heading, List<CvEntry> entries, int textWidth, bool experience)
    {
        if (entries.Count == 0)
        {
            return;
        }

        body.Append(Paragraph("Heading1", Run(heading)));
        foreach (var entry in entries)
        {
            if (!experience)
            {
                // Proyecto: el nombre y, debajo, las tecnologías.
                body.Append(Paragraph(null, Run(entry.Title, bold: true), keepNext: entry.Subtitle.Length > 0 || entry.Bullets.Count > 0, spaceBefore: 100, spaceAfter: 0));
                if (entry.Subtitle.Length > 0)
                {
                    body.Append(Paragraph(null, Run(entry.Subtitle, color: Muted, size: 19), keepNext: entry.Bullets.Count > 0, spaceAfter: 20));
                }
            }
            else
            {
                // Experiencia: cargo y fechas; debajo, la empresa en negrita y, junto a ella, qué fue (cursiva).
                body.Append(Paragraph(null, Run(entry.Title, bold: true) + DateTab(entry.Dates), tabAt: textWidth, keepNext: true, spaceBefore: 100, spaceAfter: 0));
                // Si la empresa y su contexto no caben en un renglón, el contexto pasa completo al siguiente (como en el PDF).
                var company = Run(entry.Subtitle, bold: true);
                var hasContext = !string.IsNullOrEmpty(entry.Context);
                var stacked = hasContext && entry.Subtitle.Length + entry.Context!.Length > 78;
                if (hasContext && !stacked)
                {
                    company += Run("   ") + Run(entry.Context!, color: Muted, italic: true);
                }

                body.Append(Paragraph(null, company, keepNext: stacked || entry.Bullets.Count > 0, spaceAfter: stacked ? 0 : 20));
                if (stacked)
                {
                    body.Append(Paragraph(null, Run(entry.Context!, color: Muted, italic: true), keepNext: entry.Bullets.Count > 0, spaceAfter: 20));
                }
            }

            foreach (var bullet in entry.Bullets)
            {
                body.Append(Bullet(Run(bullet.Text)));
            }
        }
    }

    /// <summary>
    /// Cabecera de una entrada: «Título — Subtítulo» y las fechas a la derecha en un renglón si caben (se estima por caracteres);
    /// si no, el subtítulo pasa completo al renglón siguiente junto con el lugar, para que no quede una palabra suelta.
    /// </summary>
    private static string Head(string title, string sep, string subtitle, string dates, string? extra, int textWidth, bool keepNext, int spaceBefore)
    {
        var sb = new StringBuilder();
        var oneLine = title.Length + (subtitle.Length > 0 ? sep.Length + subtitle.Length : 0) + dates.Length <= 92;
        if (oneLine)
        {
            var line = Run(title, bold: true) + (subtitle.Length > 0 ? Run(sep + subtitle) : string.Empty);
            sb.Append(Paragraph(null, line + DateTab(dates), tabAt: textWidth, keepNext: keepNext || extra is not null, spaceBefore: spaceBefore));
            if (extra is not null)
            {
                sb.Append(Paragraph(null, Run(extra, color: Muted, size: 19), keepNext: keepNext));
            }
        }
        else
        {
            sb.Append(Paragraph(null, Run(title, bold: true) + DateTab(dates), tabAt: textWidth, keepNext: true, spaceBefore: spaceBefore));
            if (subtitle.Length > 0 || extra is not null)
            {
                var second = Run(subtitle) + (extra is null ? string.Empty : Run((subtitle.Length > 0 ? " · " : string.Empty) + extra, color: Muted, size: 19));
                sb.Append(Paragraph(null, second, keepNext: keepNext));
            }
        }

        return sb.ToString();
    }

    // ───────────────────────────── Piezas de WordprocessingML ─────────────────────────────

    private static string DateTab(string dates) =>
        dates.Length == 0 ? string.Empty : "<w:r><w:tab/></w:r>" + Run(dates, color: Muted);

    internal static string Run(string text, bool bold = false, string? color = null, int? size = null, bool italic = false)
    {
        if (text.Length == 0)
        {
            return string.Empty;
        }

        var props = (bold ? "<w:b/>" : string.Empty)
            + (italic ? "<w:i/>" : string.Empty)
            + (color is null ? string.Empty : $"<w:color w:val=\"{color}\"/>")
            + (size is null ? string.Empty : $"<w:sz w:val=\"{size}\"/><w:szCs w:val=\"{size}\"/>");
        var rPr = props.Length == 0 ? string.Empty : $"<w:rPr>{props}</w:rPr>";
        return $"<w:r>{rPr}<w:t xml:space=\"preserve\">{Escape(text)}</w:t></w:r>";
    }

    internal static string Paragraph(string? style, string runs, int? tabAt = null, bool keepNext = false, int? spaceBefore = null, int? spaceAfter = null)
    {
        var spacing = (spaceBefore is null ? string.Empty : $" w:before=\"{spaceBefore}\"") + (spaceAfter is null ? string.Empty : $" w:after=\"{spaceAfter}\"");
        var props = (style is null ? string.Empty : $"<w:pStyle w:val=\"{style}\"/>")
            + (keepNext ? "<w:keepNext/>" : string.Empty)
            + (tabAt is null ? string.Empty : $"<w:tabs><w:tab w:val=\"right\" w:pos=\"{tabAt}\"/></w:tabs>")
            + (spacing.Length == 0 ? string.Empty : $"<w:spacing{spacing}/>");
        var pPr = props.Length == 0 ? string.Empty : $"<w:pPr>{props}</w:pPr>";
        return $"<w:p>{pPr}{runs}</w:p>";
    }

    private static string Bullet(string runs) =>
        $"<w:p><w:pPr><w:pStyle w:val=\"ListBullet\"/><w:numPr><w:ilvl w:val=\"0\"/><w:numId w:val=\"1\"/></w:numPr></w:pPr>{runs}</w:p>";

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

    private static string DocumentRelsXml(IReadOnlyList<(string Id, string Url)> links)
    {
        var external = string.Concat(links.Select(l =>
            $"<Relationship Id=\"{l.Id}\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink\" Target=\"{Escape(l.Url)}\" TargetMode=\"External\"/>"));
        return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>"""
            + external + "</Relationships>";
    }

    private static string CoreXml(string title, string author, bool en) =>
        $"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>{Escape(title)}</dc:title><dc:creator>{Escape(author)}</dc:creator><dc:language>{(en ? "en-US" : "es-ES")}</dc:language></cp:coreProperties>""";

    private static string StylesXml(bool en, string font, int halfPoints)
    {
        var lang = en ? "en-US" : "es-ES";
        return $"""
            <?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="{W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="{font}" w:hAnsi="{font}" w:eastAsia="{font}" w:cs="{font}"/><w:sz w:val="{halfPoints}"/><w:szCs w:val="{halfPoints}"/><w:lang w:val="{lang}" w:eastAsia="{lang}" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="252" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:rPr><w:b/><w:sz w:val="40"/><w:szCs w:val="42"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="40" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Contact"><w:name w:val="Contact"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="464646"/></w:pBdr><w:spacing w:before="260" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="ListBullet"><w:name w:val="List Bullet"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="50"/></w:pPr></w:style></w:styles>
            """;
    }

    private const string NumberingXml =
        $"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="{W}"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="340" w:hanging="227"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>""";
}
