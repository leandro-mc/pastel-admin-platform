using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Security;
using Xunit;

namespace Pastel.Modules.Identity.Tests;

public sealed class SecurityPolicyTests
{
    [Theory]
    [InlineData("shortA1!", false)]
    [InlineData("A9", false)]
    [InlineData("Password123!", false)]
    [InlineData("123456789012", false)]
    [InlineData("a phrase with spaces", true)]
    [InlineData("correct horse battery staple", false)]
    [InlineData("river oak lantern meadow", true)]
    [InlineData("Sage-Garden_2026!", true)]
    public void PasswordPolicyUsesLengthAndCommonPasswordBlocklistWithoutCompositionRules(string password, bool expected)
    {
        Assert.Equal(expected, PasswordPolicy.IsStrong(password));
    }

    [Theory]
    [InlineData(true, true, null, true)]
    [InlineData(true, false, null, false)]
    [InlineData(false, true, null, false)]
    [InlineData(false, false, 1, false)] // Grant cannot bypass a disabled module.
    [InlineData(true, true, 0, false)]   // An explicit Deny overrides a role grant.
    [InlineData(true, false, 1, true)]
    public void PermissionDecisionUsesDenyOverrideAndDisabledModuleWins(bool moduleEnabled, bool grantedByRole, int? userOverrideValue, bool expected)
    {
        // Keep the public xUnit method signature free of the module's internal enum type.
        PermissionEffect? userOverride = userOverrideValue is int value
            ? (PermissionEffect)value
            : null;

        Assert.Equal(expected, PermissionDecision.IsAllowed(moduleEnabled, grantedByRole, userOverride));
    }

    [Fact]
    public void RefreshGraceProtectorRoundTripsAndRejectsTampering()
    {
        var options = Microsoft.Extensions.Options.Options.Create(new JwtOptions { SigningKey = new string('k', 64) });
        var protector = new RefreshGraceProtector(options);
        const string token = "opaque-refresh-token-value";

        var protectedToken = protector.Protect(token);

        Assert.NotEqual(token, protectedToken);
        Assert.True(protector.TryUnprotect(protectedToken, out var roundTripped));
        Assert.Equal(token, roundTripped);

        var bytes = Convert.FromBase64String(protectedToken);
        bytes[^1] ^= 0x01;
        Assert.False(protector.TryUnprotect(Convert.ToBase64String(bytes), out _));
    }

    [Fact]
    public void LoginAccountRateLimiterLimitsOneAccountWithoutBlockingOthers()
    {
        var limiter = new LoginAccountRateLimiter(new Pastel.Platform.Observability.LogHasher(), new Pastel.SharedKernel.SystemClock());

        for (var attempt = 0; attempt < 10; attempt++)
        {
            Assert.True(limiter.TryAcquire("USER@EXAMPLE.COM"));
        }

        Assert.False(limiter.TryAcquire("USER@EXAMPLE.COM"));
        Assert.True(limiter.TryAcquire("someone-else@example.com"));
    }
}
