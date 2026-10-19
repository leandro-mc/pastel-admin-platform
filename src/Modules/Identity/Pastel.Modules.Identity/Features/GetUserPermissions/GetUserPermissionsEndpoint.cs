using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Features.GetUserPermissions;

/// <summary><c>GET /api/admin/users/{userId}/permissions</c>: excepciones individuales (concesiones y denegaciones) de la cuenta.</summary>
internal static class GetUserPermissionsEndpoint
{
    public static void Map(IEndpointRouteBuilder users) =>
        users.MapGet("/{userId:guid}/permissions", HandleAsync).RequirePermission(IdentityPermissions.UsersRead);

    private static async Task<IResult> HandleAsync(Guid userId, IdentityDbContext db, HttpContext http, CancellationToken cancellationToken)
    {
        if (!await db.Users.AnyAsync(x => x.Id == userId, cancellationToken))
        {
            return Result.Failure<IReadOnlyList<UserPermissionAssignment>>(IdentityErrors.UserNotFound).ToResponse(http);
        }

        IReadOnlyList<UserPermissionAssignment> items = await db.UserPermissionOverrides.AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderBy(x => x.Permission.Code)
            .Select(x => new UserPermissionAssignment(x.PermissionId, x.Permission.Code, x.Permission.Name, x.Effect))
            .ToListAsync(cancellationToken);
        return Result.Success(items).ToResponse(http);
    }
}
