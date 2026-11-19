using Pastel.Modules.Agora.Domain;
using Pastel.SharedKernel;
using Xunit;

namespace Pastel.Modules.Agora.Tests;

/// <summary>Separación de funciones: nadie verifica su propia pieza, con cualquier cantidad de revisores (AG-VER-02).</summary>
public sealed class VerificationPolicyTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 1, 12, 0, 0, TimeSpan.Zero);

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(5)]
    public void AContributorCannotVerifyTheirOwnPieceWhateverTheNumberOfRequiredReviewers(int requiredReviewers)
    {
        var author = Guid.NewGuid();
        var others = Enumerable.Range(0, requiredReviewers - 1)
            .Select(i => new VerificationFact(Guid.NewGuid(), $"Revisor {i}", Now, 1, true))
            .ToList();

        var error = VerificationPolicy.CanVerify(ArticleStatus.Published, author, new HashSet<Guid> { author }, others, 1);

        Assert.NotNull(error);
        Assert.Equal("agora.verification.self", error.Code);
        Assert.Equal(ErrorType.Forbidden, error.Type);
    }

    [Fact]
    public void AnIndependentReviewerCanVerifyAPublishedPieceOnlyOncePerVersion()
    {
        var reviewer = Guid.NewGuid();
        var contributors = new HashSet<Guid> { Guid.NewGuid() };

        Assert.Null(VerificationPolicy.CanVerify(ArticleStatus.Published, reviewer, contributors, [], 1));

        var done = new[] { new VerificationFact(reviewer, "Revisora", Now, 1, true) };
        Assert.Equal("agora.verification.duplicate", VerificationPolicy.CanVerify(ArticleStatus.Published, reviewer, contributors, done, 1)?.Code);
        Assert.Null(VerificationPolicy.CanVerify(ArticleStatus.Published, reviewer, contributors, done, 2));
    }

    [Theory]
    [InlineData((int)ArticleStatus.Draft)]
    [InlineData((int)ArticleStatus.Archived)]
    public void OnlyPublishedPiecesCanBeVerified(int statusValue)
    {
        // El método xUnit es público: no puede exponer el enum interno del módulo.
        var error = VerificationPolicy.CanVerify((ArticleStatus)statusValue, Guid.NewGuid(), new HashSet<Guid>(), [], 1);

        Assert.Equal("agora.verification.not_published", error?.Code);
    }
}
