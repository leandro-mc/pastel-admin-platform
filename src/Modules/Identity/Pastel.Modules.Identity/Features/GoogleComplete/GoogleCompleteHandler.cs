using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Auditing;
using Pastel.Platform.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Features.GoogleComplete;

/// <summary>Resultado del ingreso con Google: una sesión nueva o el código de error para <c>/ingresar?error=…</c>.</summary>
internal sealed record GoogleSignInOutcome(IssuedSession? Session, string? ErrorCode)
{
    public static GoogleSignInOutcome Success(IssuedSession session) => new(session, null);

    public static GoogleSignInOutcome Failure(string errorCode) => new(null, errorCode);
}

/// <summary>
/// Reglas de cuenta de Google (Fase 0 §8.2). El ingreso con Google no depende del bloqueo por contraseña; solo de que la cuenta esté activa.
/// Corre en transacción serializable con reintento: dos retornos simultáneos de la misma persona no crean cuentas ni vínculos duplicados.
/// </summary>
internal sealed class GoogleCompleteHandler(
    IdentityDbContext db,
    SessionIssuer issuer,
    IAuditTrail audit,
    IClock clock,
    IOptions<AuthOptions> auth,
    ILogger<GoogleCompleteHandler> logger)
{
    public Task<GoogleSignInOutcome> HandleAsync(GoogleIdentity identity, CancellationToken cancellationToken) =>
        TransactionRunner.RunSerializableAsync(db, token => SignInAsync(identity, token), cancellationToken);

    private async Task<GoogleSignInOutcome> SignInAsync(GoogleIdentity identity, CancellationToken cancellationToken)
    {
        var now = clock.UtcNow;
        var link = await db.ExternalLogins
            .Include(x => x.User)
            .SingleOrDefaultAsync(x => x.Provider == ExternalLogin.GoogleProvider && x.ProviderSubject == identity.Subject, cancellationToken);

        if (link is not null)
        {
            if (!link.User.IsActive)
            {
                return await DenyAsync(link.User.Id, GoogleErrorCodes.AccountDisabled, "inactive-account", cancellationToken);
            }

            link.LastLoginAt = now;
            link.User.UpdatedAt = now;
            audit.Add(new AuditRecord("auth.google.login", "identity", link.User.Id, link.User.Id));
            return await CompleteAsync(link.User, cancellationToken);
        }

        if (!identity.EmailVerified)
        {
            return await DenyAsync(null, GoogleErrorCodes.EmailUnverified, "email-unverified", cancellationToken);
        }

        var normalized = UserMapping.NormalizeEmail(identity.Email);
        if (!UserMapping.IsValidEmail(normalized))
        {
            return await DenyAsync(null, GoogleErrorCodes.Failed, "invalid-email", cancellationToken);
        }

        var existing = await db.Users.SingleOrDefaultAsync(x => x.NormalizedEmail == normalized, cancellationToken);
        if (existing is not null)
        {
            return existing.IsActive
                ? await LinkAsync(existing, identity, now, cancellationToken)
                : await DenyAsync(existing.Id, GoogleErrorCodes.AccountDisabled, "inactive-account", cancellationToken);
        }

        return auth.Value.Google.AllowSignUp
            ? await RegisterAsync(identity, normalized, now, cancellationToken)
            : await DenyAsync(null, GoogleErrorCodes.SignupClosed, "signup-closed", cancellationToken);
    }

    /// <summary>
    /// Vincula Google a una cuenta existente por correo verificado. Invalida la contraseña (incluida una temporal) y las sesiones anteriores:
    /// quien tenga esa contraseña o sesión pierde el acceso, de modo que una cuenta creada antes con el correo de otra persona no sirve de puerta.
    /// </summary>
    private async Task<GoogleSignInOutcome> LinkAsync(AppUser user, GoogleIdentity identity, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var before = new { hadPassword = user.PasswordHash is not null, mustChangePassword = user.MustChangePassword };
        db.ExternalLogins.Add(NewLink(user.Id, identity, now));
        user.PasswordHash = null;
        user.MustChangePassword = false;
        user.AccessFailedCount = 0;
        user.LockoutEnd = null;
        user.TokenVersion++;
        user.UpdatedAt = now;
        await issuer.RevokeAllAsync(user.Id, cancellationToken);
        audit.Add(new AuditRecord(
            "auth.google.linked", "identity", user.Id, user.Id, user.Email,
            Before: before, After: new { linked = true, passwordInvalidated = true }));
        logger.LogInformation(IdentityEventIds.GoogleLinked, "Google quedó vinculado a la cuenta {UserId}; se invalidaron su contraseña y sus sesiones", user.Id);
        return await CompleteAsync(user, cancellationToken);
    }

    private async Task<GoogleSignInOutcome> RegisterAsync(GoogleIdentity identity, string normalizedEmail, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var user = new AppUser
        {
            Email = identity.Email,
            NormalizedEmail = normalizedEmail,
            DisplayName = DisplayNameFor(identity),
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Users.Add(user);
        db.ExternalLogins.Add(NewLink(user.Id, identity, now));

        var member = await db.Roles.SingleOrDefaultAsync(x => x.NormalizedName == "MEMBER", cancellationToken);
        if (member is not null)
        {
            db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = member.Id });
        }

        audit.Add(new AuditRecord(
            "auth.google.registered", "identity", null, user.Id, user.Email,
            After: new { roles = member is null ? Array.Empty<string>() : [member.Name] }));
        return await CompleteAsync(user, cancellationToken);
    }

    private async Task<GoogleSignInOutcome> CompleteAsync(AppUser user, CancellationToken cancellationToken)
    {
        var session = issuer.Issue(user);
        await db.SaveChangesAsync(cancellationToken);
        var reloaded = await db.FindWithRolesAsync(user.Id, cancellationToken) ?? user;
        logger.LogInformation(IdentityEventIds.GoogleLogin, "Ingreso con Google de {UserId}", user.Id);
        return GoogleSignInOutcome.Success(session with { Summary = new SessionSummary(UserMapping.ToSummary(reloaded), session.AccessExpiresAt) });
    }

    private async Task<GoogleSignInOutcome> DenyAsync(Guid? userId, string errorCode, string reason, CancellationToken cancellationToken)
    {
        audit.Add(new AuditRecord("auth.google.denied", "identity", userId, userId, reason));
        await db.SaveChangesAsync(cancellationToken);
        logger.LogWarning(IdentityEventIds.GoogleRejected, "Ingreso con Google rechazado ({Reason}) para la cuenta {UserId}", reason, userId);
        return GoogleSignInOutcome.Failure(errorCode);
    }

    private static ExternalLogin NewLink(Guid userId, GoogleIdentity identity, DateTimeOffset now) => new()
    {
        UserId = userId,
        Provider = ExternalLogin.GoogleProvider,
        ProviderSubject = identity.Subject,
        EmailAtLink = identity.Email,
        EmailVerified = identity.EmailVerified,
        CreatedAt = now,
        LastLoginAt = now,
    };

    /// <summary>Nombre del perfil de Google; si falta o no cabe, la parte local del correo.</summary>
    private static string DisplayNameFor(GoogleIdentity identity)
    {
        var name = identity.Name?.Trim();
        if (string.IsNullOrEmpty(name))
        {
            name = identity.Email.Split('@')[0];
        }

        name = name.Length > 100 ? name[..100] : name;
        return name.Length < 2 ? "Persona usuaria" : name;
    }
}
