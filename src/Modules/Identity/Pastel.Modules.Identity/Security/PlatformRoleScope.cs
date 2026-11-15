using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Identity.Domain;

namespace Pastel.Modules.Identity.Security;

/// <summary>
/// Define qué roles pertenecen al ámbito global de Workspace. Roles de apps (incluido el rol genérico
/// Member si solo tiene dashboard.view) se administran en su aplicación y no entran en las APIs globales.
/// </summary>
internal static class PlatformRoleScope
{
    public static IQueryable<AppRole> Filter(IQueryable<AppRole> roles) =>
        roles.Where(role =>
            role.IsSystemRole
            || (role.RolePermissions.Any(link => link.Permission.Code.StartsWith("settings."))
                && !role.RolePermissions.Any(link =>
                    link.Permission.Code != IdentityPermissions.DashboardView
                    && !link.Permission.Code.StartsWith("settings."))));

    public static bool IsPlatformPermissionCode(string code) =>
        code == IdentityPermissions.DashboardView
        || code.StartsWith("settings.", StringComparison.Ordinal);

    /// <summary>
    /// Permisos que Workspace puede conceder como excepción individual: los de plataforma y el modo desarrollador.
    /// El modo desarrollador nunca se concede por rol personalizado (no es un permiso de plataforma de rol).
    /// </summary>
    public static bool IsUserOverridablePermissionCode(string code) =>
        IsPlatformPermissionCode(code) || code == IdentityPermissions.DeveloperMode;

    /// <summary>La entidad debe incluir RolePermissions y Permission antes de usar esta evaluación en memoria.</summary>
    public static bool IsPlatformRole(AppRole role)
    {
        if (role.IsSystemRole) return true;

        var codes = role.RolePermissions.Select(link => link.Permission.Code).ToArray();
        return codes.Any(code => code.StartsWith("settings.", StringComparison.Ordinal))
            && codes.All(IsPlatformPermissionCode);
    }
}
