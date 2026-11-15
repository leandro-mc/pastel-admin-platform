using Pastel.Modules.Huella.Domain;
using Xunit;

namespace Pastel.Modules.Huella.Tests;

public sealed class PublicLinkTokenTests
{
    // Criterios 1, 4 y 8: token aleatorio de alta entropía, solo se guarda el hash, una forma inválida nunca llega a la base.
    [Fact]
    public void TokenIsRandomAndOnlyItsHashIsKept()
    {
        var (first, firstHash) = PublicLinkToken.Generate();
        var (second, _) = PublicLinkToken.Generate();

        Assert.Equal(43, first.Length);
        Assert.NotEqual(first, second);
        Assert.Equal(32, firstHash.Length);
        Assert.True(PublicLinkToken.TryHash(first, out var again));
        Assert.Equal(firstHash, again);

        Assert.False(PublicLinkToken.TryHash(null, out _));
        Assert.False(PublicLinkToken.TryHash(first[..42], out _));
        Assert.False(PublicLinkToken.TryHash(first[..42] + "!", out _));
    }
}
