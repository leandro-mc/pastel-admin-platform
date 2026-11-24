using Microsoft.Extensions.Configuration;
using Pastel.Modules.Huella.Ai;
using Xunit;

namespace Pastel.Modules.Huella.Tests;

public sealed class AiKeyProtectorTests
{
    // Secreto: la clave de IA no queda en claro y su texto cifrado no se puede reutilizar en otro perfil ni proveedor.
    [Fact]
    public void ApiKeyIsEncryptedAndBoundToItsProfileAndProvider()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Jwt:SigningKey"] = "unit-test-signing-key-with-enough-length-2026!" })
            .Build();
        var protector = new AiKeyProtector(configuration);
        var profile = Guid.NewGuid();
        const string key = "AIzaUnitTestKey-0123456789";

        var sealedKey = protector.Protect(key, profile, "gemini");

        Assert.DoesNotContain(key, sealedKey, StringComparison.Ordinal);
        Assert.True(protector.TryUnprotect(sealedKey, profile, "gemini", out var opened));
        Assert.Equal(key, opened);
        Assert.False(protector.TryUnprotect(sealedKey, Guid.NewGuid(), "gemini", out _));
        Assert.False(protector.TryUnprotect(sealedKey, profile, "openai", out _));
    }
}
