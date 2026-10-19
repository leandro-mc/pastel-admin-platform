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

    /// <summary>Revoca todos los refresh tokens vigentes de la cuenta (cambio de contraseña, bloqueo, cambio de roles).</summary>
    public async Task RevokeAllAsync(Guid userId, CancellationToken cancellationToken)
    {
        var now = clock.UtcNow;
        var active = await db.RefreshTokens.Where(x => x.UserId == userId && x.RevokedAt == null).ToListAsync(cancellationToken);
        foreach (var token in active)
        {
            token.RevokedAt = now;
        }
    }
}
