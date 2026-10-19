using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Features.ListRoles;
using Pastel.Modules.Identity.Persistence;
using Pastel.Modules.Identity.Security;
using Pastel.Platform.Auditing;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Features.CreateRole;

internal sealed partial class CreateRoleHandler(IdentityDbContext db, IAuditTrail audit, ICurrentUser currentUser, IPrivilegeGuard guard)
{
    public async Task<Result<RoleSummary>> HandleAsync(CreateRoleRequest request, CancellationToken cancellationToken)
    {
        var name = (request.Name ?? string.Empty).Trim();
        var description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        var errors = new FieldErrors();
        if (!RoleNamePattern().IsMatch(name))
        {
            errors.Add("name", "Use entre 2 y 64 caracteres: letras, números, espacios, punto, guion y guion bajo; debe empezar con una letra.");
        }

        if (description is { Length: > 500 })
        {
            errors.Add("description", "La descripción admite hasta 500 caracteres.");
        }

        if (errors.Any)
        {
            return errors.ToError("identity.role.invalid");
        }

        var normalized = name.ToUpperInvariant();
        if (await db.Roles.AnyAsync(x => x.NormalizedName == normalized, cancellationToken))
        {
            return IdentityErrors.RoleNameTaken;
        }

        var permissionIds = (request.PermissionIds ?? []).Distinct().ToArray();
        var permissions = await db.Permissions.Where(x => permissionIds.Contains(x.Id)).ToListAsync(cancellationToken);
        if (permissions.Count != permissionIds.Length)
        {
            return IdentityErrors.UnknownPermissions;
        }

        if (await guard.AuthorizeGrantAsync(permissions.Select(x => x.Code).ToArray(), "create_role", null, cancellationToken) is { } denied)
        {
            return denied;
        }

        var role = new AppRole { Name = name, NormalizedName = normalized, Description = description };
        db.Roles.Add(role);
        foreach (var permission in permissions)
        {
            db.RolePermissions.Add(new RolePermission { Role = role, Permission = permission });
        }

        audit.Add(new AuditRecord(
            "admin.role.created", "identity", currentUser.UserId, null, name,
            After: new { name, description, permissions = permissions.Select(x => x.Code).OrderBy(x => x, StringComparer.Ordinal).ToArray() }));
        await db.SaveChangesAsync(cancellationToken);
        return (await ListRolesEndpoint.QueryAsync(db, cancellationToken, role.Id)).Single();
    }

    [GeneratedRegex("^[A-Za-z][A-Za-z0-9 _.-]{1,63}$", RegexOptions.CultureInvariant)]
    private static partial Regex RoleNamePattern();
}
