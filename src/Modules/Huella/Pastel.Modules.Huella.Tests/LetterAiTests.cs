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

        var (letters, rejected) = LetterAi.Parse(json, bank, offer, "QA", "Acme", new DateOnly(2026, 11, 16), "letter", new LetterRequest(["es", "en"], "formal"));

        var letter = Assert.Single(letters);
        Assert.Equal("es", letter.Language);
        Assert.Equal("Ana Pérez", letter.Document.Signature);
        Assert.Equal(["ana@correo.test"], letter.Document.Contact);
        Assert.Equal(2, letter.Document.Paragraphs.Count);
        Assert.Equal("2026-11-16", letter.Document.Date);
        Assert.Equal(["Equipo de selección", "Acme"], letter.Document.Recipient);
        Assert.Equal("times", letter.Document.Font);
        Assert.Equal("QA en Acme", letter.Document.Subject);
        Assert.Equal("QA at Acme", LetterAi.SubjectOf("QA", "Acme", en: true));
        Assert.Equal("QA en Acme", LetterAi.SubjectOf("QA en Acme", "Acme", en: false));
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

    // Regla de una sola página (como el cupo de un CV): un párrafo que no cabe se omite con su motivo, la carta nunca se encoge
    // y lo que se conserva siempre entra en la hoja, en cualquiera de los dos tipos de letra.
    [Fact]
    public void LetterNeverExceedsOnePage()
    {
        var (bank, _, _) = CvAiComposeTests.Bank();
        var long800 = string.Join(' ', Enumerable.Repeat("Aporto experiencia práctica en pruebas automatizadas con Playwright y mejoro la calidad de las entregas.", 8))[..790];
        var json = JsonSerializer.Serialize(new
        {
            letters = new[]
            {
                new
                {
                    language = "es",
                    subject = "Postulación a QA",
                    greeting = "Estimado equipo de Acme:",
                    closing = "Atentamente,",
                    paragraphs = new[] { long800, long800, long800, long800, long800 },
                },
            },
        });

        var (letters, rejected) = LetterAi.Parse(json, bank, "Buscamos QA.", "QA", "Acme", new DateOnly(2026, 11, 16), "letter", new LetterRequest(["es"], "formal"));

        var letter = Assert.Single(letters);
        Assert.InRange(letter.Document.Paragraphs.Count, LetterLimits.MinParagraphs, LetterLimits.MaxParagraphs - 1);
        Assert.Contains(rejected, r => r.Contains("no cabe en una página", StringComparison.Ordinal));
        foreach (var font in LetterLimits.Fonts)
        {
            Assert.True(LetterLayout.Fit(letter.Document, font, "letter").Fits);
        }
    }

    // El presupuesto que se le pide a la IA cabe en cualquier tipo de letra y papel, y crece con el papel más alto.
    [Fact]
    public void BodyBudgetFitsEveryFontAndPaper()
    {
        foreach (var paper in new[] { "letter", "a4" })
        {
            var budget = LetterLayout.BodyBudget(paper);
            Assert.InRange(budget, 1500, LetterLimits.MaxTotal);
            foreach (var font in LetterLimits.Fonts)
            {
                var doc = new LetterDoc
                {
                    Location = "Costa Rica",
                    Contact = ["correo@ejemplo.com", "8888 8888"],
                    Recipient = ["Equipo de selección", "Empresa"],
                    Subject = new string('a', 75),
                    Greeting = "Estimado equipo de la empresa:",
                    Paragraphs = [new string('a', budget / 3), new string('a', budget / 3), new string('a', budget / 3)],
                    Closing = "Atentamente,",
                };
                Assert.True(LetterLayout.Fit(doc, font, paper).Fits, $"{font} en {paper}");
            }
        }
    }

    // Cartas anteriores al formato compacto guardaban país, correo y teléfono juntos: el país pasa arriba y el resto queda al pie.
    [Fact]
    public void OlderLettersMoveTheCountryUnderTheName()
    {
        var doc = new LetterDoc { Contact = ["Costa Rica", "ana@correo.test", "+506 8888 0000"] };

        LetterFormat.Normalize(doc);

        Assert.Equal("Costa Rica", doc.Location);
        Assert.Equal(["ana@correo.test", "+506 8888 0000"], doc.Contact);
    }

    // El saludo nunca repite el nombre de la empresa (ya está en el destinatario) y el prompt trae las precauciones de estilo.
    [Fact]
    public void GreetingStaysShortAndPromptWarnsAgainstStockOpenings()
    {
        var (bank, _, _) = CvAiComposeTests.Bank();
        var json = JsonSerializer.Serialize(new
        {
            letters = new[]
            {
                new
                {
                    language = "es",
                    greeting = "Estimado equipo de selección de Acme:",
                    closing = "Atentamente,",
                    paragraphs = new[] { "Me interesa el puesto porque busca automatizar con Playwright, algo que hice en mi último cargo.", "Automaticé 140 pruebas y bajé la regresión de 2 días a 3 horas." },
                },
            },
        });
        var request = new LetterRequest(["es"], "formal");

        var (letters, _) = LetterAi.Parse(json, bank, "Buscamos QA.", "QA", "Acme", new DateOnly(2026, 11, 16), "letter", request);
        var package = LetterAi.BuildPackage(bank, OfferAnalyzer.Analyze("Buscamos QA.", isFocus: false, bank.Data), "Buscamos QA.", "QA", "Acme", "letter", request);

        Assert.Equal("Estimado equipo de selección:", Assert.Single(letters).Document.Greeting);
        Assert.Contains("Me dirijo a ustedes", package.Prompt, StringComparison.Ordinal);
        Assert.Contains("UNA sola vez", package.Prompt, StringComparison.Ordinal);
    }
}
