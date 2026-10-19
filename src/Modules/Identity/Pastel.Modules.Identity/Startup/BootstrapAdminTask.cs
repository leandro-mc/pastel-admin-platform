using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Auditing;
using Pastel.Platform.Modules;
using Pastel.Platform.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Startup;

/// <summary>
/// Cuenta de arranque (<c>Bootstrap:AdminEmail</c> y <c>Bootstrap:AdminPassword</c>). Crea la cuenta con contraseña temporal si no existe y,
/// si existe sin el rol Administrator, lo restaura y lo audita (<c>identity.bootstrap.admin_restored</c>). También puede quitar el bloqueo
/// temporal de inicio por contraseña de esa cuenta con el evento <c>identity.bootstrap.admin_lockout_cleared</c>: acceso de emergencia
/// (<i>break-glass</i>). Se ejecuta después de sincronizar el catálogo (orden 20).
/// </summary>
internal sealed class BootstrapAdminTask(IConfiguration configuration, ILogger<BootstrapAdminTask> logger) : IPastelStartupTask
{
    public int Order => 20;

    public async Task RunAsync(IServiceProvider services, CancellationToken cancellationToken)
    {
        var email = configuration["Bootstrap:AdminEmail"]?.Trim();
        var password = configuration["Bootstrap:AdminPassword"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning(
                IdentityEventIds.BootstrapAdmin,
                "No hay cuenta de arranque configurada. Defina Bootstrap__AdminEmail y Bootstrap__AdminPassword antes del primer uso");
            return;
        }

        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<AppUser>>();
        var audit = scope.ServiceProvider.GetRequiredService<IAuditTrail>();
        var clock = scope.ServiceProvider.GetRequiredService<IClock>();

        var outcome = await TransactionRunner.RunSerializableAsync(
            db, token => EnsureAdministratorAsync(db, hasher, audit, clock, email, password, token), cancellationToken);

        switch (outcome.Result)
        {
            case BootstrapResult.Created:
                logger.LogWarning(
                    IdentityEventIds.BootstrapAdmin,
                    "Se creó la cuenta de arranque {UserId}. Ingrese y cambie la contraseña temporal de inmediato", outcome.UserId);
                break;
            case BootstrapResult.Restored:
                logger.LogWarning(
                    IdentityEventIds.BootstrapAdmin,
                    "Se restauró el rol Administrator de la cuenta de arranque {UserId}", outcome.UserId);
                break;
            case BootstrapResult.LockoutCleared:
                logger.LogWarning(
                    IdentityEventIds.BootstrapAdmin,
                    "Se limpió el bloqueo de contraseña de la cuenta de arranque {UserId} mediante break-glass", outcome.UserId);
                break;
        }
    }

    private static async Task<(BootstrapResult Result, Guid UserId)> EnsureAdministratorAsync(
        IdentityDbContext db,
        IPasswordHasher<AppUser> hasher,
        IAuditTrail audit,
        IClock clock,
        string email,
        string password,
        CancellationToken cancellationToken)
    {
        var adminRole = await db.Roles.SingleAsync(r => r.NormalizedName == AppRole.AdministratorName.ToUpperInvariant(), cancellationToken);
        var normalized = email.ToUpperInvariant();
        var user = await db.Users.SingleOrDefaultAsync(u => u.NormalizedEmail == normalized, cancellationToken);

        if (user is null)
        {
            user = new AppUser { Email = email, NormalizedEmail = normalized, DisplayName = "Administrador", MustChangePassword = true };
            user.PasswordHash = hasher.HashPassword(user, password);
            db.Users.Add(user);
            db.UserRoles.Add(new UserRole { User = user, Role = adminRole });
            audit.Add(new AuditRecord(
                "identity.bootstrap.admin_created", "identity", null, user.Id, "cuenta de arranque",
                After: new { roles = new[] { adminRole.Name }, mustChangePassword = true }));
            await db.SaveChangesAsync(cancellationToken);
            return (BootstrapResult.Created, user.Id);
        }

        var now = clock.UtcNow;
        if (await db.UserRoles.AnyAsync(ur => ur.UserId == user.Id && ur.RoleId == adminRole.Id, cancellationToken))
        {
            if (user.LockoutEnd is not { } lockoutEnd || lockoutEnd <= now)
            {
                return (BootstrapResult.Unchanged, user.Id);
            }

            var before = new { lockoutEnd, accessFailedCount = user.AccessFailedCount };
            user.LockoutEnd = null;
            user.AccessFailedCount = 0;
            user.UpdatedAt = now;
            audit.Add(new AuditRecord(
                "identity.bootstrap.admin_lockout_cleared", "identity", null, user.Id, "cuenta de arranque",
                Before: before, After: new { lockoutEnd = (DateTimeOffset?)null, accessFailedCount = 0 }));
            await db.SaveChangesAsync(cancellationToken);
            return (BootstrapResult.LockoutCleared, user.Id);
        }

        var beforeState = new
        {
            isActive = user.IsActive,
            lockoutEnd = user.LockoutEnd,
            accessFailedCount = user.AccessFailedCount,
            activeRefreshTokens = await db.RefreshTokens.CountAsync(x => x.UserId == user.Id && x.RevokedAt == null, cancellationToken),
        };
        db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = adminRole.Id });
        user.IsActive = true;
        user.LockoutEnd = null;
        user.AccessFailedCount = 0;
        user.TokenVersion++;
        user.UpdatedAt = now;
        var activeTokens = await db.RefreshTokens.Where(x => x.UserId == user.Id && x.RevokedAt == null).ToListAsync(cancellationToken);
        foreach (var token in activeTokens)
        {
            token.RevokedAt = now;
        }

        audit.Add(new AuditRecord(
            "identity.bootstrap.admin_restored", "identity", null, user.Id, "cuenta de arranque",
            Before: beforeState, After: new { isAdministrator = true, isActive = true, lockoutEnd = (DateTimeOffset?)null, accessFailedCount = 0, refreshTokensRevoked = activeTokens.Count }));
        await db.SaveChangesAsync(cancellationToken);
        return (BootstrapResult.Restored, user.Id);
    }

    private enum BootstrapResult
    {
        Unchanged,
        Created,
        Restored,
        LockoutCleared,
    }
}
