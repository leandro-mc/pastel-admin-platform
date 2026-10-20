using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Auditing;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Features.SetUserPermissions;

internal sealed class SetUserPermissionsHandler(IdentityDbContext db, IAuditTrail audit, ICurrentUser currentUser, IClock clock, IPrivilegeGuard guard)
{
    public async Task<Result> HandleAsync(Guid userId, SetUserPermissionsRequest request, CancellationToken cancellationToken)
    {
        var user = await db.FindWithRolesAsync(userId, cancellationToken);
        if (user is null)
        {
            return IdentityErrors.UserNotFound;
        }

        if (await guard.AuthorizeActionOnUserAsync(user, "set_permissions", cancellationToken) is { } denied)
        {
            return denied;
        }

        if (user.IsAdministrator())
        {
            return IdentityErrors.OverridesNotForAdministrator;
        }

        var changes = request.Changes ?? [];
        var errors = new FieldErrors();
        if (changes.Select(x => x.PermissionId).Distinct().Count() != changes.Length)
        {
            errors.Add("changes", "No repita permisos en la solicitud.");
        }

        if (changes.Any(x => !Enum.IsDefined(x.Effect)))
        {
            errors.Add("changes", "Uno o más efectos de permiso no son válidos.");
        }

        if (errors.Any)
        {
            return errors.ToError("identity.permission.invalid_changes");
        }

        var ids = changes.Select(x => x.PermissionId).ToArray();
        var permissions = await db.Permissions.Where(x => ids.Contains(x.Id)).ToDictionaryAsync(x => x.Id, cancellationToken);
        if (permissions.Count != ids.Length)
        {
            return IdentityErrors.UnknownPermissions;
        }

        // Este endpoint pertenece a Workspace. Los permisos de negocio de una subapp se gestionan
        // desde su propio ámbito, incluso cuando el actor sea Owner/Superuser.
        var crossAppChanges = changes
            .Where(change =>
            {
                var code = permissions[change.PermissionId].Code;
                return code != IdentityPermissions.DashboardView
                    && !code.StartsWith("settings.", StringComparison.Ordinal);
            })
            .Select(change => permissions[change.PermissionId].Code)
            .Distinct(StringComparer.Ordinal)
            .ToArray();
        if (crossAppChanges.Length > 0)
        {
            var scopedDenied = await guard.AuthorizeGrantAsync(
                crossAppChanges, "set_permissions", userId, cancellationToken);
            return scopedDenied ?? IdentityErrors.PrivilegeAppScopeRequired;
        }

        var granted = changes.Where(x => x.Effect == PermissionEffect.Grant).Select(x => permissions[x.PermissionId].Code).ToArray();
        if (await guard.AuthorizeGrantAsync(granted, "set_permissions", userId, cancellationToken) is { } grantDenied)
        {
            return grantDenied;
        }

        var existing = await db.UserPermissionOverrides.Include(x => x.Permission).Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        var before = existing.OrderBy(x => x.Permission.Code, StringComparer.Ordinal)
            .Select(x => new { permission = x.Permission.Code, effect = x.Effect.ToString() }).ToArray();

        var requested = changes.ToDictionary(x => x.PermissionId, x => x.Effect);
        db.UserPermissionOverrides.RemoveRange(existing.Where(x => !requested.ContainsKey(x.PermissionId)));
        var now = clock.UtcNow;
        foreach (var change in changes)
        {
            var current = existing.FirstOrDefault(x => x.PermissionId == change.PermissionId);
            if (current is null)
            {
                db.UserPermissionOverrides.Add(new UserPermissionOverride
                {
                    UserId = userId,
                    PermissionId = change.PermissionId,
                    Effect = change.Effect,
                    AssignedByUserId = currentUser.UserId,
                    UpdatedAt = now,
                });
            }
            else if (current.Effect != change.Effect)
            {
                current.Effect = change.Effect;
                current.AssignedByUserId = currentUser.UserId;
                current.UpdatedAt = now;
            }
        }

        user.TokenVersion++;
        user.UpdatedAt = now;
        var after = changes.OrderBy(x => permissions[x.PermissionId].Code, StringComparer.Ordinal)
            .Select(x => new { permission = permissions[x.PermissionId].Code, effect = x.Effect.ToString() }).ToArray();
        audit.Add(new AuditRecord(
            "admin.user.permissions-updated", "identity", currentUser.UserId, userId, user.Email,
            Before: new { overrides = before }, After: new { overrides = after }));
        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
