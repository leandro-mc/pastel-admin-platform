using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Auditing;
using Pastel.Platform.Errors;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Features.ChangePassword;

internal sealed class ChangePasswordHandler(
    IdentityDbContext db,
    IPasswordHasher<AppUser> hasher,
    SessionIssuer issuer,
    ICurrentUser currentUser,
    IAuditTrail audit,
    IClock clock,
    ILogger<ChangePasswordHandler> logger)
{
    private const int MaxPasswordLength = 256;

    public async Task<Result> HandleAsync(ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        if (currentUser.UserId is not { } userId)
        {
            return PlatformErrors.Unauthorized;
        }

        if (!PasswordPolicy.IsStrong(request.NewPassword))
        {
            return IdentityErrors.PasswordWeak("newPassword");
        }

        var user = await db.Users.SingleOrDefaultAsync(x => x.Id == userId, cancellationToken);
        if (user is null)
        {
            return IdentityErrors.InvalidSession;
        }

        var current = request.CurrentPassword ?? string.Empty;
        if (user.PasswordHash is null || current.Length is 0 or > MaxPasswordLength
            || hasher.VerifyHashedPassword(user, user.PasswordHash, current) == PasswordVerificationResult.Failed)
        {
            return IdentityErrors.CurrentPasswordIncorrect();
        }

        var wasTemporary = user.MustChangePassword;
        user.PasswordHash = hasher.HashPassword(user, request.NewPassword!);
        user.MustChangePassword = false;
        user.TokenVersion++;
        user.UpdatedAt = clock.UtcNow;
        await issuer.RevokeAllAsync(userId, cancellationToken);
        audit.Add(new AuditRecord(
            "user.password.changed", "identity", userId, userId,
            Before: new { mustChangePassword = wasTemporary }, After: new { mustChangePassword = false }));
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation(IdentityEventIds.PasswordChanged, "{UserId} cambió su contraseña y se cerraron sus sesiones", userId);
        return Result.Success();
    }
}
