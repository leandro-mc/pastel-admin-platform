using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Auditing;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Features.Register;

internal sealed class RegisterHandler(
    IdentityDbContext db, IPasswordHasher<AppUser> hasher, SessionIssuer issuer, IAuditTrail audit, IOptions<AuthOptions> auth)
{
    public async Task<Result<IssuedSession>> HandleAsync(RegisterRequest request, CancellationToken cancellationToken)
    {
        var local = auth.Value.Local;
        if (!local.Enabled || !local.SelfRegistrationEnabled)
        {
            return IdentityErrors.RegistrationDisabled;
        }

        var email = UserMapping.NormalizeEmail(request.Email);
        var displayName = (request.DisplayName ?? string.Empty).Trim();
        var invalid = Validate(email, displayName, request.Password);
        if (invalid is not null)
        {
            return invalid;
        }

        if (await db.Users.AnyAsync(x => x.NormalizedEmail == email, cancellationToken))
        {
            return IdentityErrors.RegistrationRejected;
        }

        var user = new AppUser { Email = request.Email!.Trim(), NormalizedEmail = email, DisplayName = displayName };
        user.PasswordHash = hasher.HashPassword(user, request.Password!);
        db.Users.Add(user);

        var member = await db.Roles.SingleOrDefaultAsync(x => x.NormalizedName == "MEMBER", cancellationToken);
        if (member is not null)
        {
            db.UserRoles.Add(new UserRole { User = user, Role = member });
        }

        audit.Add(new AuditRecord(
            "auth.register", "identity", null, user.Id, user.Email,
            After: new { email = user.Email, roles = member is null ? Array.Empty<string>() : [member.Name] }));
        var session = issuer.Issue(user);
        await db.SaveChangesAsync(cancellationToken);

        // Las asignaciones de rol quedaron guardadas; se recarga el resumen con los nombres de rol.
        var reloaded = await db.FindWithRolesAsync(user.Id, cancellationToken) ?? user;
        return session with { Summary = new SessionSummary(UserMapping.ToSummary(reloaded), session.AccessExpiresAt) };
    }

    private static Error? Validate(string normalizedEmail, string displayName, string? password)
    {
        var errors = new FieldErrors();
        if (!UserMapping.IsValidEmail(normalizedEmail))
        {
            errors.Add("email", "Escriba un correo electrónico válido.");
        }

        if (displayName.Length is < 2 or > 100)
        {
            errors.Add("displayName", "El nombre debe tener entre 2 y 100 caracteres.");
        }

        if (!PasswordPolicy.IsStrong(password))
        {
            errors.Add("password", PasswordPolicy.Description);
        }

        return errors.Any ? errors.ToError("identity.register.invalid") : null;
    }
}
