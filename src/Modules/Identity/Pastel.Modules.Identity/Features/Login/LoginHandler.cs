using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Auditing;
using Pastel.Platform.Observability;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Features.Login;

internal sealed class LoginHandler(
    IdentityDbContext db,
    IPasswordHasher<AppUser> hasher,
    SessionIssuer issuer,
    IAuditTrail audit,
    IClock clock,
    IOptions<AuthOptions> auth,
    LogHasher logHasher,
    ILogger<LoginHandler> logger)
{
    private const int MaxFailures = 5;
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);
    private const int MaxPasswordLength = 256;

    public async Task<Result<IssuedSession>> HandleAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        if (!auth.Value.Local.Enabled)
        {
            return IdentityErrors.LocalLoginDisabled;
        }

        var email = UserMapping.NormalizeEmail(request.Email);
        var password = request.Password ?? string.Empty;
        if (email.Length > 320 || password.Length is 0 or > MaxPasswordLength)
        {
            return IdentityErrors.InvalidCredentials;
        }

        var now = clock.UtcNow;
        var user = await db.Users.Include(x => x.UserRoles).ThenInclude(x => x.Role)
            .SingleOrDefaultAsync(x => x.NormalizedEmail == email, cancellationToken);
        if (user is null)
        {
            logger.LogWarning(IdentityEventIds.LoginFailed, "Ingreso fallido: cuenta desconocida {AccountHash}", logHasher.Hash(email));
            audit.Add(new AuditRecord("auth.login.failed", "identity", Target: "unknown-account"));
            await db.SaveChangesAsync(cancellationToken);
            return IdentityErrors.InvalidCredentials;
        }

        if (!user.IsActive || user.LockoutEnd > now || user.PasswordHash is null)
        {
            logger.LogWarning(IdentityEventIds.LoginFailed, "Ingreso denegado a {UserId}: cuenta inactiva, bloqueada o sin contraseña", user.Id);
            audit.Add(new AuditRecord("auth.login.denied", "identity", user.Id, user.Id, "inactive-or-locked"));
            await db.SaveChangesAsync(cancellationToken);
            return IdentityErrors.InvalidCredentials;
        }

        var verification = hasher.VerifyHashedPassword(user, user.PasswordHash, password);
        if (verification == PasswordVerificationResult.Failed)
        {
            await RegisterFailureAsync(user, now, cancellationToken);
            return IdentityErrors.InvalidCredentials;
        }

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = hasher.HashPassword(user, password);
        }

        user.AccessFailedCount = 0;
        user.LockoutEnd = null;
        user.UpdatedAt = now;
        audit.Add(new AuditRecord("auth.login.succeeded", "identity", user.Id, user.Id));
        var session = issuer.Issue(user);
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation(IdentityEventIds.LoginSucceeded, "Ingreso correcto de {UserId}", user.Id);
        return session;
    }

    /// <summary>El bloqueo solo afecta el ingreso con contraseña; no cierra sesiones ya abiertas (decisión 4 de PROGRESS).</summary>
    private async Task RegisterFailureAsync(AppUser user, DateTimeOffset now, CancellationToken cancellationToken)
    {
        user.AccessFailedCount++;
        var locked = user.AccessFailedCount >= MaxFailures;
        if (locked)
        {
            user.LockoutEnd = now.Add(LockoutDuration);
            user.AccessFailedCount = 0;
        }

        user.UpdatedAt = now;
        audit.Add(new AuditRecord("auth.login.failed", "identity", user.Id, user.Id, "invalid-credentials"));
        await db.SaveChangesAsync(cancellationToken);
        logger.LogWarning(IdentityEventIds.LoginFailed, "Contraseña incorrecta para {UserId}", user.Id);
        if (locked)
        {
            logger.LogWarning(IdentityEventIds.AccountLocked, "Cuenta {UserId} bloqueada para ingreso con contraseña durante {Minutes} minutos", user.Id, LockoutDuration.TotalMinutes);
        }
    }
}
