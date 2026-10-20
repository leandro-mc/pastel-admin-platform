using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Auditing;
using Pastel.Platform.Modules;
using Pastel.Platform.Persistence;

namespace Pastel.Modules.Identity.Startup;

/// <summary>
/// Cuentas reproducibles para QA local. Solo se ejecuta si TestingSeed:Enabled=true
/// y el entorno es Development o Testing.
/// </summary>
internal sealed class TestingSeedUsersTask(
    IConfiguration configuration,
    IHostEnvironment environment,
    ILogger<TestingSeedUsersTask> logger) : IPastelStartupTask
{
    private static readonly SeedUser[] Fixtures =
    [
        new("test.owner@pastel.local", "QA — Owner/Superuser", "Local-Only-Test-Owner-2026!", AppRole.OwnerName),
        new("test.admin@pastel.local", "QA — Administrator", "Local-Only-Test-Admin-2026!", AppRole.AdministratorName),
        new("test.member@pastel.local", "QA — Member", "Local-Only-Test-Member-2026!", AppRole.MemberName),
    ];

    public int Order => 30;

    public async Task RunAsync(IServiceProvider services, CancellationToken cancellationToken)
    {
        if (!configuration.GetValue<bool>("TestingSeed:Enabled"))
        {
            return;
        }

        if (environment.IsProduction())
        {
            logger.LogCritical(
                IdentityEventIds.TestingSeed,
                "Se bloqueó el sembrador de cuentas de prueba: TestingSeed:Enabled no puede estar activo en Production");
            throw new InvalidOperationException(
                "El sembrador de cuentas de prueba no puede ejecutarse en Production. Desactive TestingSeed:Enabled.");
        }

        if (!environment.IsDevelopment() && !environment.IsEnvironment("Testing"))
        {
            logger.LogCritical(
                IdentityEventIds.TestingSeed,
                "Se bloqueó el sembrador de cuentas de prueba en el entorno {Environment}",
                environment.EnvironmentName);
            throw new InvalidOperationException(
                "El sembrador de cuentas de prueba solo puede ejecutarse en Development o Testing.");
        }

        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<AppUser>>();
        var audit = scope.ServiceProvider.GetRequiredService<IAuditTrail>();
        var changed = await TransactionRunner.RunSerializableAsync(
            db, token => SeedAsync(db, hasher, audit, token), cancellationToken);

        logger.LogInformation(
            IdentityEventIds.TestingSeed,
            "Sembrador local finalizado: {FixtureCount} cuentas de prueba verificadas y {ChangedCount} creadas o restauradas",
            Fixtures.Length, changed);
    }

    private static async Task<int> SeedAsync(
        IdentityDbContext db,
        IPasswordHasher<AppUser> hasher,
        IAuditTrail audit,
        CancellationToken cancellationToken)
    {
        var adminRole = await db.Roles.SingleOrDefaultAsync(
            role => role.NormalizedName == AppRole.AdministratorName.ToUpperInvariant(), cancellationToken)
            ?? throw new InvalidOperationException("CatalogSyncTask no creó el rol Administrator.");
        var ownerRole = await db.Roles.SingleOrDefaultAsync(
            role => role.NormalizedName == AppRole.OwnerName.ToUpperInvariant(), cancellationToken)
            ?? throw new InvalidOperationException("CatalogSyncTask no creó el rol Owner/Superuser.");
        var memberRole = await db.Roles.SingleOrDefaultAsync(
            role => role.NormalizedName == AppRole.MemberName.ToUpperInvariant(), cancellationToken);

        if (memberRole is null)
        {
            memberRole = new AppRole
            {
                Name = AppRole.MemberName,
                NormalizedName = AppRole.MemberName.ToUpperInvariant(),
                Description = "Rol base para cuentas locales de prueba.",
                IsSystemRole = false,
            };
            db.Roles.Add(memberRole);
            var dashboard = await db.Permissions.SingleOrDefaultAsync(
                permission => permission.Code == IdentityPermissions.DashboardView, cancellationToken);
            if (dashboard is not null)
            {
                db.RolePermissions.Add(new RolePermission { RoleId = memberRole.Id, PermissionId = dashboard.Id });
            }
        }

        var roles = new Dictionary<string, AppRole>(StringComparer.Ordinal)
        {
            [AppRole.OwnerName] = ownerRole,
            [AppRole.AdministratorName] = adminRole,
            [AppRole.MemberName] = memberRole,
        };

        var changedCount = 0;
        var now = DateTimeOffset.UtcNow;

        foreach (var fixture in Fixtures)
        {
            var normalizedEmail = fixture.Email.ToUpperInvariant();
            var user = await db.Users.SingleOrDefaultAsync(
                item => item.NormalizedEmail == normalizedEmail, cancellationToken);
            var created = user is null;
            if (user is null)
            {
                user = new AppUser
                {
                    Email = fixture.Email,
                    NormalizedEmail = normalizedEmail,
                    DisplayName = fixture.DisplayName,
                    IsActive = true,
                    MustChangePassword = false,
                    CreatedAt = now,
                    UpdatedAt = now,
                };
                user.PasswordHash = hasher.HashPassword(user, fixture.Password);
                db.Users.Add(user);
            }

            var verification = PasswordVerificationResult.Failed;
            if (!created && user.PasswordHash is { } existingHash)
            {
                verification = hasher.VerifyHashedPassword(user, existingHash, fixture.Password);
            }

            var needsPasswordUpdate = created || verification != PasswordVerificationResult.Success;
            List<UserRole> currentLinks = created
                ? []
                : await db.UserRoles.Where(link => link.UserId == user.Id).ToListAsync(cancellationToken);
            var role = roles[fixture.RoleName];
            var rolesMatch = !created && currentLinks.Count == 1 && currentLinks[0].RoleId == role.Id;
            var stateNeedsReset = !user.IsActive || user.MustChangePassword
                || user.AccessFailedCount != 0 || user.LockoutEnd is not null;
            var changed = created || needsPasswordUpdate || !rolesMatch || stateNeedsReset;
            if (!changed)
            {
                continue;
            }

            object? beforeState = null;
            if (!created)
            {
                beforeState = new
                {
                    roleIds = currentLinks.Select(link => link.RoleId).ToArray(),
                    isActive = user.IsActive,
                    mustChangePassword = user.MustChangePassword,
                    accessFailedCount = user.AccessFailedCount,
                    wasLocked = user.LockoutEnd is not null,
                };
            }

            if (!created && needsPasswordUpdate)
            {
                user.PasswordHash = hasher.HashPassword(user, fixture.Password);
            }

            user.IsActive = true;
            user.MustChangePassword = false;
            user.AccessFailedCount = 0;
            user.LockoutEnd = null;
            user.UpdatedAt = now;

            if (!created)
            {
                // Si cambia una fixture, invalida sus sesiones previas.
                user.TokenVersion++;
                var tokens = await db.RefreshTokens.Where(token => token.UserId == user.Id)
                    .ToListAsync(cancellationToken);
                foreach (var token in tokens)
                {
                    token.RevokedAt ??= now;
                    token.ReplacedByTokenHash = null;
                    token.ReplacedByEncryptedToken = null;
                    token.GraceUntil = null;
                }

                db.UserRoles.RemoveRange(currentLinks);
            }

            db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
            audit.Add(new AuditRecord(
                "identity.testing.fixture_seeded",
                "identity",
                TargetUserId: user.Id,
                Target: "cuenta fixture local",
                Before: beforeState,
                After: new { role = fixture.RoleName, isActive = true, mustChangePassword = false, environmentScoped = true }));
            changedCount++;
        }

        await db.SaveChangesAsync(cancellationToken);
        return changedCount;
    }

    private sealed record SeedUser(string Email, string DisplayName, string Password, string RoleName);
}