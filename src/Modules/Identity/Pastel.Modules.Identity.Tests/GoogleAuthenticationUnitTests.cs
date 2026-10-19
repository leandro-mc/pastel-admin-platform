using System.Security.Claims;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Features.GoogleComplete;
using Pastel.Modules.Identity.Security;
using Xunit;

namespace Pastel.Modules.Identity.Tests;

public sealed class GoogleAuthenticationUnitTests
{
    [Theory]
    [InlineData("/inicio", "/inicio")]
    [InlineData("/configuracion/usuarios?tab=roles", "/configuracion/usuarios?tab=roles")]
    [InlineData("/balance/movimientos?page=2", "/balance/movimientos?page=2")]
    [InlineData("/agora", "/agora")]
    public void ReturnUrlKeepsKnownInternalRoutes(string candidate, string expected)
    {
        Assert.Equal(expected, ReturnUrl.Sanitize(candidate));
    }

    [Theory]
    [InlineData("https://evil.example")]
    [InlineData("//evil.example")]
    [InlineData("/\\evil.example")]
    [InlineData("/%2f%2fevil.example")]
    [InlineData("/%5cevil.example")]
    [InlineData("/unknown-area/details")]
    public void ReturnUrlRejectsExternalOrUnknownRoutes(string candidate)
    {
        Assert.Equal("/", ReturnUrl.Sanitize(candidate));
    }

    [Fact]
    public void ReturnUrlDefaultsToRootForMissingOrOverlongValues()
    {
        Assert.Equal("/", ReturnUrl.Sanitize(null));
        Assert.Equal("/", ReturnUrl.Sanitize(""));
        Assert.Equal("/", ReturnUrl.Sanitize(new string('a', 513)));
    }

    [Fact]
    public void GoogleIdentityReadsVerifiedClaimsAndTrimsEmail()
    {
        var principal = CreatePrincipal(
            new Claim(ClaimTypes.NameIdentifier, "google-subject-123"),
            new Claim(ClaimTypes.Email, "  person@example.com  "),
            new Claim(GoogleClaims.EmailVerified, "TRUE"),
            new Claim(ClaimTypes.Name, "Example Person"));

        var identity = GoogleIdentity.From(principal);

        Assert.NotNull(identity);
        Assert.Equal("google-subject-123", identity.Subject);
        Assert.Equal("person@example.com", identity.Email);
        Assert.True(identity.EmailVerified);
        Assert.Equal("Example Person", identity.Name);
    }

    [Fact]
    public void GoogleIdentityAcceptsOidcSubAndEmailClaimNames()
    {
        var principal = CreatePrincipal(
            new Claim("sub", "google-subject-456"),
            new Claim("email", "person@example.com"),
            new Claim(GoogleClaims.EmailVerified, "false"),
            new Claim("name", "OIDC Person"));

        var identity = GoogleIdentity.From(principal);

        Assert.NotNull(identity);
        Assert.Equal("google-subject-456", identity.Subject);
        Assert.Equal("person@example.com", identity.Email);
        Assert.False(identity.EmailVerified);
        Assert.Equal("OIDC Person", identity.Name);
    }

    [Fact]
    public void GoogleIdentityRejectsMissingOrInvalidRequiredClaims()
    {
        Assert.Null(GoogleIdentity.From(CreatePrincipal(
            new Claim(ClaimTypes.Email, "person@example.com"))));
        Assert.Null(GoogleIdentity.From(CreatePrincipal(
            new Claim(ClaimTypes.NameIdentifier, "google-subject"))));
        Assert.Null(GoogleIdentity.From(CreatePrincipal(
            new Claim(ClaimTypes.NameIdentifier, " "),
            new Claim(ClaimTypes.Email, "person@example.com"))));
        Assert.Null(GoogleIdentity.From(CreatePrincipal(
            new Claim(ClaimTypes.NameIdentifier, new string('s', 256)),
            new Claim(ClaimTypes.Email, "person@example.com"))));
        Assert.Null(GoogleIdentity.From(CreatePrincipal(
            new Claim(ClaimTypes.NameIdentifier, "google-subject"),
            new Claim(ClaimTypes.Email, "  "))));
    }

    private static ClaimsPrincipal CreatePrincipal(params Claim[] claims) =>
        new(new ClaimsIdentity(claims, authenticationType: "UnitTest"));
}
