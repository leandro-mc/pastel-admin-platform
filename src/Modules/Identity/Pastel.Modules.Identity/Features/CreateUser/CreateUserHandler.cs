using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Auditing;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Features.CreateUser;

internal sealed class CreateUserHandler(IdentityDbContext db, IPasswordHasher<AppUser> hasher, IAuditTrail audit, ICurrentUser currentUser, IPrivilegeGuard guard)
{
    public async Task<Result<UserSummary>> HandleAsync(CreateUserRequest request, CancellationToken cancellationToken)
    {
        var email = UserMapping.NormalizeEmail(request.Email);
        var displayName = (request.DisplayName ?? string.Empty).Trim();
        var errors = new FieldErrors();
        if (!UserMapping.IsValidEmail(email))
        {
            errors.Add("email", "Escriba un correo electrónico válido.");
        }

        if (displayName.Length is < 2 or > 100)
        {
            errors.Add("displayName", "El nombre debe tener entre 2 y 100 caracteres.");
        }

        if (!PasswordPolicy.IsStrong(request.TemporaryPassword))
        {
            errors.Add("temporaryPassword", PasswordPolicy.Description);
        }

        if (errors.Any)
        {
            return errors.ToError("identity.user.invalid");
        }

        if (await db.Users.AnyAsync(x => x.NormalizedEmail == email, cancellationToken))
        {
            return IdentityErrors.EmailTaken;
        }

        var roleIds = (request.RoleIds ?? []).Distinct().ToArray();
        var roles = await db.Roles.Include(x => x.RolePermissions).ThenInclude(x => x.Permission)
            .Where(x => roleIds.Contains(x.Id)).ToListAsync(cancellationToken);
        if (roles.Count != roleIds.Length)
        {
            return IdentityErrors.UnknownRoles;
        }
        if (roles.Any(role => !PlatformRoleScope.IsPlatformRole(role)))
        {
            return IdentityErrors.PrivilegeAppScopeRequired;
        }

        var user = new AppUser { Email = request.Email!.Trim(), NormalizedEmail = email, DisplayName = displayName, MustChangePassword = true };
        if (await guard.AuthorizeRoleAssignmentAsync(user, roles, "create_user", cancellationToken) is { } denied)
        {
            return denied;
        }

        user.PasswordHash = hasher.HashPassword(user, request.TemporaryPassword!);
        foreach (var role in roles)
        {
            user.UserRoles.Add(new UserRole { Role = role });
        }

        db.Users.Add(user);
        audit.Add(new AuditRecord(
            "admin.user.created", "identity", currentUser.UserId, user.Id, user.Email,
            After: new { email = user.Email, displayName, roles = roles.Select(x => x.Name).OrderBy(x => x, StringComparer.Ordinal).ToArray() }));
        await db.SaveChangesAsync(cancellationToken);
        return UserMapping.ToSummary(user);
    }
}
