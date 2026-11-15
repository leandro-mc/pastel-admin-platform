using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Auditing;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Features.Logout;

internal sealed class LogoutHandler(IdentityDbContext db, ICurrentUser currentUser, IAuditTrail audit, IClock clock)
{
    private const int MaxTokenLength = 256;

    public async Task HandleAsync(string? refreshToken, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(refreshToken) && refreshToken.Length <= MaxTokenLength)
        {
            var hash = TokenSecrets.Hash(refreshToken);
            var stored = await db.RefreshTokens.SingleOrDefaultAsync(x => x.TokenHash == hash, cancellationToken);
            if (stored is { RevokedAt: null })
            {
                stored.RevokedAt = clock.UtcNow;
            }
        }

        if (currentUser.UserId is { } userId)
        {
            audit.Add(new AuditRecord("auth.logout", "identity", userId, userId));
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
