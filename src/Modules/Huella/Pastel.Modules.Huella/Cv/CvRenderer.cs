using Pastel.Documents;
using Pastel.SharedKernel;

namespace Pastel.Modules.Huella.Cv;

/// <summary>
/// Motor de PDF del CV. Recibe el <see cref="CvDocument"/> como datos JSON y una plantilla fija (<c>Templates/cv.typ</c>);
/// nunca código generado por la IA. Si el motor documental no está instalado responde 503
/// <c>huella.cv.renderer_unavailable</c> y el CV sigue disponible como texto ATS.
/// </summary>
internal interface ICvRenderer
{
    bool IsAvailable { get; }

    Task<Result<byte[]>> RenderPdfAsync(CvDocument document, CvRequestOptions options, CancellationToken cancellationToken);
}

internal sealed class TypstCvRenderer(IDocumentRenderer documents) : ICvRenderer
{
    private static readonly Lazy<string> Template = new(LoadTemplate);

    public bool IsAvailable => documents.IsAvailable;

    public async Task<Result<byte[]>> RenderPdfAsync(CvDocument document, CvRequestOptions options, CancellationToken cancellationToken)
    {
        if (!documents.IsAvailable)
        {
            return HuellaErrors.RendererUnavailable;
        }

        var pdf = await documents.RenderAsync(new DocumentRequest(Template.Value, DataJson(document, options), DocumentFormat.Pdf), cancellationToken);
        return pdf.IsFailure && pdf.Error.Code == DocumentErrors.Unavailable.Code ? HuellaErrors.RendererUnavailable : pdf;
    }

    /// <summary>Proyección del CV para la plantilla: solo texto ya validado y las etiquetas del idioma.</summary>
    internal static string DataJson(CvDocument doc, CvRequestOptions options)
    {
        var en = options.Language == "en";
        var data = new
        {
            lang = en ? "en" : "es",
            paper = options.Paper == "a4" ? "a4" : "letter",
            title = (en ? "Resume — " : "CV — ") + doc.Header.Name,
            name = doc.Header.Name,
            headline = doc.Header.Headline,
            contact1 = doc.Header.ContactLine1,
            contact2 = doc.Header.ContactLine2,
            summary = doc.Summary,
            labels = new
            {
                summary = en ? "Summary" : "Perfil profesional",
                skills = en ? "Skills" : "Habilidades técnicas",
                experience = en ? "Experience" : "Experiencia laboral",
                projects = en ? "Projects" : "Proyectos",
                education = en ? "Education" : "Educación",
                extras = en ? "Certifications and languages" : "Certificaciones e idiomas",
            },
            skills = doc.Skills.Select(g => new { label = g.Label, items = g.Items }),
            experience = doc.Experience.Select(Entry),
            projects = doc.Projects.Select(Entry),
            education = doc.Education.Select(e => new { degree = e.Degree, institution = e.Institution, dates = e.Dates, detail = e.Detail }),
            extras = doc.Extras,
        };
        return HuellaJson.Serialize(data);
    }

    private static object Entry(CvEntry e) => new
    {
        title = e.Title,
        subtitle = e.Subtitle,
        location = e.Location,
        dates = e.Dates,
        bullets = e.Bullets.Select(b => b.Text),
    };

    private static string LoadTemplate()
    {
        var assembly = typeof(TypstCvRenderer).Assembly;
        var name = assembly.GetManifestResourceNames().Single(n => n.EndsWith("Templates.cv.typ", StringComparison.Ordinal));
        using var stream = assembly.GetManifestResourceStream(name)!;
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
}
