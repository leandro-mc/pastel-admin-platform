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
    LoginAccountRateLimiter accountLimiter,
    LogHasher logHasher,
    ILogger<LoginHandler> logger)
{
    private const int MaxFailures = 5;
    private const int MaxLockoutExponent = 4;
    private static readonly TimeSpan BaseLockoutDuration = TimeSpan.FromMinutes(15);
    private const int MaxPasswordLength = 256;

    // Formato PasswordHasher V3, HMAC-SHA256, 600 000 iteraciones y salt no relacionado con ninguna cuenta real.
    // Se usa solo para realizar un cálculo equivalente cuando no hay hash de contraseña verificable.
    private const string DummyPasswordHash = "AQAAAAEACSfAAAAAEI86CkLB3lt3kKweb7s30lHO9STLInKLcr0612NgPl+pgecAM6cbo6FC4Nx+zzX5dg==";
    private static readonly AppUser DummyUser = new()
    {
        Email = "unknown@invalid.local",
        NormalizedEmail = "UNKNOWN@INVALID.LOCAL",
        DisplayName = "Unknown",
    };

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

        if (!accountLimiter.TryAcquire(email))
        {
            // Respuesta idéntica a credenciales inválidas para no revelar si una cuenta llegó al límite.
            logger.LogWarning(IdentityEventIds.LoginFailed, "Límite de intentos de ingreso alcanzado para {AccountHash}", logHasher.Hash(email));
            return IdentityErrors.InvalidCredentials;
        }

        var now = clock.UtcNow;
        var user = await db.Users.Include(x => x.UserRoles).ThenInclude(x => x.Role)
            .SingleOrDefaultAsync(x => x.NormalizedEmail == email, cancellationToken);
        if (user is null)
        {
            // Evita que la ausencia de una cuenta elimine el costo principal del algoritmo de hash.
            _ = hasher.VerifyHashedPassword(DummyUser, DummyPasswordHash, password);
            logger.LogWarning(IdentityEventIds.LoginFailed, "Ingreso fallido: cuenta desconocida {AccountHash}", logHasher.Hash(email));
            audit.Add(new AuditRecord("auth.login.failed", "identity", Target: "unknown-account"));
            await db.SaveChangesAsync(cancellationToken);
            return IdentityErrors.InvalidCredentials;
        }

        // También se verifica un hash cuando la cuenta está inactiva, bloqueada o no tiene contraseña.
        // El bloqueo sigue limitándose al ingreso con contraseña y no invalida sesiones ya emitidas.
        var hashToVerify = user.PasswordHash ?? DummyPasswordHash;
        var userToVerify = user.PasswordHash is null ? DummyUser : user;
        var verification = hasher.VerifyHashedPassword(userToVerify, hashToVerify, password);
        if (!user.IsActive || user.LockoutEnd > now || user.PasswordHash is null)
        {
            logger.LogWarning(IdentityEventIds.LoginFailed, "Ingreso denegado a {UserId}: cuenta inactiva, bloqueada o sin contraseña", user.Id);
            audit.Add(new AuditRecord("auth.login.denied", "identity", user.Id, user.Id, "inactive-or-locked"));
            await db.SaveChangesAsync(cancellationToken);
            return IdentityErrors.InvalidCredentials;
        }

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

    /// <summary>
    /// El bloqueo solo afecta el ingreso con contraseña; no cierra sesiones ya abiertas.
    /// La duración crece con cada ciclo de bloqueo y se restablece luego de un ingreso correcto.
    /// </summary>
    private async Task RegisterFailureAsync(AppUser user, DateTimeOffset now, CancellationToken cancellationToken)
    {
        user.AccessFailedCount = Math.Min(user.AccessFailedCount + 1, MaxFailures + MaxLockoutExponent);
        var locked = user.AccessFailedCount >= MaxFailures;
        TimeSpan? lockoutDuration = null;
        if (locked)
        {
            var exponent = Math.Min(user.AccessFailedCount - MaxFailures, MaxLockoutExponent);
            lockoutDuration = TimeSpan.FromTicks(BaseLockoutDuration.Ticks * (1L << exponent));
            user.LockoutEnd = now.Add(lockoutDuration.Value);
        }

        user.UpdatedAt = now;
        audit.Add(new AuditRecord("auth.login.failed", "identity", user.Id, user.Id, "invalid-credentials"));
        await db.SaveChangesAsync(cancellationToken);
        logger.LogWarning(IdentityEventIds.LoginFailed, "Contraseña incorrecta para {UserId}", user.Id);
        if (locked && lockoutDuration is { } duration)
        {
            logger.LogWarning(IdentityEventIds.AccountLocked, "Cuenta {UserId} bloqueada para ingreso con contraseña durante {Minutes} minutos", user.Id, duration.TotalMinutes);
        }
    }
}
