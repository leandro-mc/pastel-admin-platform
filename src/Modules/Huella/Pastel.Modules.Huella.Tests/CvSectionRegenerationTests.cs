using System.Text.Json;
using Pastel.Modules.Huella.Ai;
using Pastel.Modules.Huella.Cv;
using Pastel.Modules.Huella.Domain;
using Pastel.Modules.Huella.Persistence;
using Xunit;

namespace Pastel.Modules.Huella.Tests;

/// <summary>Regenerar UNA sección del CV con IA (edición libre): mismas reglas de verdad que un CV nuevo, y solo esa sección.</summary>
public sealed class CvSectionRegenerationTests
{
    private static (AiBank Bank, Experience Current, Competency[] Personal) Build()
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
        var personal = new[] { C("Adaptabilidad", CompetencyKinds.Personal) };
        var records = new BankRecords([], [current], [], [], [S("Java", "Lenguajes")], [], [], [], [], [.. personal, C("Scrum", CompetencyKinds.Technical)]);
        return (new AiBank(profile, new PrivateNote { ProfileId = profileId }, records, 2026, new DateOnly(2026, 11, 23)), current, personal);
    }

    private static string Reply(object version) => JsonSerializer.Serialize(new { versions = new[] { version } });

    // Solo se arma la sección pedida; el resto del documento queda vacío (el servidor no toca lo demás).
    [Fact]
    public void OnlyTheRequestedSectionIsBuilt()
    {
        var (bank, _, _) = Build();
        var request = new CvComposeRequest("mid", "letter", ["es"]);
        var raw = Reply(new { language = "es", summary = "Desarrolladora de software con experiencia en sistemas y automatización de procesos." });

        var (document, _) = CvAiCompose.ParseSection(raw, bank, request, null, "summary");

        Assert.NotNull(document);
        Assert.StartsWith("Desarrolladora de software", document.Summary);
        Assert.Empty(document.Experience);
        Assert.Empty(document.Skills);
        Assert.Empty(document.Competencies);
    }

    // Verdad: una habilidad que el banco no tiene y una competencia que no es del catálogo se descartan al regenerar.
    [Fact]
    public void RegeneratedSkillsAndCompetenciesStillComeOnlyFromTheBank()
    {
        var (bank, _, personal) = Build();
        var skills = CvAiCompose.ParseSection(
            Reply(new { language = "es", skills = new[] { new { label = "Lenguajes", items = new[] { "Java", "Kubernetes" } } } }),
            bank, new CvComposeRequest("mid", "letter", ["es"]), null, "skills");
        Assert.Equal(["Java"], skills.Document!.Skills.SelectMany(g => g.Items));

        var competencies = CvAiCompose.ParseSection(
            Reply(new { language = "es", competencies = new { personal = new object[] { new { id = personal[0].Id, name = "Adaptabilidad" }, new { id = Guid.NewGuid(), name = "Inventada" } }, technical = Array.Empty<object>() } }),
            bank, new CvComposeRequest("mid", "letter", ["es"], CvFormats.Combined), null, "competencies");
        Assert.Equal(["Adaptabilidad"], competencies.Document!.Competencies.Single().Items.Select(c => c.Name));
    }

    // Verdad: una viñeta con una cifra que el banco no respalda se descarta (con aviso), igual que al generar el CV completo.
    [Fact]
    public void ARegeneratedBulletWithAnInventedFigureIsDropped()
    {
        var (bank, current, _) = Build();
        var raw = Reply(new
        {
            language = "es",
            experience = new object[]
            {
                new
                {
                    id = current.Id, title = "Desarrolladora", context = (string?)null,
                    bullets = new[] { new { text = "Lideré el módulo de ensamblaje con 5 expertos y entregué el motor.", @short = "Lideré el módulo con 5 expertos." }, new { text = "Reduje a 99 minutos cada trámite del proceso.", @short = "Reduje a 99 minutos cada trámite." } },
                },
            },
        });

        var (document, warnings) = CvAiCompose.ParseSection(raw, bank, new CvComposeRequest("mid", "letter", ["es"]), null, "experience");

        var bullets = document!.Experience.Single().Bullets;
        Assert.Single(bullets);
        Assert.DoesNotContain("99", bullets[0].Text);
        Assert.Contains(warnings, w => w.Contains("99"));
    }

    // El pedido está en modo sección: lleva el resto del CV como contexto (sin la sección que se reemplaza) y un esquema de una sola parte.
    [Fact]
    public void TheSectionPromptCarriesTheOfferAndOnlyTheSectionSchema()
    {
        var (bank, _, _) = Build();
        var analysis = OfferAnalyzer.Analyze("Java", isFocus: false, bank.Data);
        var request = new CvComposeRequest("mid", "letter", ["es"]);
        var others = "{\"experience\":[]}";

        var package = CvAiCompose.BuildPackage(bank, analysis, "Buscamos Java y Spring Boot.", null, request, new CvSectionMode("summary", "Perfil profesional", others));

        Assert.Equal("cv_section", package.Task);
        Assert.Contains("MODO: REGENERAR UNA SOLA SECCIÓN", package.Prompt);
        Assert.Contains("«Perfil profesional»", package.Prompt);
        Assert.Contains("Buscamos Java y Spring Boot.", package.Prompt);
        Assert.Contains("<CV_ACTUAL>", package.Prompt);
        Assert.Contains("\"summary\"", package.Schema);
        Assert.DoesNotContain("\"experience\"", package.Schema);
    }
}
