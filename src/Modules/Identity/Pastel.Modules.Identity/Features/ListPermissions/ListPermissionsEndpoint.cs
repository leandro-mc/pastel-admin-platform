using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Features.ListPermissions;

/// <summary><c>GET /api/admin/permissions</c>: catálogo de permisos con su módulo, ordenado por módulo y código.</summary>
internal static class ListPermissionsEndpoint
{
    public static void Map(IEndpointRouteBuilder permissions) =>
        permissions.MapGet("/", HandleAsync).RequirePermission(IdentityPermissions.PermissionsRead);

    private static async Task<IResult> HandleAsync(IdentityDbContext db, CancellationToken cancellationToken) =>
        Results.Ok(await db.Permissions.AsNoTracking()
            // El catálogo global de Workspace incluye permisos de plataforma, nunca el catálogo privado de cada app.
            .Where(x => x.Code == IdentityPermissions.DashboardView || x.Code.StartsWith("settings."))
            .OrderBy(x => x.Module.SortOrder).ThenBy(x => x.Code)
            .Select(x => new PermissionSummary(x.Id, x.Module.Code, x.Module.Name, x.Code, x.Name, x.Description, x.IsSystemPermission))
            .ToListAsync(cancellationToken));
}
