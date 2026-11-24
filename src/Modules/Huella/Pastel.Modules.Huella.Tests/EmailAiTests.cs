using System.Text.Json;
using Pastel.Modules.Huella.Ai;
using Pastel.Modules.Huella.Cv;
using Pastel.Modules.Huella.Domain;
using Pastel.Modules.Huella.Persistence;
using Xunit;

namespace Pastel.Modules.Huella.Tests;

/// <summary>Correo de postulación: mismas reglas de verdad que el CV y la carta, el CV siempre va adjunto y el destino es seguro para un <c>mailto:</c>.</summary>
public sealed class EmailAiTests
{
    private const string Offer = "Desarrollador Fullstack. Buscamos Java y Spring Boot. Equipo de 12 personas. Envíe su CV a seleccion@empresa.com (no responder a no-reply@empresa.com).";

    private static AiBank Build()
    {
        var profileId = Guid.CreateVersion7();
        var profile = new Profile { Id = profileId, DisplayName = "Ana Pérez", Headline = "Ingeniera", ContactEmail = "ana@correo.com", ContactPhone = "+506 8888 8888" };
        var current = new Experience
        {
            Id = Guid.CreateVersion7(), ProfileId = profileId, Role = "Desarrolladora", Company = "Universidad X", StartDate = new(2026, 8, 1), IsVisible = true,
            Narrative = "Lideré el módulo de ensamblaje con 5 expertos.",
        };
        var skill = new Skill { Id = Guid.CreateVersion7(), ProfileId = profileId, Name = "Java", Category = "Lenguajes", IsVisible = true };
        var records = new BankRecords([], [current], [], [], [skill], [], [], [], [], []);
        return new AiBank(profile, new PrivateNote { ProfileId = profileId, Availability = "Inmediata" }, records, 2026, new DateOnly(2026, 11, 23));
    }

    private static string Reply(object email) => JsonSerializer.Serialize(new { emails = new[] { email } });

    private static readonly EmailRequest Spanish = new(["es"], "formal");

    // Estructura: asunto estándar con el puesto y el nombre, destino tomado de la oferta, firma con el contacto del banco.
    [Fact]
    public void TheEmailGetsAStandardSubjectTheOfferAddressAndTheBankSignature()
    {
        var bank = Build();
        var raw = Reply(new
        {
            language = "es",
            greeting = "Estimado equipo de selección:",
            paragraphs = new[]
            {
                "Actualmente me encuentro en búsqueda de empleo y vi la oferta de Desarrollador Fullstack; adjunto mi currículum para que puedan considerarme.",
                "Lideré el módulo de ensamblaje con 5 expertos, con Java como base.",
                "Tengo disposición para conversar cuando les convenga. Gracias por su tiempo.",
            },
            closing = "Saludos cordiales,",
        });

        var (emails, rejected) = EmailAi.Parse(raw, bank, Offer, "Desarrollador Fullstack", "Empresa", Spanish);

        var doc = Assert.Single(emails).Document;
        Assert.Empty(rejected);
        Assert.Equal("Postulación: Desarrollador Fullstack - Ana Pérez", doc.Subject);
        Assert.Equal("seleccion@empresa.com", doc.To);
        Assert.Equal("Ana Pérez", doc.Signature);
        Assert.Equal(["ana@correo.com", "+506 8888 8888"], doc.Contact);
        Assert.Contains("Ana Pérez\nana@correo.com", EmailFormat.BodyText(doc));
    }

    // Regla: el CV siempre va adjunto y el correo lo dice, aunque la IA lo haya olvidado.
    [Fact]
    public void ASentenceAboutTheAttachmentIsAddedWhenTheAiForgetsIt()
    {
        var raw = Reply(new
        {
            language = "es",
            greeting = "Estimado equipo de selección:",
            paragraphs = new[] { "Actualmente busco empleo y vi la oferta de Desarrollador Fullstack.", "Lideré el módulo de ensamblaje con 5 expertos." },
            closing = "Saludos cordiales,",
        });

        var doc = Assert.Single(EmailAi.Parse(raw, Build(), Offer, "Desarrollador Fullstack", "Empresa", Spanish).Emails).Document;

        Assert.True(EmailFormat.MentionsAttachment(doc.Paragraphs));
        Assert.Contains(doc.Paragraphs, p => p.StartsWith("Adjunto mi currículum", StringComparison.Ordinal));
    }

    // Verdad: un párrafo con una cifra que ni el banco ni la oferta respaldan se descarta; con menos de dos párrafos válidos no hay correo.
    [Fact]
    public void AParagraphWithAnInventedFigureIsDroppedAndTooFewParagraphsMeanNoEmail()
    {
        var raw = Reply(new
        {
            language = "es",
            greeting = "Estimado equipo:",
            paragraphs = new[] { "Adjunto mi currículum; busco empleo y vi su oferta.", "Reduje a 99 minutos cada trámite del proceso." },
            closing = "Saludos cordiales,",
        });

        var (emails, rejected) = EmailAi.Parse(raw, Build(), Offer, "Desarrollador Fullstack", "Empresa", Spanish);

        Assert.Empty(emails);
        Assert.Contains(rejected, r => r.Contains("99"));
    }

    // Una cifra que sí está en la oferta (el «12» del equipo) se acepta; el asunto que pide la oferta se usa si pasa las mismas reglas.
    [Fact]
    public void AFigureFromTheOfferAndASubjectTheOfferAsksForAreAccepted()
    {
        var offer = Offer + " Use el asunto REF-2026 Desarrollador.";
        var raw = Reply(new
        {
            language = "es",
            subject = "REF-2026 Desarrollador",
            greeting = "Estimado equipo de selección:",
            paragraphs = new[] { "Busco empleo y vi su oferta; adjunto mi currículum.", "Me interesa trabajar en un equipo de 12 personas." },
            closing = "Saludos cordiales,",
        });

        var doc = Assert.Single(EmailAi.Parse(raw, Build(), offer, "Desarrollador Fullstack", "Empresa", Spanish).Emails).Document;

        Assert.Equal("REF-2026 Desarrollador", doc.Subject);
    }

    // Destino seguro: se ignoran los «no-reply» y el propio correo, y nada con caracteres de URL pasa por dirección (evita inyectar campos en el mailto).
    [Fact]
    public void TheRecipientIgnoresNoReplyAndYourOwnAddressAndRejectsUrlCharacters()
    {
        Assert.Equal("rrhh@empresa.com", EmailFormat.RecipientOf("Escriba a no-reply@empresa.com o a ana@correo.com o a rrhh@empresa.com.", "ana@correo.com"));
        Assert.Equal(string.Empty, EmailFormat.RecipientOf("Postule en nuestro sitio.", null));
        Assert.True(EmailFormat.IsAddress("seleccion@empresa.com"));
        Assert.False(EmailFormat.IsAddress("a@b.com?bcc=otro@x.com"));
        Assert.False(EmailFormat.IsAddress("a@b.com,otro@x.com"));
        Assert.False(EmailFormat.IsAddress("a b@c.com"));
    }

    // El pedido lleva lo que la persona pidió: busca empleo, vio la oferta, comparte el CV adjunto y su disposición; y el esquema del correo.
    [Fact]
    public void ThePromptAsksForAShortEmailThatMentionsTheSearchTheAttachmentAndAvailability()
    {
        var bank = Build();
        var analysis = OfferAnalyzer.Analyze(Offer, isFocus: false, bank.Data);

        var package = EmailAi.BuildPackage(bank, analysis, Offer, "Desarrollador Fullstack", "Empresa", Spanish);

        Assert.Equal("email_compose", package.Task);
        Assert.Contains("búsqueda de empleo", package.Prompt);
        Assert.Contains("ADJUNTO", package.Prompt);
        Assert.Contains("<DISPONIBILIDAD>", package.Prompt);
        Assert.Contains("Inmediata", package.Prompt);
        Assert.Contains("\"emails\"", package.Schema);
    }
}
