using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Auditing;
using Pastel.Platform.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Features.Refresh;

/// <summary>
/// Rota el refresh token en transacción serializable. El token sustituto se conserva cifrado solo durante la ventana de gracia,
/// para que peticiones concurrentes legítimas que presentan el mismo token reciban el mismo refresh token nuevo.
/// La reutilización posterior a esa ventana revoca todas las sesiones.
/// </summary>
internal sealed class RefreshHandler(
    IdentityDbContext db,
    SessionIssuer issuer,
    RefreshGraceProtector graceProtector,
    IOptions<AuthOptions> auth,
    IAuditTrail audit,
    IClock clock,
    ILogger<RefreshHandler> logger)
{
    private const int MaxTokenLength = 256;

    public async Task<Result<IssuedSession>> HandleAsync(string? refreshToken, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken) || refreshToken.Length > MaxTokenLength)
        {
            return IdentityErrors.InvalidSession;
        }

        var hash = TokenSecrets.Hash(refreshToken);
        return await TransactionRunner.RunSerializableAsync(db, token => RotateAsync(hash, token), cancellationToken);
    }

    private async Task<Result<IssuedSession>> RotateAsync(string hash, CancellationToken cancellationToken)
    {
        var stored = await db.RefreshTokens
            .Include(x => x.User).ThenInclude(x => x.UserRoles).ThenInclude(x => x.Role)
            .SingleOrDefaultAsync(x => x.TokenHash == hash, cancellationToken);
        if (stored is null)
        {
            return IdentityErrors.InvalidSession;
        }

        var now = clock.UtcNow;
        var user = stored.User;
        if (stored.RevokedAt is not null)
        {
            // Una revocación por logout, cambio de contraseña, bloqueo o cambio de roles no es prueba de reutilización.
            if (stored.ReplacedByTokenHash is null)
            {
                return IdentityErrors.SessionExpired;
            }

            if (auth.Value.Refresh.ReuseGraceSeconds > 0 && stored.GraceUntil > now)
            {
                var successor = await db.RefreshTokens.SingleOrDefaultAsync(
                    x => x.TokenHash == stored.ReplacedByTokenHash, cancellationToken);
                if (successor is not null && successor.RevokedAt is null && successor.ExpiresAt > now && user.IsActive
                    && graceProtector.TryUnprotect(stored.ReplacedByEncryptedToken, out var replacementToken))
                {
                    // No se rota por segunda vez: las peticiones paralelas reciben el mismo refresh vigente.
                    audit.Add(new AuditRecord("auth.refresh.grace-reused", "identity", user.Id, user.Id));
                    await db.SaveChangesAsync(cancellationToken);
                    return issuer.ReissueAccessForExistingRefresh(user, replacementToken, successor.ExpiresAt);
                }

                // Durante la gracia, una rotación concurrente posterior puede haber invalidado al sucesor.
                // No la clasifique como robo ni revoque todas las sesiones; simplemente solicite un refresh nuevo.
                return IdentityErrors.SessionExpired;
            }

            await RevokeOnReuseAsync(stored.UserId, now, cancellationToken);
            return IdentityErrors.SessionExpired;
        }

        if (stored.ExpiresAt <= now || !user.IsActive)
        {
            stored.RevokedAt = now;
            await db.SaveChangesAsync(cancellationToken);
            return IdentityErrors.SessionExpired;
        }

        var session = issuer.Issue(user);
        stored.RevokedAt = now;
        stored.ReplacedByTokenHash = TokenSecrets.Hash(session.RefreshToken);
        var graceSeconds = auth.Value.Refresh.ReuseGraceSeconds;
        stored.GraceUntil = graceSeconds > 0 ? now.AddSeconds(graceSeconds) : null;
        stored.ReplacedByEncryptedToken = graceSeconds > 0 ? graceProtector.Protect(session.RefreshToken) : null;
        audit.Add(new AuditRecord("auth.refresh.succeeded", "identity", user.Id, user.Id));
        await db.SaveChangesAsync(cancellationToken);
        logger.LogDebug(IdentityEventIds.SessionRefreshed, "Sesión renovada para {UserId}", user.Id);
        return session;
    }

    /// <summary>La reutilización fuera de la gracia puede indicar robo: revoca sesiones e invalida accesos vigentes.</summary>
    private async Task RevokeOnReuseAsync(Guid userId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        await issuer.RevokeAllAsync(userId, cancellationToken);
        var user = await db.Users.SingleAsync(x => x.Id == userId, cancellationToken);
        user.TokenVersion++;
        user.UpdatedAt = now;
        audit.Add(new AuditRecord("auth.refresh.reuse-detected", "identity", userId, userId));
        await db.SaveChangesAsync(cancellationToken);
        logger.LogWarning(IdentityEventIds.RefreshReuseDetected, "Se reutilizó un refresh token rotado de {UserId}; se revocaron sus sesiones", userId);
    }
}
