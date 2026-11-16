using System.Text.Json;
using Pastel.Modules.Huella.Ai;
using Pastel.Modules.Huella.Cv;
using Pastel.Modules.Huella.Domain;
using Pastel.Modules.Huella.Persistence;
using Xunit;

namespace Pastel.Modules.Huella.Tests;

public sealed class CvCompetenciesTests
{
    private sealed record Fixture(AiBank Bank, Experience Current, Experience Practice, Experience Project, Experience Other, Competency Personal, Competency Technical);

    private static Fixture Build()
    {
        var profileId = Guid.CreateVersion7();
        var profile = new Profile { Id = profileId, DisplayName = "Ana Pérez", Headline = "Desarrolladora" };
        Experience Exp(string role, string company, DateOnly start, DateOnly? end) => new()
        {
            Id = Guid.CreateVersion7(), ProfileId = profileId, Role = role, Company = company, StartDate = start, EndDate = end, IsVisible = true,
            Narrative = "Coordiné reuniones semanales y entregué 14 requerimientos.",
        };

        var current = Exp("Asistente de TI", "Universidad X", new(2026, 9, 1), null);
        var practice = Exp("Desarrolladora", "Ministerio Y", new(2025, 8, 1), new(2025, 11, 1));
        var project = Exp("Desarrolladora y Scrum Master", "Ministerio Y", new(2024, 3, 1), new(2025, 7, 1));
        var other = Exp("Analista", "Otra Empresa", new(2023, 1, 1), new(2023, 6, 1));
        var achievement = new Achievement
        {
            Id = Guid.CreateVersion7(), ExperienceId = current.Id, ShortText = "Apoyo al equipo de TI con pruebas y nuevas funcionalidades.",
            LongText = "Apoyo al equipo de TI con pruebas, nuevas funcionalidades y refactorizaciones.", Visibility = "both", Strength = 3,
        };
        Competency Comp(string name, string kind) => new()
        {
            Id = Guid.CreateVersion7(), ProfileId = profileId, Name = name, Kind = kind, Description = "d", Evidence = "Reuniones semanales y 14 requerimientos.", IsVisible = true,
        };

        var personal = Comp("Comunicación efectiva", CompetencyKinds.Personal);
        var technical = Comp("Pruebas de software", CompetencyKinds.Technical);
        var records = new BankRecords([], [current, practice, project, other], [], [achievement], [], [], [], [], [], [personal, technical]);
        var bank = new AiBank(profile, new PrivateNote { ProfileId = profileId }, records, 2026, new DateOnly(2026, 11, 16));
        return new Fixture(bank, current, practice, project, other, personal, technical);
    }

    // Integridad de datos: unir experiencias solo es válido para la misma organización y fechas continuas; el cargo vigente
    // siempre aparece (si la IA lo omite, se arma con los logros del banco) y las fechas salen del banco, nunca de la IA.
    [Fact]
    public void ExperiencesMergeOnlyWhenSameOrganizationAndContinuousAndCurrentRoleAlwaysAppears()
    {
        var f = Build();
        var json = JsonSerializer.Serialize(new
        {
            versions = new[]
            {
                new
                {
                    language = "es",
                    headline = "Desarrolladora",
                    summary = "Desarrolladora con experiencia en coordinación.",
                    experience = new object[]
                    {
                        new
                        {
                            id = f.Practice.Id,
                            alsoIds = new[] { f.Project.Id, f.Other.Id },
                            title = "Desarrolladora y Scrum Master",
                            context = "Proyecto académico y práctica supervisada",
                            bullets = new[] { "Coordiné reuniones semanales y entregué 14 requerimientos al cliente institucional." },
                        },
                    },
                },
            },
        });

        var (versions, rejected) = CvAiCompose.Parse(json, f.Bank, new CvComposeRequest("junior", "letter", ["es"]));

        var doc = Assert.Single(versions).Document;
        Assert.Equal(2, doc.Experience.Count);
        Assert.Equal("Universidad X", doc.Experience[0].Subtitle);
        Assert.Contains(rejected, r => r.Contains("cargo vigente", StringComparison.Ordinal));
        var merged = doc.Experience[1];
        Assert.Equal("Ministerio Y", merged.Subtitle);
        Assert.Equal("Mar 2024 - Nov 2025", merged.Dates);
        Assert.Equal("Proyecto académico y práctica supervisada", merged.Context);
        Assert.Contains(rejected, r => r.Contains("Otra Empresa", StringComparison.Ordinal));
        Assert.DoesNotContain(doc.Experience, e => e.Subtitle == "Otra Empresa");
    }

    // Aislamiento de la verdad: el CV de competencias solo usa competencias del catálogo del banco; el tipo debe coincidir y
    // una nota con cifras ajenas al banco se descarta sin tirar la competencia.
    [Fact]
    public void CompetenciesComeOnlyFromTheBankCatalogAndNotesPassTheGuardian()
    {
        var f = Build();
        var json = JsonSerializer.Serialize(new
        {
            versions = new[]
            {
                new
                {
                    language = "es",
                    headline = "Desarrolladora",
                    summary = "Desarrolladora con experiencia en coordinación.",
                    competencies = new
                    {
                        personal = new object[]
                        {
                            new { id = f.Personal.Id, name = "Comunicación efectiva", note = "Reuniones semanales con las jefaturas." },
                            new { id = Guid.NewGuid(), name = "Inventada", note = "no existe" },
                            new { id = f.Technical.Id, name = "Pruebas de software", note = (string?)null },
                        },
                        technical = new object[]
                        {
                            new { id = f.Technical.Id, name = "Pruebas de software", note = "Subí la cobertura a 999 %." },
                        },
                    },
                    experience = new object[]
                    {
                        new { id = f.Current.Id, alsoIds = Array.Empty<Guid>(), title = "Asistente de TI", context = (string?)null, bullets = new[] { "Apoyo al equipo de TI con pruebas, nuevas funcionalidades y refactorizaciones." } },
                    },
                },
            },
        });
        var request = new CvComposeRequest("junior", "letter", ["es"], CvFormats.Competencies);

        var (versions, rejected) = CvAiCompose.Parse(json, f.Bank, request);

        var doc = Assert.Single(versions).Document;
        Assert.Equal(CvFormats.Competencies, doc.Format);
        var personal = Assert.Single(doc.Competencies, g => g.Kind == CompetencyKinds.Personal);
        Assert.Equal([f.Personal.Id], personal.Items.Select(c => c.Id));
        var technical = Assert.Single(doc.Competencies, g => g.Kind == CompetencyKinds.Technical);
        var item = Assert.Single(technical.Items);
        Assert.Null(item.Note);
        Assert.Contains(rejected, r => r.Contains("999", StringComparison.Ordinal));
        var checks = CvGuardian.Checks(doc, f.Bank.Data, CvLimits.For("junior", "letter", CvFormats.Competencies), "es");
        Assert.Contains(checks, c => c.Label.StartsWith("Toda competencia", StringComparison.Ordinal) && c.Passed);
    }
}
