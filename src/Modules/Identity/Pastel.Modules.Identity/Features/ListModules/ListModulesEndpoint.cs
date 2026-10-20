using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Security;

namespace Pastel.Modules.Identity.Features.ListModules;

/// <summary><c>GET /api/admin/modules</c>: módulos sincronizados desde el código, con sus permisos. Ya no se crean desde la API.</summary>
internal static class ListModulesEndpoint
{
    public static void Map(IEndpointRouteBuilder modules) =>
        modules.MapGet("/", HandleAsync).RequirePermission(IdentityPermissions.ModulesRead);

    private static async Task<IResult> HandleAsync(IdentityDbContext db, CancellationToken cancellationToken)
    {
        var rows = await db.Modules.AsNoTracking().Include(x => x.Permissions)
            .OrderBy(x => x.SortOrder).ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);
        return Results.Ok(rows.Select(x => new ModuleSummary(
            x.Id, x.Code, x.Name, x.Description, x.IsEnabled, x.SortOrder,
            // La administración global ve el registro y estado de las apps; sus permisos quedan en cada app.
            (x.Code is "dashboard" or "settings"
                ? x.Permissions.Where(p => p.Code == IdentityPermissions.DashboardView || p.Code.StartsWith("settings."))
                    .OrderBy(p => p.Code, StringComparer.Ordinal)
                    .Select(p => new PermissionSummary(p.Id, x.Code, x.Name, p.Code, p.Name, p.Description, p.IsSystemPermission))
                    .ToArray()
                : Array.Empty<PermissionSummary>())).ToArray());
    }
}
