using Pastel.Modules.Agora.Domain;
using Xunit;

namespace Pastel.Modules.Agora.Tests;

/// <summary>Regla central del módulo (ficha §7, prueba esencial 3) y AG-VER-02 (cantidad de revisores configurable).</summary>
public sealed class SealTests
{
    private static readonly DateTimeOffset Start = new(2026, 11, 1, 12, 0, 0, TimeSpan.Zero);
    private static readonly Guid Ana = Guid.NewGuid();
    private static readonly Guid Beto = Guid.NewGuid();

    private static VerificationFact Make(Guid reviewer, string name, int version, bool active = true, int day = 0) =>
        new(reviewer, name, Start.AddDays(day), version, active);

    [Fact]
    public void WithoutVerificationThePieceIsPending()
    {
        var seal = SealCalculator.Compute([], currentSubstantiveVersion: 1, requiredReviewers: 1);

        Assert.Equal(SealState.Pending, seal.State);
        Assert.Empty(seal.Verifiers);
    }

    [Fact]
    public void AfterVerifyingTheSealNamesWhoVerifiedAndWhen()
    {
        var seal = SealCalculator.Compute([Make(Ana, "Ana Rojas", version: 1, day: 3)], 1, 1);

        Assert.Equal(SealState.Verified, seal.State);
        var verifier = Assert.Single(seal.Verifiers);
        Assert.Equal("Ana Rojas", verifier.Name);
        Assert.Equal(Start.AddDays(3), verifier.VerifiedAt);
    }

    [Fact]
    public void EditingSubstantiveContentAfterVerifyingShowsModifiedAfterVerification()
    {
        var seal = SealCalculator.Compute([Make(Ana, "Ana Rojas", version: 1)], currentSubstantiveVersion: 2, requiredReviewers: 1);

        Assert.Equal(SealState.ModifiedAfterVerification, seal.State);
    }

    [Fact]
    public void AWithdrawnVerificationDoesNotCountAndDoesNotMarkThePieceAsModified()
    {
        var seal = SealCalculator.Compute([Make(Ana, "Ana Rojas", version: 1, active: false)], 1, 1);

        Assert.Equal(SealState.Pending, seal.State);
    }

    [Fact]
    public void TwoRequiredReviewersNeedTwoDifferentPeopleForTheCurrentVersion()
    {
        var onlyAna = SealCalculator.Compute([Make(Ana, "Ana", 1), Make(Ana, "Ana", 1, day: 1)], 1, requiredReviewers: 2);
        var both = SealCalculator.Compute([Make(Ana, "Ana", 1), Make(Beto, "Beto", 1, day: 1)], 1, requiredReviewers: 2);

        Assert.Equal(SealState.Pending, onlyAna.State);
        Assert.Equal(1, onlyAna.ActiveForCurrentVersion);
        Assert.Equal(SealState.Verified, both.State);
        Assert.Equal(2, both.Verifiers.Count);
    }

    [Fact]
    public void ChangingTheBodyOrASourceChangesTheFingerprintButWhitespaceDoesNot()
    {
        var source = new SourceContent("Ley 1234", "https://example.org/ley", SourceKind.Official, null, null, null);
        var baseline = new SubstantiveContent("Título", "Resumen", ContentType.Facts, "Se sabe", "No se sabe", "Importa", "Cuerpo\r\nuno", [source]);

        Assert.Equal(baseline.Fingerprint(), (baseline with { Body = "  Cuerpo\nuno  " }).Fingerprint());
        Assert.NotEqual(baseline.Fingerprint(), (baseline with { Body = "Cuerpo dos" }).Fingerprint());
        Assert.NotEqual(baseline.Fingerprint(), (baseline with { Sources = [source with { Url = "https://example.org/otra" }] }).Fingerprint());
    }
}
