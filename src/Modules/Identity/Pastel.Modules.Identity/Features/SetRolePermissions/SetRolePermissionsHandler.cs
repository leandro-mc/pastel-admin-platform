using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Persistence;
using Pastel.Platform.Auditing;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Features.SetRolePermissions;

internal sealed class SetRolePermissionsHandler(IdentityDbContext db, IAuditTrail audit, ICurrentUser currentUser, IPrivilegeGuard guard)
{
    public async Task<Result> HandleAsync(Guid roleId, SetRolePermissionsRequest request, CancellationToken cancellationToken)
    {
        var role = await db.Roles.Include(x => x.RolePermissions).ThenInclude(x => x.Permission)
            .SingleOrDefaultAsync(x => x.Id == roleId, cancellationToken);
        if (role is null)
        {
            return IdentityErrors.RoleNotFound;
        }

        if (await guard.AuthorizeRoleEditAsync(role, "set_role_permissions", cancellationToken) is { } denied)
        {
            return denied;
        }

        var ids = (request.PermissionIds ?? []).Distinct().ToArray();
        var requested = await db.Permissions.Where(x => ids.Contains(x.Id)).ToListAsync(cancellationToken);
        if (requested.Count != ids.Length)
        {
            return IdentityErrors.UnknownPermissions;
        }

        // Solo se pueden agregar permisos que quien actúa ya posee; quitar permisos siempre se permite.
        var heldPermissionIds = role.RolePermissions.Select(x => x.PermissionId).ToHashSet();
        var addedCodes = requested.Where(x => !heldPermissionIds.Contains(x.Id)).Select(x => x.Code).ToArray();
        if (await guard.AuthorizeGrantAsync(addedCodes, "set_role_permissions", null, cancellationToken) is { } grantDenied)
        {
            return grantDenied;
        }

        var before = role.RolePermissions.Select(x => x.Permission.Code).OrderBy(x => x, StringComparer.Ordinal).ToArray();
        var requestedIds = requested.Select(x => x.Id).ToHashSet();
        var currentIds = role.RolePermissions.Select(x => x.PermissionId).ToHashSet();
        db.RolePermissions.RemoveRange(role.RolePermissions.Where(x => !requestedIds.Contains(x.PermissionId)).ToArray());
        foreach (var permission in requested.Where(x => !currentIds.Contains(x.Id)))
        {
            db.RolePermissions.Add(new RolePermission { RoleId = roleId, PermissionId = permission.Id });
        }

        var after = requested.Select(x => x.Code).OrderBy(x => x, StringComparer.Ordinal).ToArray();
        audit.Add(new AuditRecord(
            "admin.role.permissions-updated", "identity", currentUser.UserId, null, role.Name,
            Before: new { permissions = before }, After: new { permissions = after }));
        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
