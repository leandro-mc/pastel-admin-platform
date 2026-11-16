using Pastel.Modules.Huella.Ai;
using Pastel.Modules.Huella.Cv;
using Pastel.Modules.Huella.Domain;
using Pastel.Modules.Huella.Features.PublicContent;
using Pastel.Modules.Huella.Persistence;
using Xunit;

namespace Pastel.Modules.Huella.Tests;

public sealed class CvAiComposeTests
{
    internal static (AiBank Bank, Guid ExperienceId, Guid ProjectId) Bank()
    {
        var profileId = Guid.CreateVersion7();
        var profile = new Profile { Id = profileId, DisplayName = "Ana Pérez", Headline = "QA Engineer", ContactEmail = "ana@correo.test" };
        var experience = new Experience
        {
            Id = Guid.CreateVersion7(),
            ProfileId = profileId,
            Role = "QA",
            Company = "Acme",
            StartDate = new(2022, 3, 1),
            IsVisible = true,
            Narrative = "Automaticé 140 pruebas end-to-end con Playwright y bajé la regresión manual de 2 días a 3 horas.",
        };
        var project = new Project { Id = Guid.CreateVersion7(), ProfileId = profileId, Name = "Runner", Summary = "Ejecutor de pruebas.", IsVisible = true };
        var skill = new Skill { Id = Guid.CreateVersion7(), ProfileId = profileId, Name = "Playwright", Category = "Pruebas", IsVisible = true };
        var records = new BankRecords([], [experience], [project], [], [skill], [], [], [], [], []);
        return (new AiBank(profile, new PrivateNote { ProfileId = profileId }, records, 2026), experience.Id, project.Id);
    }

    // Regla de negocio crítica: la IA redacta, pero no puede afirmar lo que el banco no respalda ni cambiar los hechos.
    [Fact]
    public void ComposedCvKeepsBankFactsAndRejectsWhatTheBankDoesNotSupport()
    {
        var (bank, experienceId, _) = Bank();
        var json = System.Text.Json.JsonSerializer.Serialize(new
        {
            versions = new object[]
            {
                new
                {
                    language = "en",
                    headline = "QA Engineer",
                    summary = "QA engineer focused on test automation.",
                    skills = new[] { new { label = "Testing", items = new[] { "Playwright", "Kubernetes" } } },
                    experience = new object[]
                    {
                        new
                        {
                            id = experienceId,
                            title = "QA Engineer",
                            bullets = new[]
                            {
                                "Automated 140 end-to-end tests with Playwright, cutting manual regression from 2 days to 3 hours.",
                                "Increased coverage by 999 % in a single month through new suites.",
                            },
                        },
                        new { id = Guid.NewGuid(), title = "Ghost", bullets = new[] { "Una empresa que no existe en el banco." } },
                    },
                },
            },
        });

        var (versions, rejected) = CvAiCompose.Parse(json, bank, new CvComposeRequest("mid", "letter", ["en"]));

        var cv = Assert.Single(versions);
        Assert.Equal("en", cv.Language);
        var entry = Assert.Single(cv.Document.Experience);
        Assert.Equal("Acme", entry.Subtitle);
        Assert.Equal("Mar 2022 - Present", entry.Dates);
        Assert.Single(entry.Bullets);
        Assert.Contains("140", entry.Bullets[0].Text, StringComparison.Ordinal);
        Assert.Equal([experienceId], entry.Bullets[0].SourceIds);
        Assert.Equal(["Playwright"], cv.Document.Skills.Single().Items);
        Assert.Equal("ana@correo.test", cv.Document.Header.ContactLine1.Single());
        Assert.Contains(rejected, r => r.Contains("999", StringComparison.Ordinal));
        Assert.Contains(rejected, r => r.Contains("Kubernetes", StringComparison.Ordinal));
    }

    // Una respuesta que no es JSON o que no trae el idioma pedido no crea ninguna versión.
    [Fact]
    public void ComposeIgnoresInvalidOrMissingLanguages()
    {
        var (bank, _, _) = Bank();
        var request = new CvComposeRequest("mid", "letter", ["es", "en"]);

        Assert.Empty(CvAiCompose.Parse("no es json", bank, request).Versions);
        var (versions, rejected) = CvAiCompose.Parse("{\"versions\":[]}", bank, request);
        Assert.Empty(versions);
        Assert.Equal(2, rejected.Count);
    }

    // Perfil público: la IA elige y redacta dentro de los máximos; el servidor pone empresa y fechas, y descarta cifras inventadas.
    [Fact]
    public void GeneratedProfileSectionsRespectCapsAndFacts()
    {
        var (bank, experienceId, _) = Bank();
        var json = System.Text.Json.JsonSerializer.Serialize(new
        {
            sections = new
            {
                experience = new object[]
                {
                    new
                    {
                        id = experienceId,
                        role = new { es = "Ingeniería de calidad", en = "Quality Engineer" },
                        bullets = new object[]
                        {
                            new { es = "Automaticé 140 pruebas y bajé la regresión de 2 días a 3 horas.", en = "Automated 140 tests and cut regression from 2 days to 3 hours." },
                            new { es = "Mejoré la cobertura 700 % en un mes.", en = "Improved coverage by 700 % in a month." },
                        },
                    },
                },
            },
        });

        var outcome = ContentAi.ParseGenerated(json, bank, [ContentSections.Experience]);

        Assert.Equal([ContentSections.Experience], outcome.Applied);
        var es = Assert.Single(outcome.Es.Experience);
        var en = Assert.Single(outcome.En.Experience);
        Assert.Equal("Acme", es.Company);
        Assert.Equal("2022-03", es.Start);
        Assert.Equal("Quality Engineer", en.Role);
        Assert.Single(es.Bullets);
        Assert.Single(en.Bullets);
        Assert.Contains(outcome.Rejected, r => r.Contains("700", StringComparison.Ordinal));
    }

    // Editar el español deja el inglés desactualizado hasta que se reescribe: la huella de la sección lo detecta.
    [Fact]
    public void EditingTheSpanishSectionChangesItsHash()
    {
        var doc = new ContentDoc { Headline = "QA Engineer", Summary = "Uno" };
        var before = ContentSections.Hash(doc, ContentSections.Overview);
        doc.Summary = "Dos";

        Assert.NotEqual(before, ContentSections.Hash(doc, ContentSections.Overview));
        Assert.Equal(ContentSections.Hash(doc, ContentSections.Experience), ContentSections.Hash(new ContentDoc(), ContentSections.Experience));
    }
}
