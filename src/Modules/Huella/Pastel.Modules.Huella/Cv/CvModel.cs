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
    public CvHeader Header { get; set; } = new();

    public string Summary { get; set; } = string.Empty;

    public List<CvSkillGroup> Skills { get; set; } = [];

    public List<CvEntry> Experience { get; set; } = [];

    public List<CvEntry> Projects { get; set; } = [];

    public List<CvEducation> Education { get; set; } = [];

    public List<string> Extras { get; set; } = [];

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

/// <summary>Experiencia o proyecto. En un proyecto, <see cref="Title"/> es el nombre y <see cref="Subtitle"/> la tecnología.</summary>
internal sealed class CvEntry
{
    public string Title { get; set; } = string.Empty;

    public string Subtitle { get; set; } = string.Empty;

    public string? Location { get; set; }

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
    int BulletCharsPerLine)
{
    public const int BulletMin = 55;

    public static readonly IReadOnlyList<string> Levels = ["junior", "mid", "senior"];
    public static readonly IReadOnlyList<string> Papers = ["letter", "a4"];
    public static readonly IReadOnlyList<string> Languages = ["es", "en"];

    public static CvLimits For(string level, string paper)
    {
        var a4 = paper == "a4";
        return level switch
        {
            "junior" => new("junior", 1, 270, 4, 90, 22, 3, [5, 3, 0], 170, 2, [2, 2], 2, 2, a4 ? 53 : 50, a4 ? 90 : 93, a4 ? 88 : 91),
            "senior" => new("senior", 2, 380, 6, 180, 38, 6, [11, 9, 7, 5, 3, 0], 180, 1, [3], 2, 5, a4 ? 109 : 101, a4 ? 95 : 98, a4 ? 92 : 95),
            _ => new("mid", 2, 270, 5, 180, 30, 5, [9, 8, 6, 4, 2], 175, 2, [3, 3], 2, 4, a4 ? 103 : 97, a4 ? 90 : 93, a4 ? 88 : 91),
        };
    }

    /// <summary>Nivel sugerido por años de experiencia profesional (§6.1): Junior 0-3, Mid 3-8, Senior 8+.</summary>
    public static string SuggestLevel(int years) => years < 3 ? "junior" : years < 8 ? "mid" : "senior";
}
