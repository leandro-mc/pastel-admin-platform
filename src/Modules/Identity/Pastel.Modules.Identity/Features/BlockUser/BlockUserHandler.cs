using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Auditing;
using Pastel.Platform.Persistence;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Features.BlockUser;

internal sealed class BlockUserHandler(IdentityDbContext db, SessionIssuer issuer, IAuditTrail audit, ICurrentUser currentUser, IClock clock, IPrivilegeGuard guard)
{
    public Task<Result> HandleAsync(Guid userId, CancellationToken cancellationToken) =>
        TransactionRunner.RunSerializableAsync(db, token => ApplyAsync(userId, token), cancellationToken);

    private async Task<Result> ApplyAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await db.FindWithRolesAsync(userId, cancellationToken);
        if (user is null)
        {
            return IdentityErrors.UserNotFound;
        }

        if (await guard.AuthorizeActionOnUserAsync(user, "block_user", cancellationToken) is { } denied)
        {
            return denied;
        }

        if (currentUser.UserId == userId)
        {
            return IdentityErrors.CannotBlockSelf;
        }

        if (user.IsActive && user.IsAdministrator() && await db.CountActiveAdministratorsAsync(cancellationToken) <= 1)
        {
            return IdentityErrors.LastActiveAdministrator;
        }

        user.IsActive = false;
        user.TokenVersion++;
        user.UpdatedAt = clock.UtcNow;
        await issuer.RevokeAllAsync(userId, cancellationToken);
        audit.Add(new AuditRecord(
            "admin.user.blocked", "identity", currentUser.UserId, userId, user.Email,
            Before: new { isActive = true }, After: new { isActive = false }));
        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
