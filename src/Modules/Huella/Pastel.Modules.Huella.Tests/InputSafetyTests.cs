using Pastel.Modules.Huella.Domain;
using Xunit;

namespace Pastel.Modules.Huella.Tests;

public sealed class InputSafetyTests
{
    // Criterio 7 de la ficha: entradas hostiles se neutralizan o se rechazan.
    [Fact]
    public void HostileTextAndLinksAreNeutralizedOrRejected()
    {
        var text = TextInput.Clean("Hola <script>alert(1)</script> <img src=x onerror=alert(1)> mundo");
        Assert.DoesNotContain("<script", text, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("onerror", text, StringComparison.OrdinalIgnoreCase);

        Assert.False(LinkPolicy.TryNormalize("javascript:alert(1)", out _));
        Assert.False(LinkPolicy.TryNormalize("http://ejemplo.com/perfil", out _));
        Assert.False(LinkPolicy.TryNormalize("https://usuario:clave@ejemplo.com", out _));
        Assert.False(LinkPolicy.TryNormalize("data:text/html,hola", out _));
        Assert.True(LinkPolicy.TryNormalize("github.com/marta", out var normalized));
        Assert.Equal("https://github.com/marta", normalized);
    }
}
