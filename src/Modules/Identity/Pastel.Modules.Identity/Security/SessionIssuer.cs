using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Persistence;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Security;

/// <summary>Sesión recién emitida: el acceso y el refresh viajan en cookies; el resumen, en el cuerpo.</summary>
internal sealed record IssuedSession(
    string AccessToken, DateTimeOffset AccessExpiresAt, string RefreshToken, DateTimeOffset RefreshExpiresAt, SessionSummary Summary);

/// <summary>Emite el par de tokens. Agrega el refresh token al contexto sin guardar: lo guarda quien llama, en su misma transacción.</summary>
internal sealed class SessionIssuer(IdentityDbContext db, ITokenService tokens, IOptions<JwtOptions> jwt, IClock clock, ICurrentUser currentUser)
{
    public IssuedSession Issue(AppUser user)
    {
        var now = clock.UtcNow;
        var (access, accessExpires) = tokens.CreateAccessToken(user);
        var refresh = TokenSecrets.NewOpaqueToken();
        var refreshExpires = now.AddDays(jwt.Value.RefreshTokenDays);
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = TokenSecrets.Hash(refresh),
            CreatedAt = now,
            ExpiresAt = refreshExpires,
            CreatedByIp = currentUser.ClientIp,
        });
        return new IssuedSession(access, accessExpires, refresh, refreshExpires, new SessionSummary(UserMapping.ToSummary(user), accessExpires));
    }

    /// <summary>Emite acceso nuevo usando un refresh vigente ya creado por la primera petición concurrente; no agrega otra fila.</summary>
    public IssuedSession ReissueAccessForExistingRefresh(AppUser user, string refreshToken, DateTimeOffset refreshExpiresAt)
    {
        var (access, accessExpires) = tokens.CreateAccessToken(user);
        return new IssuedSession(access, accessExpires, refreshToken, refreshExpiresAt, new SessionSummary(UserMapping.ToSummary(user), accessExpires));
    }

    /// <summary>
    /// Invalida toda la cadena de refresh tokens (cambio de contraseña, bloqueo, cambio de roles o reutilización).
    /// Se limpian enlaces/ciphertexts de rotación: después de una revocación explícita, un token histórico ya no debe
    /// interpretarse como reutilización de un sucesor que fue invalidado intencionadamente.
    /// </summary>
    public async Task RevokeAllAsync(Guid userId, CancellationToken cancellationToken)
    {
        var now = clock.UtcNow;
        var tokens = await db.RefreshTokens.Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        foreach (var token in tokens)
        {
            token.RevokedAt ??= now;
            token.ReplacedByTokenHash = null;
            token.ReplacedByEncryptedToken = null;
            token.GraceUntil = null;
        }
    }
}
