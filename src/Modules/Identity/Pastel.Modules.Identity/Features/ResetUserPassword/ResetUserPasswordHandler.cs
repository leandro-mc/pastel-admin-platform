using System.Security.Cryptography;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Auditing;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Features.ResetUserPassword;

internal sealed class ResetUserPasswordHandler(
    IdentityDbContext db, IPasswordHasher<AppUser> hasher, SessionIssuer issuer, IAuditTrail audit, ICurrentUser currentUser, IClock clock, IPrivilegeGuard guard)
{
    public async Task<Result<ResetUserPasswordResponse>> HandleAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await db.FindWithRolesAsync(userId, cancellationToken);
        if (user is null)
        {
            return IdentityErrors.UserNotFound;
        }

        if (await guard.AuthorizeActionOnUserAsync(user, "reset_password", cancellationToken) is { } denied)
        {
            return denied;
        }

        // Cumple la política vigente (mayúscula, minúscula, número y símbolo). La contraseña nunca se registra ni se audita.
        var temporary = $"Pst!{Convert.ToHexString(RandomNumberGenerator.GetBytes(12))}a9";
        var wasTemporary = user.MustChangePassword;
        user.PasswordHash = hasher.HashPassword(user, temporary);
        user.MustChangePassword = true;
        user.AccessFailedCount = 0;
        user.LockoutEnd = null;
        user.TokenVersion++;
        user.UpdatedAt = clock.UtcNow;
        await issuer.RevokeAllAsync(userId, cancellationToken);
        audit.Add(new AuditRecord(
            "admin.user.password-reset", "identity", currentUser.UserId, userId, user.Email,
            Before: new { mustChangePassword = wasTemporary }, After: new { mustChangePassword = true }));
        await db.SaveChangesAsync(cancellationToken);
        return new ResetUserPasswordResponse(temporary, true);
    }
}
