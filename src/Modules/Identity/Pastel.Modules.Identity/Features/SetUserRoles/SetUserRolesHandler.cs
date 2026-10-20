using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Auditing;
using Pastel.Platform.Persistence;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Features.SetUserRoles;

internal sealed class SetUserRolesHandler(IdentityDbContext db, SessionIssuer issuer, IAuditTrail audit, ICurrentUser currentUser, IClock clock, IPrivilegeGuard guard)
{
    // Transacción serializable: impide que los cambios concurrentes dejen a la plataforma
    // sin administradores activos.
    public Task<Result<string[]>> HandleAsync(
        Guid userId,
        SetUserRolesRequest request,
        CancellationToken cancellationToken) =>
        TransactionRunner.RunSerializableAsync(
            db,
            token => ApplyAsync(userId, request, token),
            cancellationToken);

    private async Task<Result<string[]>> ApplyAsync(Guid userId, SetUserRolesRequest request, CancellationToken cancellationToken)
    {
        var user = await db.FindWithRolesAsync(userId, cancellationToken);
        if (user is null)
        {
            return IdentityErrors.UserNotFound;
        }

        var roleIds = (request.RoleIds ?? []).Distinct().ToArray();
        var newRoles = await db.Roles.Where(x => roleIds.Contains(x.Id)).ToListAsync(cancellationToken);
        if (newRoles.Count != roleIds.Length)
        {
            return IdentityErrors.UnknownRoles;
        }

        // Comprueba primero la escalación para que un intento de asignarse Administrator a sí mismo tenga el código
        // estable identity.privilege.escalation (contrato F0-S101); después aplica la regla general de no editarse a sí mismo.
        if (await guard.AuthorizeRoleAssignmentAsync(user, newRoles, "set_roles", cancellationToken) is { } roleDenied)
        {
            return roleDenied;
        }

        if (await guard.AuthorizeActionOnUserAsync(user, "set_roles", cancellationToken) is { } denied)
        {
            return denied;
        }

        var wasAdministrator = user.IsAdministrator();
        var willBeAdministrator = newRoles.Any(x => x.NormalizedName == AdministratorRules.NormalizedName);
        if (wasAdministrator && !willBeAdministrator && user.IsActive
            && await db.CountActiveAdministratorsAsync(cancellationToken) <= 1)
        {
            return IdentityErrors.LastActiveAdministrator;
        }

        var before = user.UserRoles.Select(x => x.Role.Name).OrderBy(x => x, StringComparer.Ordinal).ToArray();
        var requested = newRoles.Select(x => x.Id).ToHashSet();
        var current = user.UserRoles.Select(x => x.RoleId).ToHashSet();
        db.UserRoles.RemoveRange(user.UserRoles.Where(x => !requested.Contains(x.RoleId)).ToArray());
        foreach (var role in newRoles.Where(x => !current.Contains(x.Id)))
        {
            db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
        }

        var clearedOverrides = 0;
        if (willBeAdministrator && !wasAdministrator)
        {
            // Las excepciones individuales no aplican a una cuenta de administración (S1): al promoverla se limpian.
            var overrides = await db.UserPermissionOverrides.Where(x => x.UserId == user.Id).ToListAsync(cancellationToken);
            clearedOverrides = overrides.Count;
            db.UserPermissionOverrides.RemoveRange(overrides);
        }

        user.TokenVersion++;
        user.UpdatedAt = clock.UtcNow;
        await issuer.RevokeAllAsync(user.Id, cancellationToken);
        var after = newRoles.Select(x => x.Name).OrderBy(x => x, StringComparer.Ordinal).ToArray();
        object afterDetails = clearedOverrides > 0
            ? new { roles = after, overridesCleared = clearedOverrides }
            : new { roles = after };
        audit.Add(new AuditRecord(
            "admin.user.roles-updated", "identity", currentUser.UserId, user.Id, user.Email,
            Before: new { roles = before }, After: afterDetails));
        await db.SaveChangesAsync(cancellationToken);
        return after;
    }
}
