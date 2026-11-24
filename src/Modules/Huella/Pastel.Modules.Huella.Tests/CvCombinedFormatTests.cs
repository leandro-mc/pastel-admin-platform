using System.Text.Json;
using Pastel.Modules.Huella.Ai;
using Pastel.Modules.Huella.Cv;
using Pastel.Modules.Huella.Domain;
using Pastel.Modules.Huella.Persistence;
using Xunit;

namespace Pastel.Modules.Huella.Tests;

/// <summary>
/// Formato combinado: un solo apartado de «Habilidades» con las competencias personales del catálogo como primera categoría y las
/// habilidades técnicas por categoría después, sin proyectos y sin duplicar nada.
/// </summary>
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

    // Los otros dos formatos no cambian: el combinado no lleva proyectos y las personales caben en los topes de las habilidades.
    [Fact]
    public void CombinedLimitsDropProjectsAndCountThePersonalGroupAmongTheSkills()
    {
        var combined = CvLimits.For("mid", "letter", CvFormats.Combined);

        Assert.Equal(0, combined.ProjectCount);
        Assert.Equal(6, combined.PersonalCompetencies);
        Assert.Equal(0, combined.TechnicalCompetencies);
        Assert.Equal(CvLimits.For("mid", "letter", CvFormats.Standard).SkillGroups, combined.SkillGroups);
        Assert.Equal(CvLimits.For("mid", "letter", CvFormats.Standard).SkillsTotal, combined.SkillsTotal);
        Assert.Equal(2, CvLimits.For("mid", "letter", CvFormats.Standard).ProjectCount);
        Assert.Equal(0, CvLimits.For("mid", "letter", CvFormats.Competencies).SkillGroups);
        Assert.Contains(CvFormats.Combined, CvFormats.All);
    }

    // Integridad: las personales (del catálogo, por id) pasan a ser la primera categoría de las habilidades; las técnicas del catálogo
    // no se duplican y las habilidades vienen del banco. Ninguna se inventa.
    [Fact]
    public void ACombinedAnswerMergesPersonalCompetenciesIntoTheFirstSkillGroup()
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
        Assert.Empty(doc.Competencies);
        var soft = doc.Skills[0];
        Assert.True(soft.Soft);
        Assert.Equal("Personales", soft.Label);
        Assert.Equal(["Adaptabilidad", "Comunicación efectiva"], soft.Items);
        Assert.Equal(["Java"], doc.Skills.Skip(1).SelectMany(g => g.Items));
        Assert.DoesNotContain(doc.Skills.SelectMany(g => g.Items), i => i is "Pruebas de software" or "Inventada" or "Kubernetes");
    }

    // Un CV combinado guardado con el formato anterior (competencias aparte) se lee ya fundido, sin duplicados ni apartado propio.
    [Fact]
    public void ALegacyCombinedDocumentIsReadWithThePersonalGroupInsideTheSkills()
    {
        var legacy = new CvDocument { Format = CvFormats.Combined, Language = "es", Summary = "Resumen." };
        legacy.Skills.Add(new CvSkillGroup { Label = "Lenguajes", Items = ["Java"] });
        legacy.Competencies.Add(new CvCompetencyGroup { Kind = "personal", Label = "Personales", Items = [new CvCompetency { Id = Guid.NewGuid(), Name = "Adaptabilidad" }] });
        legacy.Competencies.Add(new CvCompetencyGroup { Kind = "technical", Label = "Técnicas", Items = [new CvCompetency { Id = Guid.NewGuid(), Name = "Pruebas de software" }] });

        var doc = CvDocument.FromJson(HuellaJson.Serialize(legacy))!;

        Assert.Empty(doc.Competencies);
        Assert.Equal(["Personales", "Lenguajes"], doc.Skills.Select(g => g.Label));
        Assert.True(doc.Skills[0].Soft);
        Assert.Equal(["Adaptabilidad"], doc.Skills[0].Items);
        Assert.Equal(CvFormats.Standard, CvDocument.FromJson(HuellaJson.Serialize(new CvDocument()))!.Format);
    }

    // Edición libre: la categoría de personales se renombra como cualquier otra y conserva su marca (solo en el formato combinado).
    [Fact]
    public void FreeEditKeepsTheSoftMarkAfterRenamingTheCategoryOnlyInTheCombinedFormat()
    {
        var current = new CvDocument { Format = CvFormats.Combined, Language = "es" };
        var input = new CvDocumentInput(
            new CvHeaderInput("Ana Pérez", "Desarrolladora", [], []),
            "Resumen.",
            [new CvSkillGroupInput("Blandas", ["Adaptabilidad"], true), new CvSkillGroupInput("Lenguajes", ["Java"], null)],
            [], [], [], [], [], null);

        var combined = CvFreeEdit.Build(input, current);
        var standard = CvFreeEdit.Build(input, new CvDocument { Format = CvFormats.Standard, Language = "es" });

        Assert.True(combined.IsSuccess);
        Assert.Equal(["Blandas", "Lenguajes"], combined.Value.Skills.Select(g => g.Label));
        Assert.True(combined.Value.Skills[0].Soft);
        Assert.False(combined.Value.Skills[1].Soft);
        Assert.True(standard.IsSuccess);
        Assert.All(standard.Value.Skills, g => Assert.False(g.Soft));
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

        Assert.Contains("- competencies: SOLO personales", combined.Prompt);
        Assert.Contains("- skills: las habilidades TÉCNICAS", combined.Prompt);
        Assert.DoesNotContain("\"technical\"", combined.Schema);
        Assert.DoesNotContain("- projects:", combined.Prompt);
        Assert.Contains("- projects:", standard.Prompt);
        Assert.DoesNotContain("- competencies:", standard.Prompt);
        Assert.DoesNotContain("- skills:", competencies.Prompt);

        var doc = new CvDocument { Format = CvFormats.Combined, Language = "es", Summary = "Resumen." };
        doc.Skills.Add(new CvSkillGroup { Label = "Personales", Soft = true, Items = ["Adaptabilidad"] });
        doc.Skills.Add(new CvSkillGroup { Label = "Lenguajes", Items = ["Java"] });
        doc.Experience.Add(new CvEntry { Title = "Dev", Subtitle = "X", Dates = "2024" });
        var ats = CvGuardian.AtsText(doc, "es");

        // Un solo apartado «Habilidades» (no «Habilidades técnicas» ni «Competencias») tras la experiencia, con las personales primero.
        Assert.DoesNotContain("Competencias", ats);
        Assert.DoesNotContain("Habilidades técnicas", ats);
        Assert.True(ats.IndexOf("Experiencia", StringComparison.Ordinal) < ats.IndexOf("Habilidades", StringComparison.Ordinal));
        Assert.True(ats.IndexOf("Personales: Adaptabilidad", StringComparison.Ordinal) < ats.IndexOf("Lenguajes: Java", StringComparison.Ordinal));
    }

    // Lo que se agrega a mano en la edición libre (proyectos en un CV combinado, competencias en uno estándar) también se imprime.
    [Fact]
    public void SectionsAddedByHandArePrintedWhateverTheFormat()
    {
        var doc = new CvDocument { Format = CvFormats.Combined, Language = "es", Summary = "Resumen." };
        doc.Experience.Add(new CvEntry { Title = "Dev", Subtitle = "X", Dates = "2024" });
        doc.Projects.Add(new CvEntry { Title = "TrayectorIA", Subtitle = "Java", Dates = string.Empty });
        doc.Competencies.Add(new CvCompetencyGroup { Kind = "personal", Label = "Personales", Items = [new CvCompetency { Id = Guid.NewGuid(), Name = "Liderazgo" }] });

        var ats = CvGuardian.AtsText(doc, "es");

        Assert.Contains("TrayectorIA", ats);
        Assert.Contains("Personales: Liderazgo", ats);
    }
}
