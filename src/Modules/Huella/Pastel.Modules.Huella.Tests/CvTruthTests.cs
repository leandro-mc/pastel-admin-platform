using Pastel.Modules.Huella.Cv;
using Xunit;

namespace Pastel.Modules.Huella.Tests;

public sealed class CvTruthTests
{
    // Regla de negocio crítica: un CV no puede afirmar lo que el banco no respalda (cifras, fuentes, frases prohibidas).
    [Fact]
    public void GuardianRejectsWhatTheBankDoesNotSupport()
    {
        var bank = SampleBank.Create();
        var limits = CvLimits.For("mid", "letter");
        var source = bank.AllAchievements().First(a => a.LongText.Contains("140", StringComparison.Ordinal));

        Assert.Null(CvGuardian.ValidateBullet(source.LongText, [source.Id], bank, limits));
        Assert.NotNull(CvGuardian.ValidateBullet("Automaticé 500 pruebas con Playwright.", [source.Id], bank, limits));
        Assert.NotNull(CvGuardian.ValidateBullet("Automaticé 140 pruebas con Playwright.", [], bank, limits));
        Assert.NotNull(CvGuardian.ValidateBullet("Automaticé 140 pruebas con Playwright.", [Guid.NewGuid()], bank, limits));
        Assert.NotNull(CvGuardian.ValidateBullet("Automaticé 140 pruebas con sinergia.", [source.Id], bank, limits));
    }

    // Reglas del cv-spec: el CV generado cabe en su cupo y cumple todas las comprobaciones, en cada nivel y papel.
    [Fact]
    public void GeneratedCvFitsItsBudgetAndPassesEveryCheck()
    {
        var bank = SampleBank.Create();
        foreach (var (level, paper) in new[] { ("junior", "letter"), ("mid", "letter"), ("senior", "a4") })
        {
            var limits = CvLimits.For(level, paper);
            var analysis = OfferAnalyzer.Analyze("Buscamos QA con Playwright, k6 y GitHub Actions.", isFocus: false, bank);
            var document = CvComposer.Compose(bank, new CvRequestOptions(level, paper, "es"), analysis, limits);
            CvLayout.Fit(document, limits);

            var failed = CvGuardian.Checks(document, bank, limits, "es").Where(c => !c.Passed).Select(c => c.Label).ToList();
            Assert.Empty(failed);
            Assert.True(CvLayout.Total(document, limits) <= limits.CapacityLu);
            Assert.NotEmpty(document.AllBullets());
        }
    }
}
