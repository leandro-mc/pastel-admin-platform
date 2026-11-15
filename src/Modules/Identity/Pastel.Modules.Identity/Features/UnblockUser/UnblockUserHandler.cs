using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Auditing;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Features.UnblockUser;

internal sealed class UnblockUserHandler(IdentityDbContext db, IPrivilegeGuard guard, IAuditTrail audit, ICurrentUser currentUser, IClock clock)
{
    public async Task<Result> HandleAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await db.FindWithRolesAsync(userId, cancellationToken);
        if (user is null)
        {
            return IdentityErrors.UserNotFound;
        }

        if (await guard.AuthorizeActionOnUserAsync(user, "unblock_user", cancellationToken) is { } denied)
        {
            return denied;
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
        return Result.Success();
    }
}
