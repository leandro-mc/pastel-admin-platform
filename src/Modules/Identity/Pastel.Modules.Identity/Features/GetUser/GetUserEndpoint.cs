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
        var user = await db.Users.AsNoTracking()
            .Include(x => x.UserRoles).ThenInclude(x => x.Role)
            .SingleOrDefaultAsync(x => x.Id == userId, cancellationToken);
        var result = user is null
            ? Result.Failure<UserSummary>(IdentityErrors.UserNotFound)
            : Result.Success(UserMapping.ToSummary(user));
        return result.ToResponse(http);
    }
}
