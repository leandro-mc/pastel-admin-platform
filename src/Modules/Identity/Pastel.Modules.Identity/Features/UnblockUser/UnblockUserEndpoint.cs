using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Auditing;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Features.UnblockUser;

/// <summary><c>POST /api/admin/users/{userId}/unblock</c>: reactiva la cuenta y limpia el bloqueo por contraseña (204).</summary>
internal static class UnblockUserEndpoint
{
    public static void Map(IEndpointRouteBuilder users) =>
        users.MapPost("/{userId:guid}/unblock", HandleAsync).RequirePermission(IdentityPermissions.UsersLock);

    private static async Task<IResult> HandleAsync(
        Guid userId, IdentityDbContext db, IAuditTrail audit, ICurrentUser currentUser, IClock clock, HttpContext http, CancellationToken cancellationToken)
    {
        var user = await db.Users.SingleOrDefaultAsync(x => x.Id == userId, cancellationToken);
        if (user is null)
        {
            return Result.Failure(IdentityErrors.UserNotFound).ToNoContent(http);
        }

        var before = new { isActive = user.IsActive, locked = user.LockoutEnd > clock.UtcNow };
        user.IsActive = true;
        user.LockoutEnd = null;
        user.AccessFailedCount = 0;
        user.TokenVersion++;
        user.UpdatedAt = clock.UtcNow;
        audit.Add(new AuditRecord(
            "admin.user.unblocked", "identity", currentUser.UserId, userId, user.Email,
            Before: before, After: new { isActive = true, locked = false }));
        await db.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }
}
