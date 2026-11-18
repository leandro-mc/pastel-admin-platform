using Pastel.Modules.Agora.Domain;
using Xunit;

namespace Pastel.Modules.Agora.Tests;

/// <summary>Video (ficha §7, prueba esencial 5): solo un identificador de YouTube válido; lo demás se rechaza.</summary>
public sealed class YouTubeVideoIdTests
{
    [Theory]
    [InlineData("dQw4w9WgXcQ")]
    [InlineData("https://www.youtube.com/watch?v=dQw4w9WgXcQ")]
    [InlineData("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s")]
    [InlineData("https://youtu.be/dQw4w9WgXcQ")]
    [InlineData("https://www.youtube.com/embed/dQw4w9WgXcQ")]
    [InlineData("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")]
    public void AValidIdentifierOrYouTubeAddressIsNormalizedToTheId(string input)
    {
        Assert.True(YouTubeVideoId.TryNormalize(input, out var id));
        Assert.Equal("dQw4w9WgXcQ", id);
    }

    [Theory]
    [InlineData("https://evil.example/watch?v=dQw4w9WgXcQ")]
    [InlineData("https://www.youtube.com.evil.example/watch?v=dQw4w9WgXcQ")]
    [InlineData("http://www.youtube.com/watch?v=dQw4w9WgXcQ")]
    [InlineData("https://user:pass@www.youtube.com/watch?v=dQw4w9WgXcQ")]
    [InlineData("https://www.youtube.com/watch?v=dQw4w9WgXcQ%22%3E")]
    [InlineData("javascript:alert(1)")]
    [InlineData("dQw4w9WgXc")]
    [InlineData("dQw4w9WgXcQQ")]
    [InlineData("dQw4w9Wg\"cQ")]
    [InlineData("")]
    [InlineData(null)]
    public void AnArbitraryUrlOrTamperedIdentifierIsRejected(string? input)
    {
        Assert.False(YouTubeVideoId.TryNormalize(input, out var id));
        Assert.Equal(string.Empty, id);
    }
}
