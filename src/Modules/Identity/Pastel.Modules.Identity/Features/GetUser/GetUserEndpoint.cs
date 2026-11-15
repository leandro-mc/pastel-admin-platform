using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Features.GetUser;

/// <summary>
/// <c>GET /api/admin/users/{userId}</c>: una cuenta con sus roles. Lo usa el editor de accesos para cargar a una persona por la URL,
/// ya que la lista de usuarios está paginada en el servidor.
/// </summary>
internal static class GetUserEndpoint
{
    public static void Map(IEndpointRouteBuilder users) =>
        users.MapGet("/{userId:guid}", HandleAsync).RequirePermission(IdentityPermissions.UsersRead);

    private static async Task<IResult> HandleAsync(Guid userId, IdentityDbContext db, HttpContext http, CancellationToken cancellationToken)
    {
        var row = await db.Users.AsNoTracking()
            .Where(x => x.Id == userId)
            .Select(x => new
            {
                x.Id,
                x.Email,
                x.DisplayName,
                x.IsActive,
                x.MustChangePassword,
                x.AccessFailedCount,
                x.LockoutEnd,
                x.CreatedAt,
                Roles = x.UserRoles
                    .Where(r => r.Role.IsSystemRole
                        || (r.Role.RolePermissions.Any(p => p.Permission.Code.StartsWith("settings."))
                            && !r.Role.RolePermissions.Any(p =>
                                p.Permission.Code != IdentityPermissions.DashboardView
                                && !p.Permission.Code.StartsWith("settings."))))
                    .Select(r => r.Role.Name).ToList(),
            })
            .SingleOrDefaultAsync(cancellationToken);
        var result = row is null
            ? Result.Failure<UserSummary>(IdentityErrors.UserNotFound)
            : Result.Success(new UserSummary(
                row.Id, row.Email, row.DisplayName, row.IsActive, row.MustChangePassword,
                row.AccessFailedCount, row.LockoutEnd, row.CreatedAt,
                row.Roles.OrderBy(name => name, StringComparer.Ordinal).ToArray()));
        return result.ToResponse(http);
    }
}
