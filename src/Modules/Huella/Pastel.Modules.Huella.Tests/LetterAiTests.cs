using System.Text.Json;
using Pastel.Modules.Huella.Cv;
using Xunit;

namespace Pastel.Modules.Huella.Tests;

public sealed class LetterAiTests
{
    // La carta pasa por el mismo guardián de verdad que el CV: las cifras deben existir en el banco o en la oferta, y una
    // carta con menos de dos párrafos válidos no se crea. Nombre y contacto salen del banco, nunca de la IA.
    [Fact]
    public void LetterKeepsBankFactsAndRejectsWhatNeitherBankNorOfferSupport()
    {
        var (bank, _, _) = CvAiComposeTests.Bank();
        const string offer = "Buscamos QA con Playwright para un equipo de 12 personas.";
        var json = JsonSerializer.Serialize(new
        {
            letters = new object[]
            {
                new
                {
                    language = "es",
                    subject = "Postulación a QA",
                    greeting = "Estimado equipo:",
                    closing = "Atentamente,",
                    paragraphs = new[]
                    {
                        "Me interesa el puesto porque busca automatizar con Playwright, algo que hice en mi último cargo.",
                        "Automaticé 140 pruebas y bajé la regresión de 2 días a 3 horas; aportaría ese enfoque a un equipo de 12 personas.",
                        "Aumenté la cobertura 999 % en un solo mes.",
                    },
                },
                new { language = "en", subject = "Application", greeting = "Dear team,", closing = "Sincerely,", paragraphs = new[] { "Only one paragraph." } },
            },
        });

        var (letters, rejected) = LetterAi.Parse(json, bank, offer, "QA", "Acme", new DateOnly(2026, 11, 16), new LetterRequest(["es", "en"], "formal"));

        var letter = Assert.Single(letters);
        Assert.Equal("es", letter.Language);
        Assert.Equal("Ana Pérez", letter.Document.Signature);
        Assert.Equal(["ana@correo.test"], letter.Document.Contact);
        Assert.Equal(2, letter.Document.Paragraphs.Count);
        Assert.Equal("2026-11-16", letter.Document.Date);
        Assert.Equal(["Equipo de selección", "Acme"], letter.Document.Recipient);
        Assert.Equal("times", letter.Document.Font);
        Assert.Contains(rejected, r => r.Contains("999", StringComparison.Ordinal));
        Assert.Contains(rejected, r => r.StartsWith("EN", StringComparison.Ordinal));
    }

    // La fecha de la carta sale con el nombre del mes escrito aquí: no depende de la cultura (ni de ICU) del servidor.
    [Fact]
    public void LetterDateIsWrittenOutInEachLanguage()
    {
        Assert.Equal("16 de noviembre de 2026", LetterFormat.DateText("2026-11-16", "es"));
        Assert.Equal("November 16, 2026", LetterFormat.DateText("2026-11-16", "en"));
        Assert.Equal(string.Empty, LetterFormat.DateText("no es una fecha", "es"));
    }
}
