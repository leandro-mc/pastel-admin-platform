using System.Text.Json;
using Pastel.Modules.Huella.Ai;
using Pastel.Modules.Huella.Cv;
using Pastel.Modules.Huella.Domain;
using Pastel.Modules.Huella.Persistence;
using Xunit;

namespace Pastel.Modules.Huella.Tests;

/// <summary>Formato combinado: competencias del catálogo y habilidades técnicas por categoría en un mismo CV, sin proyectos.</summary>
public sealed class CvCombinedFormatTests
{
    private static (AiBank Bank, Experience Current, Competency[] Personal, Competency[] Technical) Build()
    {
        var profileId = Guid.CreateVersion7();
        var profile = new Profile { Id = profileId, DisplayName = "Ana Pérez", Headline = "Ingeniera" };
        var current = new Experience
        {
            Id = Guid.CreateVersion7(), ProfileId = profileId, Role = "Desarrolladora", Company = "Universidad X", StartDate = new(2026, 8, 1), IsVisible = true,
            Narrative = "Lideré el módulo de ensamblaje con 5 expertos.",
        };
        Skill S(string name, string category) => new() { Id = Guid.CreateVersion7(), ProfileId = profileId, Name = name, Category = category, IsVisible = true };
        Competency C(string name, string kind) => new() { Id = Guid.CreateVersion7(), ProfileId = profileId, Name = name, Kind = kind, Description = "d", Evidence = "e", IsVisible = true };
        var personal = new[] { C("Adaptabilidad", CompetencyKinds.Personal), C("Comunicación efectiva", CompetencyKinds.Personal) };
        var technical = new[] { C("Pruebas de software", CompetencyKinds.Technical) };
        var records = new BankRecords([], [current], [], [], [S("Java", "Lenguajes"), S("Vue 3", "Frontend")], [], [], [], [], [.. personal, .. technical]);
        return (new AiBank(profile, new PrivateNote { ProfileId = profileId }, records, 2026, new DateOnly(2026, 11, 23)), current, personal, technical);
    }

    // Los otros dos formatos no cambian y el combinado reparte el espacio: sin proyectos, con competencias y menos habilidades.
    [Fact]
    public void CombinedLimitsDropProjectsAndKeepBothLists()
    {
        var combined = CvLimits.For("mid", "letter", CvFormats.Combined);

        Assert.Equal(0, combined.ProjectCount);
        Assert.Equal(6, combined.PersonalCompetencies);
        Assert.Equal(5, combined.TechnicalCompetencies);
        Assert.Equal(4, combined.SkillGroups);
        Assert.Equal(24, combined.SkillsTotal);
        Assert.Equal(2, CvLimits.For("mid", "letter", CvFormats.Standard).ProjectCount);
        Assert.Equal(0, CvLimits.For("mid", "letter", CvFormats.Competencies).SkillGroups);
        Assert.Contains(CvFormats.Combined, CvFormats.All);
    }

    // Integridad: la respuesta trae competencias del catálogo (por id) y habilidades del banco; ninguna se inventa.
    [Fact]
    public void ACombinedAnswerKeepsCatalogCompetenciesAndBankSkillsAndNoProjects()
    {
        var (bank, current, personal, technical) = Build();
        var json = JsonSerializer.Serialize(new
        {
            versions = new[]
            {
                new
                {
                    language = "es",
                    headline = "Desarrolladora",
                    summary = "Desarrolladora con experiencia en sistemas.",
                    competencies = new
                    {
                        personal = personal.Select(c => new { id = c.Id, name = c.Name }).Append(new { id = Guid.NewGuid(), name = "Inventada" }).ToArray(),
                        technical = technical.Select(c => new { id = c.Id, name = c.Name }).ToArray(),
                    },
                    skills = new[] { new { label = "Lenguajes", items = new[] { "Java", "Kubernetes" } } },
                    experience = new object[] { new { id = current.Id, title = "Desarrolladora", context = (string?)null, bullets = new[] { new { text = "Lideré el módulo de ensamblaje con 5 expertos y entregué el motor de fórmulas.", @short = "Lideré el módulo con 5 expertos." } } } },
                    education = Array.Empty<object>(),
                    certifications = Array.Empty<object>(),
                    languages = Array.Empty<object>(),
                },
            },
        });

        var (versions, _) = CvAiCompose.Parse(json, bank, new CvComposeRequest("mid", "letter", ["es"], CvFormats.Combined));

        var doc = Assert.Single(versions).Document;
        Assert.Equal(CvFormats.Combined, doc.Format);
        Assert.Empty(doc.Projects);
        Assert.Equal(["Adaptabilidad", "Comunicación efectiva"], doc.Competencies.Single(g => g.Kind == "personal").Items.Select(c => c.Name));
        Assert.Equal(["Java"], doc.Skills.SelectMany(g => g.Items));
    }

    // El pedido a la IA y el orden del documento siguen al formato.
    [Fact]
    public void ThePromptAndTheSectionOrderFollowTheFormat()
    {
        var (bank, _, _, _) = Build();
        var analysis = OfferAnalyzer.Analyze("Java", isFocus: false, bank.Data);

        var combined = CvAiCompose.BuildPackage(bank, analysis, "Java", null, new CvComposeRequest("mid", "letter", ["es"], CvFormats.Combined));
        var standard = CvAiCompose.BuildPackage(bank, analysis, "Java", null, new CvComposeRequest("mid", "letter", ["es"]));
        var competencies = CvAiCompose.BuildPackage(bank, analysis, "Java", null, new CvComposeRequest("mid", "letter", ["es"], CvFormats.Competencies));

        Assert.Contains("- competencies:", combined.Prompt);
        Assert.Contains("- skills:", combined.Prompt);
        Assert.DoesNotContain("- projects:", combined.Prompt);
        Assert.Contains("- projects:", standard.Prompt);
        Assert.DoesNotContain("- competencies:", standard.Prompt);
        Assert.DoesNotContain("- skills:", competencies.Prompt);

        var doc = new CvDocument { Format = CvFormats.Combined, Language = "es", Summary = "Resumen." };
        doc.Competencies.Add(new CvCompetencyGroup { Kind = "personal", Label = "Personales", Items = [new CvCompetency { Id = Guid.NewGuid(), Name = "Adaptabilidad" }] });
        doc.Skills.Add(new CvSkillGroup { Label = "Lenguajes", Items = ["Java"] });
        doc.Experience.Add(new CvEntry { Title = "Dev", Subtitle = "X", Dates = "2024" });
        var ats = CvGuardian.AtsText(doc, "es");

        Assert.True(ats.IndexOf("Competencias", StringComparison.Ordinal) < ats.IndexOf("Habilidades", StringComparison.Ordinal));
        Assert.True(ats.IndexOf("Experiencia", StringComparison.Ordinal) < ats.IndexOf("Competencias", StringComparison.Ordinal));
    }
}
