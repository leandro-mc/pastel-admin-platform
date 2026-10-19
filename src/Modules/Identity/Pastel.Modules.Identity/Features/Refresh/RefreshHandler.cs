using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Auditing;
using Pastel.Platform.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Features.Refresh;

/// <summary>
/// Rotación del refresh token en transacción serializable (con reintento acotado ante 40001/40P01).
/// El uso de un token ya rotado revoca todas las sesiones de la cuenta. WP4 (S2) agrega la ventana de gracia.
/// </summary>
internal sealed class RefreshHandler(
    IdentityDbContext db, SessionIssuer issuer, IAuditTrail audit, IClock clock, ILogger<RefreshHandler> logger)
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
        audit.Add(new AuditRecord("auth.refresh.succeeded", "identity", user.Id, user.Id));
        await db.SaveChangesAsync(cancellationToken);
        logger.LogDebug(IdentityEventIds.SessionRefreshed, "Sesión renovada para {UserId}", user.Id);
        return session;
    }

    /// <summary>Un token ya rotado puede indicar robo: se revocan todas las sesiones y se invalidan los accesos vigentes.</summary>
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
