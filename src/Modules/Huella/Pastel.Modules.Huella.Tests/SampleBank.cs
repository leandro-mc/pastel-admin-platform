using Pastel.Modules.Huella.Cv;

namespace Pastel.Modules.Huella.Tests;

/// <summary>Banco de una persona ficticia, construido solo con datos inventados para las pruebas.</summary>
internal static class SampleBank
{
    public const string ExperienceNarrative =
        "Entré en marzo de 2022 como la primera persona dedicada a pruebas automáticas.\n\n" +
        "Automaticé 140 pruebas end-to-end con Playwright y reduje la regresión manual de 2 días a 3 horas. " +
        "Integré las pruebas a GitHub Actions como puerta de despliegue; los fallos bajaron 35 % en seis meses. " +
        "Diseñé pruebas de carga con k6 sobre 12 endpoints críticos de la API.";

    public static BankData Create()
    {
        var skills = new List<BankSkill>
        {
            new("Playwright", "Pruebas", [], 2022, null, 0),
            new("k6", "Pruebas", [], 2023, null, 0),
            new("GitHub Actions", "Frameworks y herramientas", [], 2022, null, 0),
            new("TypeScript", "Lenguajes", [], 2020, null, 0),
        };
        var vocabulary = TermMatcher.Vocabulary(new BankData(
            new("", "", [], []), "", [], [], skills, [], [], [], new("", "", "", "", ""), [], "", 2026));
        var proposals = AchievementDeriver.Derive(ExperienceNarrative, requireVerb: true, vocabulary);
        var achievements = proposals
            .Select(p => new BankAchievement(Guid.CreateVersion7(), p.ShortText, p.LongText, p.RawText, p.Skills, p.Strength))
            .ToList();
        return new BankData(
            new("Marta Solís Araya", "QA Engineer", ["Heredia, Costa Rica", "marta.ejemplo@correo.test"], ["linkedin.com/in/marta-ejemplo"]),
            "QA con 5 años automatizando pruebas de APIs y web.",
            [new BankExperience(Guid.CreateVersion7(), "QA Automation Engineer", "Empresa Ejemplo S.A.", "San José, CR", new(2022, 3, 1), null, achievements)],
            [],
            skills,
            [new("Bachillerato en Ingeniería Informática", "Universidad Ejemplo", 2016, 2020, null)],
            [new("ISTQB Foundation Level", "ISTQB", 2023)],
            [new("Español", "Nativo", null), new("Inglés", "B2", null)],
            new("Heredia, Costa Rica", "Remoto", "Inmediata", "Ciudadana costarricense", string.Empty),
            ["sinergia"],
            "Escribo directo.",
            2026);
    }
}
