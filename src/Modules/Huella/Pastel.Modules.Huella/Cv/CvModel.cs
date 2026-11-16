using System.Text.Json;
using System.Text.Json.Serialization;

namespace Pastel.Modules.Huella.Cv;

/// <summary>
/// Documento del CV: lo único que produce la IA (siempre JSON, nunca Typst ni LaTeX) y lo que guarda
/// <c>CvVersion.ContentJson</c>. Una plantilla fija lo convierte en PDF (CCR-2); los datos nunca se concatenan dentro del
/// código de la plantilla. Cada viñeta cita los logros del banco de los que sale (<see cref="CvBullet.SourceIds"/>).
/// </summary>
internal sealed class CvDocument
{
    /// <summary>Idioma en que está redactado (<c>es</c> o <c>en</c>); lo usa la vista pública del CV para sus títulos.</summary>
    public string? Language { get; set; }

    /// <summary><see cref="CvFormats.Standard"/> (CV propio, pensado para filtros ATS) o <see cref="CvFormats.Competencies"/> (formato de intermediación laboral).</summary>
    public string Format { get; set; } = CvFormats.Standard;

    public CvHeader Header { get; set; } = new();

    public string Summary { get; set; } = string.Empty;

    public List<CvSkillGroup> Skills { get; set; } = [];

    /// <summary>Competencias personales y técnicas del catálogo del banco (solo en el formato de competencias).</summary>
    public List<CvCompetencyGroup> Competencies { get; set; } = [];

    public List<CvEntry> Experience { get; set; } = [];

    public List<CvEntry> Projects { get; set; } = [];

    public List<CvEducation> Education { get; set; } = [];

    public List<string> Extras { get; set; } = [];

    /// <summary>Título de la sección de <see cref="Extras"/> cuando no es el de siempre (p. ej. solo «Idiomas» si no hay certificaciones). <c>null</c> = el título por defecto.</summary>
    public string? ExtrasLabel { get; set; }

    public IEnumerable<CvBullet> AllBullets() => Experience.Concat(Projects).SelectMany(e => e.Bullets);
}

internal sealed class CvHeader
{
    public string Name { get; set; } = string.Empty;

    public string Headline { get; set; } = string.Empty;

    /// <summary>Ciudad, correo y teléfono: en el cuerpo de la primera página, nunca en cabecera o pie del documento.</summary>
    public List<string> ContactLine1 { get; set; } = [];

    /// <summary>Enlaces, con la URL visible.</summary>
    public List<string> ContactLine2 { get; set; } = [];
}

internal sealed class CvSkillGroup
{
    public string Label { get; set; } = string.Empty;

    public List<string> Items { get; set; } = [];

    [JsonIgnore]
    public string Line => Label + ": " + string.Join(", ", Items);
}

/// <summary>Competencias de un mismo tipo (<c>personal</c> o <c>technical</c>) con su título.</summary>
internal sealed class CvCompetencyGroup
{
    public string Kind { get; set; } = string.Empty;

    public string Label { get; set; } = string.Empty;

    public List<CvCompetency> Items { get; set; } = [];
}

/// <summary>Una competencia del catálogo y, opcionalmente, una frase corta con la evidencia que la respalda.</summary>
internal sealed class CvCompetency
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Note { get; set; }
}

/// <summary>Tipos de CV que genera Huella.</summary>
internal static class CvFormats
{
    public const string Standard = "standard";
    public const string Competencies = "competencies";

    public static readonly IReadOnlyList<string> All = [Standard, Competencies];
}

/// <summary>Experiencia o proyecto. En un proyecto, <see cref="Title"/> es el nombre y <see cref="Subtitle"/> la tecnología.</summary>
internal sealed class CvEntry
{
    public string Title { get; set; } = string.Empty;

    public string Subtitle { get; set; } = string.Empty;

    public string? Location { get; set; }

    /// <summary>Qué fue esa experiencia cuando no es un empleo (práctica supervisada, proyecto académico, asistencia universitaria); va en cursiva junto a la empresa.</summary>
    public string? Context { get; set; }

    public string Dates { get; set; } = string.Empty;

    /// <summary>Líneas de viñetas disponibles para esta entrada según el nivel (presupuesto de §6.4).</summary>
    public int LineBudget { get; set; }

    public List<CvBullet> Bullets { get; set; } = [];
}

internal sealed class CvBullet
{
    public string Text { get; set; } = string.Empty;

    public List<Guid> SourceIds { get; set; } = [];

    /// <summary>Variante corta del logro de origen: la escalera de ajuste la usa sin llamar a la IA.</summary>
    public string? ShortText { get; set; }

    /// <summary>Relevancia calculada al componer; decide qué viñeta se retira primero.</summary>
    public double Score { get; set; }
}

internal sealed class CvEducation
{
    public string Degree { get; set; } = string.Empty;

    public string Institution { get; set; } = string.Empty;

    public string Dates { get; set; } = string.Empty;

    public string? Detail { get; set; }
}

/// <summary>Opciones con que se generó un CV.</summary>
internal sealed record CvRequestOptions(string Level, string Paper, string Language);

/// <summary>Serialización única de los JSON que Huella guarda (camelCase, como la API).</summary>
internal static class HuellaJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);

    public static string Serialize<T>(T value) => JsonSerializer.Serialize(value, Options);

    public static T? Deserialize<T>(string? json)
        where T : class =>
        string.IsNullOrWhiteSpace(json) ? null : JsonSerializer.Deserialize<T>(json, Options);
}

/// <summary>
/// Límites verificados por <c>docs/requirements/huella/cv-spec</c> (<c>build_limits.py</c> y la prueba de estrés): presupuesto
/// de líneas (LU) por nivel y papel, topes por elemento y cupos por sección.
/// </summary>
internal sealed record CvLimits(
    string Level,
    int Pages,
    int SummaryMax,
    int SkillGroups,
    int SkillLineChars,
    int SkillsTotal,
    int Entries,
    IReadOnlyList<int> EntryLines,
    int BulletMax,
    int ProjectCount,
    IReadOnlyList<int> ProjectLines,
    int EducationCount,
    int CertificationCount,
    int CapacityLu,
    int CharsPerLine,
    int BulletCharsPerLine,
    int PersonalCompetencies = 0,
    int TechnicalCompetencies = 0)
{
    /// <summary>Tope de la frase de evidencia de una competencia.</summary>
    public const int CompetencyNoteMax = 70;

    public const int BulletMin = 55;

    public static readonly IReadOnlyList<string> Levels = ["junior", "mid", "senior"];
    public static readonly IReadOnlyList<string> Papers = ["letter", "a4"];
    public static readonly IReadOnlyList<string> Languages = ["es", "en"];

    public static CvLimits For(string level, string paper, string format = CvFormats.Standard)
    {
        // Capacidad en líneas (LU) medida con la plantilla vigente (Liberation Sans 10 pt): Letter 55 líneas por página, A4 59;
        // la estimación de CvLayout.Total queda ~3 % por encima de lo real, así el CV nunca desborda la página que promete.
        var a4 = paper == "a4";
        var limits = level switch
        {
            "junior" => new CvLimits("junior", 1, 300, 4, 95, 24, 3, [3, 5, 3], 170, 2, [2, 2], 2, 2, a4 ? 59 : 56, a4 ? 90 : 93, a4 ? 88 : 91),
            "senior" => new CvLimits("senior", 2, 380, 6, 180, 36, 6, [11, 9, 7, 5, 3, 0], 180, 1, [3], 2, 5, a4 ? 118 : 111, a4 ? 95 : 98, a4 ? 92 : 95),
            _ => new CvLimits("mid", 2, 300, 5, 180, 30, 5, [9, 8, 6, 4, 2], 175, 2, [3, 3], 2, 4, a4 ? 114 : 107, a4 ? 90 : 93, a4 ? 88 : 91),
        };
        if (format != CvFormats.Competencies)
        {
            return limits;
        }

        // Formato de competencias: sin proyectos ni habilidades sueltas; las competencias (personales y técnicas) ocupan su lugar.
        var (personal, technical) = level == "junior" ? (6, 6) : (8, 8);
        // Sin proyectos y con las competencias en dos renglones, la experiencia recibe más líneas.
        IReadOnlyList<int> entryLines = level == "junior" ? [4, 6, 4] : limits.EntryLines;
        return limits with { EntryLines = entryLines, ProjectCount = 0, ProjectLines = [], SkillGroups = 0, SkillsTotal = 0, PersonalCompetencies = personal, TechnicalCompetencies = technical, CertificationCount = level == "junior" ? 1 : limits.CertificationCount };
    }

    /// <summary>Nivel sugerido por años de experiencia profesional (§6.1): Junior 0-3, Mid 3-8, Senior 8+.</summary>
    public static string SuggestLevel(int years) => years < 3 ? "junior" : years < 8 ? "mid" : "senior";
}
