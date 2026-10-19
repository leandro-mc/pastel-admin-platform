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

internal sealed class SetUserRolesHandler(IdentityDbContext db, SessionIssuer issuer, IAuditTrail audit, ICurrentUser currentUser, IClock clock)
{
    public Task<Result<string[]>> HandleAsync(Guid userId, SetUserRolesRequest request, CancellationToken cancellationToken) =>
        // Transacción serializable: dos cambios concurrentes no pueden dejar la plataforma sin administradores activos.
        TransactionRunner.RunSerializableAsync(db, token => ApplyAsync(userId, request, token), cancellationToken);

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

        var willBeAdministrator = newRoles.Any(x => x.NormalizedName == AdministratorRules.NormalizedName);
        if (user.IsAdministrator() && !willBeAdministrator && user.IsActive
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

        user.TokenVersion++;
        user.UpdatedAt = clock.UtcNow;
        await issuer.RevokeAllAsync(user.Id, cancellationToken);
        var after = newRoles.Select(x => x.Name).OrderBy(x => x, StringComparer.Ordinal).ToArray();
        audit.Add(new AuditRecord(
            "admin.user.roles-updated", "identity", currentUser.UserId, user.Id, user.Email,
            Before: new { roles = before }, After: new { roles = after }));
        await db.SaveChangesAsync(cancellationToken);
        return after;
    }
}
