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
    [InlineData("correct horse battery staple", true)]
    [InlineData("Sage-Garden_2026!", true)]
    public void PasswordPolicyUsesLengthAndCommonPasswordBlocklistWithoutCompositionRules(string password, bool expected)
    {
        Assert.Equal(expected, PasswordPolicy.IsStrong(password));
    }

    [Theory]
    [InlineData(true, true, null, true)]
    [InlineData(true, false, null, false)]
    [InlineData(false, true, null, false)]
    [InlineData(false, false, PermissionEffect.Grant, false)]
    [InlineData(true, true, PermissionEffect.Deny, false)]
    [InlineData(true, false, PermissionEffect.Grant, true)]
    public void PermissionDecisionUsesDenyOverrideAndDisabledModuleWins(bool moduleEnabled, bool grantedByRole, PermissionEffect? userOverride, bool expected)
    {
        Assert.Equal(expected, PermissionDecision.IsAllowed(moduleEnabled, grantedByRole, userOverride));
    }
}
