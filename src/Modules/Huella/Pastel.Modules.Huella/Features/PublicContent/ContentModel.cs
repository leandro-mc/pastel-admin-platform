using System.Security.Cryptography;
using System.Text;
using Pastel.Modules.Huella.Cv;

namespace Pastel.Modules.Huella.Features.PublicContent;

/// <summary>Máximos del perfil público: cada sección muestra solo lo principal, nunca todo el banco.</summary>
internal static class ContentCaps
{
    public const int Headline = 90;
    public const int Summary = 420;
    public const int Highlights = 3;
    public const int HighlightText = 150;
    public const int Figure = 24;
    public const int Experience = 4;
    public const int ExperienceBullets = 3;
    public const int Bullet = 170;
    public const int Title = 120;
    public const int Projects = 3;
    public const int ProjectSummary = 200;
    public const int SkillGroups = 5;
    public const int SkillsPerGroup = 8;
    public const int SkillsTotal = 20;
    public const int SkillLabel = 30;
    public const int SkillName = 40;
    public const int Education = 3;
    public const int Certifications = 4;
    public const int Languages = 5;
    public const int Note = 120;
    public const int LanguageName = 60;
    public const int LanguageLevel = 24;
}

/// <summary>Secciones del perfil público que se generan, editan y traducen una a una.</summary>
internal static class ContentSections
{
    public const string Overview = "overview";
    public const string Experience = "experience";
    public const string Projects = "projects";
    public const string Skills = "skills";
    public const string Credentials = "credentials";

    /// <summary>Orden de generación: primero lo que se elige del banco; el titular y el resumen sintetizan lo ya elegido.</summary>
    public static readonly IReadOnlyList<string> All = [Experience, Projects, Skills, Credentials, Overview];

    public static bool IsValid(string? section) => section is not null && All.Contains(section);

    /// <summary>Copia solo los campos de una sección de un documento a otro.</summary>
    public static void Copy(ContentDoc from, ContentDoc to, string section)
    {
        switch (section)
        {
            case Overview:
                to.Headline = from.Headline;
                to.Summary = from.Summary;
                to.Highlights = from.Highlights;
                break;
            case Experience:
                to.Experience = from.Experience;
                break;
            case Projects:
                to.Projects = from.Projects;
                break;
            case Skills:
                to.Skills = from.Skills;
                break;
            case Credentials:
                to.Education = from.Education;
                to.Certifications = from.Certifications;
                to.Languages = from.Languages;
                break;
        }
    }

    public static bool IsEmpty(ContentDoc doc, string section) =>
        section switch
        {
            Overview => doc.Headline.Length == 0 && doc.Summary.Length == 0 && doc.Highlights.Count == 0,
            Experience => doc.Experience.Count == 0,
            Projects => doc.Projects.Count == 0,
            Skills => doc.Skills.Count == 0,
            Credentials => doc.Education.Count == 0 && doc.Certifications.Count == 0 && doc.Languages.Count == 0,
            _ => true,
        };

    /// <summary>Huella corta del contenido de una sección: cambia cuando cambia cualquier texto o elemento.</summary>
    public static string Hash(ContentDoc doc, string section)
    {
        var only = new ContentDoc();
        Copy(doc, only, section);
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(HuellaJson.Serialize(only))), 0, 8);
    }
}

/// <summary>Contenido de un idioma. Los hechos (empresa, fechas, institución) vienen del banco; los textos, de la IA o de la persona.</summary>
internal sealed class ContentDoc
{
    public string Headline { get; set; } = string.Empty;

    public string Summary { get; set; } = string.Empty;

    public List<ContentHighlight> Highlights { get; set; } = [];

    public List<ContentExperience> Experience { get; set; } = [];

    public List<ContentProject> Projects { get; set; } = [];

    public List<ContentSkillGroup> Skills { get; set; } = [];

    public List<ContentEducation> Education { get; set; } = [];

    public List<ContentCertification> Certifications { get; set; } = [];

    public List<ContentLanguage> Languages { get; set; } = [];
}

/// <summary>Línea destacada: la cifra primero (opcional) y el texto.</summary>
internal sealed class ContentHighlight
{
    public string? Figure { get; set; }

    public string Text { get; set; } = string.Empty;
}

internal sealed class ContentExperience
{
    public Guid SourceId { get; set; }

    public string Role { get; set; } = string.Empty;

    public string Company { get; set; } = string.Empty;

    public string? Location { get; set; }

    /// <summary><c>AAAA-MM</c>; la interfaz le da formato según el idioma.</summary>
    public string Start { get; set; } = string.Empty;

    public string? End { get; set; }

    public List<string> Bullets { get; set; } = [];
}

internal sealed class ContentProject
{
    public Guid SourceId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Url { get; set; }

    public string? Stack { get; set; }

    public string Summary { get; set; } = string.Empty;
}

internal sealed class ContentSkillGroup
{
    public string Label { get; set; } = string.Empty;

    public List<string> Items { get; set; } = [];
}

internal sealed class ContentEducation
{
    public Guid SourceId { get; set; }

    public string Degree { get; set; } = string.Empty;

    public string Institution { get; set; } = string.Empty;

    public int? StartYear { get; set; }

    public int? EndYear { get; set; }

    public string? Note { get; set; }
}

internal sealed class ContentCertification
{
    public Guid SourceId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Issuer { get; set; }

    public int? Year { get; set; }

    public string? Url { get; set; }
}

internal sealed class ContentLanguage
{
    public Guid SourceId { get; set; }

    public string Language { get; set; } = string.Empty;

    public string Level { get; set; } = string.Empty;
}

/// <summary>
/// Estado de una sección: huella del español actual y huella del español de la que salió el inglés. Si difieren, el
/// inglés está desactualizado y hay que reescribirlo.
/// </summary>
internal sealed class SectionState
{
    public string? EsHash { get; set; }

    public string? EnFromHash { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }
}
