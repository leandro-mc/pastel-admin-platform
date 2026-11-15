using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Features.ListRoles;

/// <summary><c>GET /api/admin/roles</c>: roles con sus permisos y cantidad de personas (una consulta).</summary>
internal static class ListRolesEndpoint
{
    public static void Map(IEndpointRouteBuilder roles) =>
        roles.MapGet("/", HandleAsync).RequirePermission(IdentityPermissions.RolesRead);

    internal static async Task<IReadOnlyList<RoleSummary>> QueryAsync(IdentityDbContext db, CancellationToken cancellationToken, Guid? roleId = null)
    {
        var query = db.Roles.AsNoTracking().AsQueryable();
        if (roleId is { } id)
        {
            query = query.Where(x => x.Id == id);
        }
        else
        {
            query = PlatformRoleScope.Filter(query);
        }

        var rows = await query.OrderBy(x => x.Name)
            .Select(x => new
            {
                x.Id,
                x.Name,
                x.Description,
                x.IsSystemRole,
                // Workspace solo recibe códigos/IDs de permisos de plataforma. Incluso Owner/Superuser
                // gestiona permisos funcionales desde la app correspondiente, no desde este endpoint global.
                Permissions = x.RolePermissions
                    .Where(p => p.Permission.Code == IdentityPermissions.DashboardView
                        || p.Permission.Code.StartsWith("settings."))
                    .Select(p => new { p.PermissionId, p.Permission.Code }).ToList(),
                UserCount = x.UserRoles.Count(),
            })
            .ToListAsync(cancellationToken);
        return rows.Select(x => new RoleSummary(
            x.Id, x.Name, x.Description, x.IsSystemRole,
            x.Permissions.Select(p => p.PermissionId).ToArray(),
            x.Permissions.Select(p => p.Code).OrderBy(c => c, StringComparer.Ordinal).ToArray(),
            x.UserCount)).ToArray();
    }

    private static async Task<IResult> HandleAsync(IdentityDbContext db, CancellationToken cancellationToken) =>
        Results.Ok(await QueryAsync(db, cancellationToken));
}
