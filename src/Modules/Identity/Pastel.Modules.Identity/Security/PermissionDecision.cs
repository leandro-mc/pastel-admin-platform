using Pastel.Modules.Identity.Domain;

namespace Pastel.Modules.Identity.Security;

internal static class PermissionDecision
{
    public static bool IsAllowed(bool moduleEnabled, bool grantedByRole, PermissionEffect? userOverride)
    {
        if (!moduleEnabled) return false;
        return userOverride switch
        {
            PermissionEffect.Deny => false,
            PermissionEffect.Grant => true,
            _ => grantedByRole
        };
    }
}
