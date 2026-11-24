using Pastel.Modules.Huella.Cv;
using Xunit;

namespace Pastel.Modules.Huella.Tests;

public sealed class CvPairSyncTests
{
    private static CvDocument Es() => new()
    {
        Language = "es",
        Header = new CvHeader { Name = "Ana Pérez", Headline = "Ingeniera de software", ContactLine1 = ["Heredia", "ana@example.com"] },
        Summary = "Ingeniera con 2 años de experiencia.",
        Experience =
        [
            new CvEntry
            {
                Title = "Desarrolladora", Subtitle = "UCR", Dates = "Ago 2026 - Presente",
                Bullets = [new CvBullet { Text = "Lideré el módulo con 5 expertos.", SourceIds = [Guid.NewGuid()] }, new CvBullet { Text = "Documenté el motor.", SourceIds = [Guid.NewGuid()] }],
            },
        ],
    };

    private static CvDocument En()
    {
        var doc = new CvDocument
        {
            Language = "en",
            Header = new CvHeader { Name = "Ana Pérez", Headline = "Software engineer", ContactLine1 = ["Heredia", "ana@example.com"] },
            Summary = "Engineer with 2 years of experience.",
        };
        doc.Experience.Add(new CvEntry
        {
            Title = "Developer", Subtitle = "UCR", Dates = "Aug 2026 - Present",
            Bullets = [new CvBullet { Text = "Led the module with 5 experts." }, new CvBullet { Text = "Documented the engine." }],
        });
        return doc;
    }

    private static (CvDocument After, PairPlan Plan) Edited()
    {
        var after = Es();
        after.Experience[0].Bullets[1].Text = "Documenté el motor y lo cubrí con 12 pruebas.";
        var pending = CvPairSync.Record([], Es(), after);
        return (after, CvPairSync.Plan(after, En(), pending, "es", "en"));
    }

    private const string Good =
        """{"sections":{"experience":[{"title":"Developer","subtitle":"UCR","location":"","context":"","dates":"Aug 2026 - Present","bullets":["Led the module with 5 experts.","Documented the engine and covered it with 12 tests."]}]}}""";

    // Solo se anota lo que cambió, y volver al original deja de ser pendiente.
    [Fact]
    public void OnlyChangedSectionsArePendingAndARevertClearsThem()
    {
        var after = Es();
        after.Experience[0].Bullets[1].Text = "Otra cosa.";
        var pending = CvPairSync.Record([], Es(), after);

        Assert.Equal(["experience"], pending.Select(p => p.Section));
        Assert.Empty(CvPairSync.Record(pending, after, Es()));
    }

    // Integridad: la IA traduce lo cambiado y conserva el resto; las viñetas siguen citando su logro de origen.
    [Fact]
    public void AGoodAnswerUpdatesOnlyTheAffectedBullet()
    {
        var (after, plan) = Edited();

        var result = CvPairSync.Apply(plan, Good);

        Assert.Equal(["Trayectoria"], result.Applied);
        Assert.Empty(result.Remaining);
        var bullets = result.Input.Experience![0].Bullets!;
        Assert.Equal("Led the module with 5 experts.", bullets[0].Text);
        Assert.Contains("12 tests", bullets[1].Text);
        Assert.Equal(after.Experience[0].Bullets[1].SourceIds, bullets[1].SourceIds);
    }

    // Verdad: la IA no puede inventar una cifra ni cambiar la estructura; lo rechazado queda pendiente y no se aplica.
    [Fact]
    public void InventedFiguresAndDifferentStructureAreRejectedAndStayPending()
    {
        var (_, plan) = Edited();

        var invented = CvPairSync.Apply(plan, Good.Replace("12 tests", "40 tests"));
        Assert.Empty(invented.Applied);
        Assert.Single(invented.Remaining);
        Assert.Contains(invented.Rejected, r => r.Contains("40"));

        var extra = CvPairSync.Apply(plan, Good.Replace("12 tests.\"]", "12 tests.\",\"Extra.\"]"));
        Assert.Empty(extra.Applied);
        Assert.Contains(extra.Rejected, r => r.Contains("viñetas"));

        var notJson = CvPairSync.Apply(plan, "no puedo");
        Assert.Empty(notJson.Applied);
        Assert.Single(notJson.Remaining);
    }

    // Un cambio solo de nombre o contacto no necesita IA: se copia tal cual y el titular traducido se conserva.
    [Fact]
    public void ContactChangesAreCopiedWithoutAskingTheAi()
    {
        var after = Es();
        after.Header.ContactLine1 = ["Heredia", "ana@nuevo.example.com"];
        var pending = CvPairSync.Record([], Es(), after);
        var plan = CvPairSync.Plan(after, En(), pending, "es", "en");

        Assert.Null(plan.Prompt);
        var result = CvPairSync.Apply(plan, null);
        Assert.Contains("ana@nuevo.example.com", result.Input.Header!.ContactLine1!);
        Assert.Equal("Software engineer", result.Input.Header.Headline);
        Assert.Empty(result.Remaining);
    }
}
