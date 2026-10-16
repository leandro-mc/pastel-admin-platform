using System.Security.Cryptography;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Pastel.Application.Abstractions;
using Pastel.Application.Contracts;
using Pastel.Domain.Entities;
using Pastel.Infrastructure.Persistence;
using Pastel.Infrastructure.Security;

namespace Pastel.Infrastructure.Services;

public sealed class AuthService(
    AppDbContext db,
    IPasswordHasher<AppUser> passwordHasher,
    ITokenService tokenService,
    IOptions<JwtOptions> jwtOptions) : IAuthService
{
    private readonly JwtOptions _jwt = jwtOptions.Value;

    public async Task<AuthenticationResult> RegisterAsync(RegisterCommand command, string? ipAddress, CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(command.Email);
        var displayName = command.DisplayName.Trim();
        if (!IsValidEmail(email) || displayName.Length is < 2 or > 100 || !PasswordPolicy.IsStrong(command.Password))
            return AuthenticationResult.Failed("Revisá el correo, el nombre y los requisitos de la contraseña.");
        if (await db.Users.AnyAsync(x => x.NormalizedEmail == email, cancellationToken))
            return AuthenticationResult.Failed("No se pudo crear la cuenta con esos datos.");

        var memberRole = await db.Roles.SingleAsync(x => x.NormalizedName == "MEMBER", cancellationToken);
        var user = new AppUser { Email = command.Email.Trim(), NormalizedEmail = email, DisplayName = displayName, PasswordHash = "pending" };
        user.PasswordHash = passwordHasher.HashPassword(user, command.Password);
        db.Users.Add(user);
        db.UserRoles.Add(new UserRole { User = user, Role = memberRole });
        AddAudit(null, user.Id, "auth.register", user.Email, ipAddress);
        await db.SaveChangesAsync(cancellationToken);
        return await CreateSessionAsync(user, ipAddress, cancellationToken);
    }

    public async Task<AuthenticationResult> LoginAsync(LoginCommand command, string? ipAddress, CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(command.Email);
        var user = await db.Users.Include(x => x.UserRoles).ThenInclude(x => x.Role)
            .SingleOrDefaultAsync(x => x.NormalizedEmail == email, cancellationToken);
        var genericError = "Correo o contraseña incorrectos, o cuenta no disponible.";
        if (user is null)
        {
            AddAudit(null, null, "auth.login.failed", "unknown-account", ipAddress);
            await db.SaveChangesAsync(cancellationToken);
            return AuthenticationResult.Failed(genericError);
        }
        if (!user.IsActive || user.LockoutEnd > DateTimeOffset.UtcNow)
        {
            AddAudit(user.Id, user.Id, "auth.login.denied", "inactive-or-locked", ipAddress);
            await db.SaveChangesAsync(cancellationToken);
            return AuthenticationResult.Failed(genericError);
        }

        var verification = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, command.Password);
        if (verification == PasswordVerificationResult.Failed)
        {
            user.AccessFailedCount++;
            if (user.AccessFailedCount >= 5)
            {
                user.LockoutEnd = DateTimeOffset.UtcNow.AddMinutes(15);
                user.AccessFailedCount = 0;
            }
            user.UpdatedAt = DateTimeOffset.UtcNow;
            AddAudit(user.Id, user.Id, "auth.login.failed", "invalid-credentials", ipAddress);
            await db.SaveChangesAsync(cancellationToken);
            return AuthenticationResult.Failed(genericError);
        }

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
            user.PasswordHash = passwordHasher.HashPassword(user, command.Password);
        user.AccessFailedCount = 0;
        user.LockoutEnd = null;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        AddAudit(user.Id, user.Id, "auth.login.succeeded", null, ipAddress);
        await db.SaveChangesAsync(cancellationToken);
        return await CreateSessionAsync(user, ipAddress, cancellationToken);
    }

    public async Task<AuthenticationResult> RefreshAsync(string refreshToken, string? ipAddress, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken) || refreshToken.Length > 256)
            return AuthenticationResult.Failed("La sesión no es válida. Iniciá sesión de nuevo.");

        var hash = HashToken(refreshToken);
        await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, cancellationToken);
        var stored = await db.RefreshTokens.Include(x => x.User).ThenInclude(x => x.UserRoles).ThenInclude(x => x.Role)
            .SingleOrDefaultAsync(x => x.TokenHash == hash, cancellationToken);
        if (stored is null)
            return AuthenticationResult.Failed("La sesión no es válida. Iniciá sesión de nuevo.");

        var now = DateTimeOffset.UtcNow;
        if (stored.RevokedAt is not null)
        {
            // Reuse of a rotated refresh token can indicate theft: revoke the user's outstanding sessions.
            var outstanding = await db.RefreshTokens.Where(x => x.UserId == stored.UserId && x.RevokedAt == null).ToListAsync(cancellationToken);
            foreach (var token in outstanding) token.RevokedAt = now;
            stored.User.TokenVersion++;
            AddAudit(stored.UserId, stored.UserId, "auth.refresh.reuse-detected", null, ipAddress);
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return AuthenticationResult.Failed("La sesión expiró o dejó de ser válida. Iniciá sesión de nuevo.");
        }
        if (stored.ExpiresAt <= now || !stored.User.IsActive || stored.User.LockoutEnd > now)
        {
            stored.RevokedAt = now;
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return AuthenticationResult.Failed("La sesión expiró o dejó de ser válida. Iniciá sesión de nuevo.");
        }

        var nextRawToken = GenerateOpaqueToken();
        var nextHash = HashToken(nextRawToken);
        stored.RevokedAt = now;
        stored.ReplacedByTokenHash = nextHash;
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = stored.UserId,
            TokenHash = nextHash,
            ExpiresAt = now.AddDays(_jwt.RefreshTokenDays),
            CreatedByIp = ipAddress
        });
        var (access, expiresAt) = tokenService.CreateAccessToken(stored.User);
        AddAudit(stored.UserId, stored.UserId, "auth.refresh.succeeded", null, ipAddress);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new AuthenticationResult(true, null, access, nextRawToken, new SessionSummary(ToSummary(stored.User), expiresAt));
    }

    public async Task LogoutAsync(string? refreshToken, Guid? actorUserId, string? ipAddress, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(refreshToken))
        {
            var hash = HashToken(refreshToken);
            var stored = await db.RefreshTokens.SingleOrDefaultAsync(x => x.TokenHash == hash, cancellationToken);
            if (stored is not null && stored.RevokedAt is null) stored.RevokedAt = DateTimeOffset.UtcNow;
        }
        if (actorUserId.HasValue) AddAudit(actorUserId, actorUserId, "auth.logout", null, ipAddress);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<UserSummary?> GetUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await db.Users.Include(x => x.UserRoles).ThenInclude(x => x.Role)
            .SingleOrDefaultAsync(x => x.Id == userId, cancellationToken);
        return user is null ? null : ToSummary(user);
    }

    public async Task ChangePasswordAsync(Guid userId, string currentPassword, string newPassword, string? ipAddress, CancellationToken cancellationToken)
    {
        if (!PasswordPolicy.IsStrong(newPassword)) throw new InvalidOperationException("La contraseña nueva no cumple los requisitos de seguridad.");
        var user = await db.Users.SingleOrDefaultAsync(x => x.Id == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Usuario no encontrado.");
        if (passwordHasher.VerifyHashedPassword(user, user.PasswordHash, currentPassword) == PasswordVerificationResult.Failed)
            throw new UnauthorizedAccessException("La contraseña actual no es correcta.");
        user.PasswordHash = passwordHasher.HashPassword(user, newPassword);
        user.MustChangePassword = false;
        user.TokenVersion++;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        var now = DateTimeOffset.UtcNow;
        var activeTokens = await db.RefreshTokens.Where(x => x.UserId == userId && x.RevokedAt == null).ToListAsync(cancellationToken);
        foreach (var token in activeTokens) token.RevokedAt = now;
        AddAudit(userId, userId, "user.password.changed", null, ipAddress);
        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task<AuthenticationResult> CreateSessionAsync(AppUser user, string? ipAddress, CancellationToken cancellationToken)
    {
        var (accessToken, accessExpiresAt) = tokenService.CreateAccessToken(user);
        var refreshToken = GenerateOpaqueToken();
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = HashToken(refreshToken),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(_jwt.RefreshTokenDays),
            CreatedByIp = ipAddress
        });
        await db.SaveChangesAsync(cancellationToken);
        var reloaded = await db.Users.Include(x => x.UserRoles).ThenInclude(x => x.Role)
            .SingleAsync(x => x.Id == user.Id, cancellationToken);
        return new AuthenticationResult(true, null, accessToken, refreshToken, new SessionSummary(ToSummary(reloaded), accessExpiresAt));
    }

    internal static UserSummary ToSummary(AppUser user) => new(
        user.Id, user.Email, user.DisplayName, user.IsActive, user.MustChangePassword, user.AccessFailedCount,
        user.LockoutEnd, user.CreatedAt, user.UserRoles.Select(x => x.Role.Name).OrderBy(x => x).ToArray());

    internal static string NormalizeEmail(string? email) => (email ?? string.Empty).Trim().ToUpperInvariant();
    internal static string HashToken(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    internal static string GenerateOpaqueToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(48)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    internal static bool IsValidEmail(string email) => email.Length is > 3 and <= 320 && System.Net.Mail.MailAddress.TryCreate(email, out var parsed) && parsed.Address.Equals(email, StringComparison.OrdinalIgnoreCase);
    private void AddAudit(Guid? actor, Guid? targetUserId, string action, string? target, string? ipAddress) => db.AuditLogs.Add(new AuditLog
    {
        ActorUserId = actor, TargetUserId = targetUserId, Action = action, Target = target, IpAddress = ipAddress
    });
}
