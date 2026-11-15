using Pastel.Modules.Identity.Security;
using Xunit;

namespace Pastel.Modules.Identity.Tests;

/// <summary>Reglas del modo desarrollador que no dependen de la base: dónde se puede conceder y dónde está declarado.</summary>
public sealed class DeveloperModeTests
{
    [Fact]
    public void DeveloperModeIsGrantableToAnAccountButIsNeverAPlatformRoleCode()
    {
        // Como excepción individual sí; en un rol personalizado no (los roles solo admiten permisos de plataforma).
        Assert.True(PlatformRoleScope.IsUserOverridablePermissionCode(IdentityPermissions.DeveloperMode));
        Assert.False(PlatformRoleScope.IsPlatformPermissionCode(IdentityPermissions.DeveloperMode));
    }

    [Theory]
    [InlineData("platform.owner")]
    [InlineData("platform.workspace.access")]
    [InlineData("brisa.access")]
    [InlineData("huella.access")]
    public void ReservedAndAppPermissionsRemainOutOfReachOfIndividualGrantsFromWorkspace(string code)
    {
        Assert.False(PlatformRoleScope.IsUserOverridablePermissionCode(code));
    }

    [Fact]
    public void DeveloperModeIsDeclaredOnceInThePlatformGroupWithItsPrefix()
    {
        var platform = Assert.Single(IdentityPermissions.Groups, group => group.Code == "platform");

        Assert.Single(platform.Permissions, permission => permission.Code == IdentityPermissions.DeveloperMode);
        Assert.StartsWith("platform.", IdentityPermissions.DeveloperMode, StringComparison.Ordinal);
    }
}
