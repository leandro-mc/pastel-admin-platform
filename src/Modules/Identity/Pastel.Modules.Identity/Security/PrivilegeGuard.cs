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
/// Jerarquía de privilegios de las acciones de administración (hallazgo S1). Cada método devuelve <c>null</c> si la acción
/// se permite, o el error <c>identity.privilege.*</c> (403) ya registrado en el log y en la auditoría.
/// Quien es Administrator no tiene restricciones aquí. Las demás personas no pueden actuar sobre sí mismas ni sobre cuentas
/// de administración, ni asignar o quitar el rol Administrator, ni conceder permisos que no poseen, ni modificar un rol que tienen.
/// El rol Administrator es de sistema e inmutable para todas las personas.
/// </summary>
internal interface IPrivilegeGuard
{
    /// <summary>Restablecer contraseña, bloquear, desbloquear, cambiar roles o excepciones de otra cuenta.</summary>
    Task<Error?> AuthorizeActionOnUserAsync(AppUser target, string action, CancellationToken cancellationToken);

    /// <summary>
    /// Asignación de roles a una cuenta (existente, con sus roles cargados, o nueva). El rol Administrator solo lo asigna o quita un
    /// Administrator, y los roles que se agregan no pueden traer permisos que quien actúa no posee.
    /// </summary>
    Task<Error?> AuthorizeRoleAssignmentAsync(AppUser target, IReadOnlyCollection<AppRole> newRoles, string action, CancellationToken cancellationToken);

    /// <summary>Concesión de permisos (a un rol nuevo o existente, o por excepción): solo los que quien actúa ya posee.</summary>
    Task<Error?> AuthorizeGrantAsync(IReadOnlyCollection<string> permissionCodes, string action, Guid? targetUserId, CancellationToken cancellationToken);

    /// <summary>Edición de los permisos de un rol: Administrator es inmutable y nadie edita un rol que tiene (salvo un Administrator).</summary>
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
    // Los roles de quien actúa vienen del resumen que ya se cargó al validar el token de esta petición (sin consulta adicional).
    private IReadOnlyList<string> ActorRoles => accessor.HttpContext?.GetSessionUser()?.Roles ?? [];

    private bool ActorIsAdministrator =>
        ActorRoles.Any(r => string.Equals(r, AppRole.AdministratorName, StringComparison.OrdinalIgnoreCase));

    public async Task<Error?> AuthorizeActionOnUserAsync(AppUser target, string action, CancellationToken cancellationToken)
    {
        // Bloquearse a sí mismo se prohíbe a cualquier actor, incluso Administrator; el evento debe quedar auditado.
        if (currentUser.UserId == target.Id && string.Equals(action, "block_user", StringComparison.Ordinal))
        {
            return await DenyAsync(IdentityErrors.PrivilegeSelfAction, action, target.Id, target.Email, null, cancellationToken);
        }

        if (ActorIsAdministrator)
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
        if (ActorIsAdministrator)
        {
            return null;
        }

        var willBeAdministrator = newRoles.Any(r => r.NormalizedName == AdministratorRules.NormalizedName);
        if (target.IsAdministrator() != willBeAdministrator)
        {
            return await DenyAsync(IdentityErrors.PrivilegeAdministratorRoleRequired, action, target.Id, target.Email, null, cancellationToken);
        }

        var held = target.UserRoles.Select(x => x.RoleId).ToHashSet();
        var addedRoleIds = newRoles.Where(r => !held.Contains(r.Id)).Select(r => r.Id).ToArray();
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
        if (ActorIsAdministrator || permissionCodes.Count == 0)
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
        if (role.NormalizedName == AdministratorRules.NormalizedName)
        {
            return await DenyAsync(IdentityErrors.PrivilegeSystemRoleImmutable, action, null, role.Name, new { role = role.Name }, cancellationToken);
        }

        if (!ActorIsAdministrator && ActorRoles.Any(r => string.Equals(r, role.Name, StringComparison.OrdinalIgnoreCase)))
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
        // Sin correos ni nombres en el log: solo códigos e identificadores. La persona que actúa la agrega el enriquecedor.
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
            // La denegación se responde igual; el fallo de auditoría queda visible en el registro técnico.
            logger.LogError(PastelEventIds.AuditFailure, ex, "No se pudo auditar una denegación de privilegios");
        }

        return error;
    }
}
