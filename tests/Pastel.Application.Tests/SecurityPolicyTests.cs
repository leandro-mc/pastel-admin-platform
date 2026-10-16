using Pastel.Application.Contracts;
using Pastel.Domain.Entities;
using Xunit;

namespace Pastel.Application.Tests;

public sealed class SecurityPolicyTests
{
    [Theory]
    [InlineData("shortA1!", false)]
    [InlineData("onlylowercaseletters123!", false)]
    [InlineData("NOLOWERCASE123!", false)]
    [InlineData("NoDigitsAtAll!", false)]
    [InlineData("A9", false)]
    [InlineData("Sage-Garden_2026!", true)]
    public void PasswordPolicyRequiresLengthAndCharacterVariety(string password, bool expected)
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
