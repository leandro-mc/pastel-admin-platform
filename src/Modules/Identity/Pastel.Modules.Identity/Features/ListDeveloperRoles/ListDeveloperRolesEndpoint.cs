using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Modules;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Features.ListDeveloperRoles;

/// <summary>
/// <c>GET /api/admin/developer/roles?app=&lt;código&gt;</c>: definiciones de rol (y sus permisos dentro de esa aplicación)
/// para la vista previa del modo desarrollador. Solo informa; no concede nada: el cliente usa esta lista para mostrar la
/// interfaz como la vería un rol, y el servidor sigue autorizando cada operación con la sesión real. No devuelve personas
/// ni datos de negocio.
/// </summary>
internal static class ListDeveloperRolesEndpoint
{
    public static void Map(IEndpointRouteBuilder developer) =>
        developer.MapGet("/roles", HandleAsync).RequirePermission(IdentityPermissions.DeveloperMode);

    private static async Task<IResult> HandleAsync(
        string? app, ModuleCatalog catalog, IdentityDbContext db, HttpContext http, CancellationToken cancellationToken)
    {
        // El código se valida contra el catálogo cargado en el proceso: nunca contra texto libre del cliente.
        var module = catalog.Modules.FirstOrDefault(m => string.Equals(m.Code, app, StringComparison.Ordinal));
        if (module is null)
        {
            return Result.Failure<DeveloperRolesResponse>(IdentityErrors.DeveloperAppNotFound).ToResponse(http);
        }

        // Permisos que pertenecen a la aplicación (en Workspace, sus tres grupos: dashboard, settings y platform).
        var appPermissions = module.Permissions
            .SelectMany(group => group.Permissions)
            .Select(permission => permission.Code)
            .Distinct(StringComparer.Ordinal)
            .OrderBy(code => code, StringComparer.Ordinal)
            .ToArray();

        var rows = await db.Roles.AsNoTracking()
            .Where(role => role.RolePermissions.Any(link => appPermissions.Contains(link.Permission.Code)))
            .OrderByDescending(role => role.IsSystemRole).ThenBy(role => role.Name)
            .Select(role => new
            {
                role.Name,
                role.Description,
                role.IsSystemRole,
                Permissions = role.RolePermissions
                    .Where(link => appPermissions.Contains(link.Permission.Code))
                    .Select(link => link.Permission.Code)
                    .OrderBy(code => code)
                    .ToList(),
            })
            .ToListAsync(cancellationToken);

        var roles = rows
            .Select(row => new DeveloperRoleView(row.Name, row.Description, row.IsSystemRole, row.Permissions))
            .ToList();

        return Result.Success(new DeveloperRolesResponse(module.Code, appPermissions, roles)).ToResponse(http);
    }
}
