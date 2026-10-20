using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Pastel.Modules.Identity.Common;
using Pastel.Modules.Identity.Domain;
using Pastel.Modules.Identity.Persistence;
using Pastel.Platform.Auditing;
using Pastel.Platform.Observability;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Security;

/// <summary>
/// Jerarquía de privilegios de administración. Owner/Superuser y Administrator general comparten
/// la gestión ordinaria, pero solo Owner/Superuser puede conceder capacidades reservadas de plataforma.
/// La membresía de Owner se crea/restaura únicamente por el bootstrap configurado.
/// </summary>
internal interface IPrivilegeGuard
{
    /// <summary>Restablecer contraseña, bloquear, desbloquear, cambiar roles o excepciones de otra cuenta.</summary>
    Task<Error?> AuthorizeActionOnUserAsync(AppUser target, string action, CancellationToken cancellationToken);

    /// <summary>Validar la asignación de roles y mantener protegida la membresía Owner/Superuser.</summary>
    Task<Error?> AuthorizeRoleAssignmentAsync(AppUser target, IReadOnlyCollection<AppRole> newRoles, string action, CancellationToken cancellationToken);

    /// <summary>Conceder permisos de rol o excepciones respetando los límites exclusivos de plataforma.</summary>
    Task<Error?> AuthorizeGrantAsync(IReadOnlyCollection<string> permissionCodes, string action, Guid? targetUserId, CancellationToken cancellationToken);

    /// <summary>Evitar editar roles de sistema y roles propios.</summary>
    Task<Error?> AuthorizeRoleEditAsync(AppRole role, string action, CancellationToken cancellationToken);
}

internal sealed class PrivilegeGuard(
    IdentityDbContext db,
    ICurrentUser currentUser,
    IPermissionEvaluator evaluator,
    IHttpContextAccessor accessor,
    IAuditTrail audit,
    ILogger<PrivilegeGuard> logger) : IPrivilegeGuard
{
    private IReadOnlyList<string> ActorRoles => accessor.HttpContext?.GetSessionUser()?.Roles ?? [];

    private bool ActorIsAdministrator =>
        ActorRoles.Any(r => string.Equals(r, AppRole.AdministratorName, StringComparison.OrdinalIgnoreCase));

    private bool ActorIsOwner =>
        ActorRoles.Any(r => string.Equals(r, AppRole.OwnerName, StringComparison.OrdinalIgnoreCase));

    private bool ActorIsPrivileged => ActorIsAdministrator || ActorIsOwner;

    public async Task<Error?> AuthorizeActionOnUserAsync(AppUser target, string action, CancellationToken cancellationToken)
    {
        var targetIsOwner = target.UserRoles.Any(x =>
            string.Equals(x.Role.NormalizedName, AppRole.OwnerName.ToUpperInvariant(), StringComparison.Ordinal));
        if (targetIsOwner && !ActorIsOwner)
        {
            return await DenyAsync(
                IdentityErrors.PrivilegeOwnerAccountProtected, action, target.Id, target.Email,
                new { reason = "owner_account_requires_owner_actor" }, cancellationToken);
        }

        // Bloquearse a sí mismo se prohíbe a cualquier actor, incluso a quien tenga rol de sistema.
        if (currentUser.UserId == target.Id && string.Equals(action, "block_user", StringComparison.Ordinal))
        {
            return await DenyAsync(IdentityErrors.PrivilegeSelfAction, action, target.Id, target.Email, null, cancellationToken);
        }

        if (ActorIsPrivileged)
        {
            return null;
        }

        if (currentUser.UserId == target.Id)
        {
            return await DenyAsync(IdentityErrors.PrivilegeSelfAction, action, target.Id, target.Email, null, cancellationToken);
        }

        if (target.IsAdministrator())
        {
            return await DenyAsync(IdentityErrors.PrivilegeAdministratorAccountProtected, action, target.Id, target.Email, null, cancellationToken);
        }

        return null;
    }

    public async Task<Error?> AuthorizeRoleAssignmentAsync(
        AppUser target, IReadOnlyCollection<AppRole> newRoles, string action, CancellationToken cancellationToken)
    {
        var ownerNormalized = AppRole.OwnerName.ToUpperInvariant();
        var targetHasOwner = target.UserRoles.Any(x => x.Role.NormalizedName == ownerNormalized);
        var requestedOwner = newRoles.Any(x => x.NormalizedName == ownerNormalized);

        // Owner membership cannot be added, removed, or transferred through user-management endpoints.
        // BootstrapAdminTask is the only code path that establishes/restores it.
        if (targetHasOwner != requestedOwner || requestedOwner && !ActorIsOwner)
        {
            return await DenyAsync(
                IdentityErrors.PrivilegeOwnerRoleProtected, action, target.Id, target.Email,
                new { targetHasOwner, requestedOwner }, cancellationToken);
        }

        if (targetHasOwner && !ActorIsOwner)
        {
            return await DenyAsync(
                IdentityErrors.PrivilegeOwnerAccountProtected, action, target.Id, target.Email, null, cancellationToken);
        }

        var held = target.UserRoles.Select(x => x.RoleId).ToHashSet();
        var addedRoleIds = newRoles.Where(r => !held.Contains(r.Id)).Select(r => r.Id).ToArray();
        if (addedRoleIds.Length > 0)
        {
            var addedCodes = await db.RolePermissions.AsNoTracking()
                .Where(rp => addedRoleIds.Contains(rp.RoleId))
                .Select(rp => rp.Permission.Code)
                .Distinct()
                .ToListAsync(cancellationToken);

            if (addedCodes.Any(code => code.StartsWith("huella.", StringComparison.Ordinal)) && !targetHasOwner)
            {
                return await DenyAsync(
                    IdentityErrors.PrivilegeOwnerPermissionRequired, action, target.Id, target.Email,
                    new { reason = "huella_profile_is_owner_only" }, cancellationToken);
            }

            if (addedCodes.Any(code => code.StartsWith("cosecha.", StringComparison.Ordinal)) && !ActorIsOwner)
            {
                return await DenyAsync(
                    IdentityErrors.PrivilegeOwnerPermissionRequired, action, target.Id, target.Email,
                    new { reason = "cosecha_access_requires_owner" }, cancellationToken);
            }
        }

        // Owner puede administrar las membresías de todas las apps. Administrator general puede
        // promover o retirar el rol Administrator, pero los demás roles deben estar limitados a
        // los permisos que el actor posee realmente.
        if (ActorIsOwner)
        {
            return null;
        }

        var willBeAdministrator = newRoles.Any(x => x.NormalizedName == AdministratorRules.NormalizedName);
        var currentlyAdministrator = target.IsAdministrator();
        if (currentlyAdministrator != willBeAdministrator && !ActorIsAdministrator)
        {
            return await DenyAsync(IdentityErrors.PrivilegeAdministratorRoleRequired, action, target.Id, target.Email, null, cancellationToken);
        }

        // Administrator puede asignar el rol general de administración. No se consideran sus permisos
        // de sistema como una concesión personalizada; cualquier otro rol añadido aún se valida aparte.
        if (ActorIsAdministrator && willBeAdministrator && !currentlyAdministrator)
        {
            var administratorRoleId = newRoles.Single(x => x.NormalizedName == AdministratorRules.NormalizedName).Id;
            addedRoleIds = addedRoleIds.Where(id => id != administratorRoleId).ToArray();
        }

        if (addedRoleIds.Length == 0)
        {
            return null;
        }

        var codes = await db.RolePermissions.AsNoTracking()
            .Where(rp => addedRoleIds.Contains(rp.RoleId))
            .Select(rp => rp.Permission.Code)
            .Distinct()
            .ToListAsync(cancellationToken);
        return await AuthorizeGrantAsync(codes, action, target.Id, cancellationToken);
    }

    public async Task<Error?> AuthorizeGrantAsync(
        IReadOnlyCollection<string> permissionCodes, string action, Guid? targetUserId, CancellationToken cancellationToken)
    {
        // These boundaries apply even to Administrator, whose ordinary administrative permissions are broad.
        // Workspace role creation/editing only accepts platform permissions, regardless of actor.
        // App-specific roles are managed by the selected app, not from this global API.
        if ((action == "create_role" || action == "set_role_permissions")
            && permissionCodes.Any(code => !PlatformRoleScope.IsPlatformPermissionCode(code)))
        {
            return await DenyAsync(
                IdentityErrors.PrivilegeAppScopeRequired, action, targetUserId, null,
                new { permissions = permissionCodes.Where(code => !PlatformRoleScope.IsPlatformPermissionCode(code)).ToArray() },
                cancellationToken);
        }

        // Owner and Workspace permissions belong only to the two seeded system roles; they are never
        // grantable to custom roles or direct user overrides, even by Owner.
        if (permissionCodes.Any(code =>
                code == IdentityPermissions.OwnerPrivilege
                || code == IdentityPermissions.WorkspaceAccess
                || code.StartsWith("huella.", StringComparison.Ordinal)))
        {
            return await DenyAsync(
                IdentityErrors.PrivilegeOwnerRoleProtected, action, targetUserId, null,
                new { permissions = permissionCodes.Where(code =>
                    code == IdentityPermissions.OwnerPrivilege
                    || code == IdentityPermissions.WorkspaceAccess
                    || code.StartsWith("huella.", StringComparison.Ordinal)).ToArray() }, cancellationToken);
        }

        // Workspace cannot issue one-off grants for app permissions, even for Owner.
        // App memberships/overrides belong to the selected app's own settings scope.
        if (string.Equals(action, "set_permissions", StringComparison.Ordinal)
            && permissionCodes.Any(code =>
                code != IdentityPermissions.DashboardView
                && !code.StartsWith("settings.", StringComparison.Ordinal)))
        {
            return await DenyAsync(
                IdentityErrors.PrivilegeAppScopeRequired, action, targetUserId, null,
                new { permissions = permissionCodes.Where(code =>
                    code != IdentityPermissions.DashboardView
                    && !code.StartsWith("settings.", StringComparison.Ordinal)).ToArray() }, cancellationToken);
        }

        if (!ActorIsOwner && permissionCodes.Any(code =>
                code.StartsWith("cosecha.", StringComparison.Ordinal)))
        {
            return await DenyAsync(
                IdentityErrors.PrivilegeOwnerPermissionRequired, action, targetUserId, null,
                new { permissions = permissionCodes.Where(code =>
                    code == IdentityPermissions.WorkspaceAccess
                    || code.StartsWith("cosecha.", StringComparison.Ordinal)
                    || code.StartsWith("huella.", StringComparison.Ordinal)).ToArray() }, cancellationToken);
        }

        if (ActorIsOwner || permissionCodes.Count == 0)
        {
            return null;
        }

        var held = await ActorPermissionsAsync(cancellationToken);
        var missing = permissionCodes.Where(code => !held.Contains(code)).OrderBy(code => code, StringComparer.Ordinal).ToArray();
        if (missing.Length == 0)
        {
            return null;
        }

        return await DenyAsync(IdentityErrors.PrivilegePermissionNotHeld, action, targetUserId, null, new { permissions = missing }, cancellationToken);
    }

    public async Task<Error?> AuthorizeRoleEditAsync(AppRole role, string action, CancellationToken cancellationToken)
    {
        if (role.IsSystemRole)
        {
            return await DenyAsync(
                IdentityErrors.PrivilegeSystemRoleImmutable, action, null, role.Name,
                new { role = role.Name }, cancellationToken);
        }

        if (!ActorIsOwner && ActorRoles.Any(r => string.Equals(r, role.Name, StringComparison.OrdinalIgnoreCase)))
        {
            return await DenyAsync(IdentityErrors.PrivilegeOwnRoleProtected, action, null, role.Name, new { role = role.Name }, cancellationToken);
        }

        return null;
    }

    private async Task<IReadOnlySet<string>> ActorPermissionsAsync(CancellationToken cancellationToken) =>
        currentUser.UserId is { } id ? await evaluator.GetEffectivePermissionsAsync(id, cancellationToken) : new HashSet<string>();

    private async Task<Error> DenyAsync(
        Error error, string action, Guid? targetUserId, string? target, object? detail, CancellationToken cancellationToken)
    {
        logger.LogWarning(
            IdentityEventIds.PrivilegeDenied,
            "Acción administrativa denegada {Action} con {Code} (objetivo {TargetUserId})", action, error.Code, targetUserId);
        try
        {
            await audit.WriteAsync(
                new AuditRecord(
                    "identity.privilege.denied", "identity", currentUser.UserId, targetUserId, target,
                    After: new { action, code = error.Code, detail }),
                cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(PastelEventIds.AuditFailure, ex, "No se pudo auditar una denegación de privilegios");
        }

        return error;
    }
}
