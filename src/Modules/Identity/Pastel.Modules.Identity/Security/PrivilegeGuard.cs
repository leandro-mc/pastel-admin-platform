using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Pastel.Application.Abstractions;
using Pastel.Application.Contracts;
using Pastel.Domain.Entities;
using Pastel.Infrastructure.Persistence;

namespace Pastel.Infrastructure.Services;

public sealed partial class AdministrationService(AppDbContext db, IPasswordHasher<AppUser> passwordHasher) : IAdministrationService
{
    public async Task<IReadOnlyList<UserSummary>> GetUsersAsync(CancellationToken cancellationToken)
    {
        var users = await db.Users.AsNoTracking().Include(x => x.UserRoles).ThenInclude(x => x.Role)
            .OrderBy(x => x.NormalizedEmail).ToListAsync(cancellationToken);
        return users.Select(AuthService.ToSummary).ToArray();
    }

    public async Task<UserSummary> CreateUserAsync(CreateUserCommand command, Guid actorId, string? ipAddress, CancellationToken cancellationToken)
    {
        var email = AuthService.NormalizeEmail(command.Email);
        if (!AuthService.IsValidEmail(email) || string.IsNullOrWhiteSpace(command.DisplayName) || command.DisplayName.Trim().Length is < 2 or > 100
            || !PasswordPolicy.IsStrong(command.TemporaryPassword))
            throw new ArgumentException("Datos inválidos. La contraseña temporal debe tener al menos 12 caracteres y combinar mayúsculas, minúsculas, números y símbolos.");
        if (await db.Users.AnyAsync(x => x.NormalizedEmail == email, cancellationToken)) throw new ArgumentException("No se puede crear una cuenta con esos datos.");
        var roles = await db.Roles.Where(x => command.RoleIds.Contains(x.Id)).ToListAsync(cancellationToken);
        if (roles.Count != command.RoleIds.Distinct().Count()) throw new ArgumentException("Uno o más roles no existen.");
        var user = new AppUser { Email = command.Email.Trim(), NormalizedEmail = email, DisplayName = command.DisplayName.Trim(), PasswordHash = "pending", MustChangePassword = true };
        user.PasswordHash = passwordHasher.HashPassword(user, command.TemporaryPassword);
        db.Users.Add(user);
        foreach (var role in roles) db.UserRoles.Add(new UserRole { User = user, Role = role });
        AddAudit(actorId, user.Id, "admin.user.created", user.Email, ipAddress);
        await db.SaveChangesAsync(cancellationToken);
        return await GetUserSummaryAsync(user.Id, cancellationToken);
    }

    public async Task<IReadOnlyList<string>> SetUserRolesAsync(Guid userId, IReadOnlyCollection<Guid> roleIds, Guid actorId, string? ipAddress, CancellationToken cancellationToken)
    {
        // Serialize the last-administrator invariant so concurrent role changes cannot remove every active admin.
        await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, cancellationToken);
        var user = await db.Users.Include(x => x.UserRoles).ThenInclude(x => x.Role).SingleOrDefaultAsync(x => x.Id == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Usuario no encontrado.");
        var newRoles = await db.Roles.Where(x => roleIds.Contains(x.Id)).ToListAsync(cancellationToken);
        if (newRoles.Count != roleIds.Distinct().Count()) throw new ArgumentException("Uno o más roles no existen.");
        var hadAdmin = user.UserRoles.Any(x => x.Role.NormalizedName == "ADMINISTRATOR");
        var willHaveAdmin = newRoles.Any(x => x.NormalizedName == "ADMINISTRATOR");
        if (hadAdmin && !willHaveAdmin && await CountActiveAdminsAsync(cancellationToken) <= 1)
            throw new InvalidOperationException("No se puede quitar el último administrador activo.");
        var existingRoleIds = user.UserRoles.Select(x => x.RoleId).ToHashSet();
        var requestedRoleIds = newRoles.Select(x => x.Id).ToHashSet();
        var removedRoles = user.UserRoles.Where(x => !requestedRoleIds.Contains(x.RoleId)).ToArray();
        db.UserRoles.RemoveRange(removedRoles);
        foreach (var role in newRoles.Where(x => !existingRoleIds.Contains(x.Id)))
            db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
        user.TokenVersion++;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        await RevokeRefreshTokensAsync(user.Id, cancellationToken);
        AddAudit(actorId, user.Id, "admin.user.roles-updated", string.Join(',', newRoles.Select(x => x.Name)), ipAddress);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return newRoles.Select(x => x.Name).OrderBy(x => x).ToArray();
    }

    public async Task<IReadOnlyList<UserPermissionAssignment>> GetUserPermissionOverridesAsync(Guid userId, CancellationToken cancellationToken)
    {
        if (!await db.Users.AnyAsync(x => x.Id == userId, cancellationToken)) throw new KeyNotFoundException("Usuario no encontrado.");
        return await db.UserPermissionOverrides.AsNoTracking().Where(x => x.UserId == userId).Include(x => x.Permission)
            .OrderBy(x => x.Permission.Code).Select(x => new UserPermissionAssignment(x.PermissionId, x.Permission.Code, x.Permission.Name, x.Effect)).ToListAsync(cancellationToken);
    }

    public async Task SetUserPermissionOverridesAsync(Guid userId, IReadOnlyCollection<UserPermissionChange> changes, Guid actorId, string? ipAddress, CancellationToken cancellationToken)
    {
        var user = await db.Users.Include(x => x.UserRoles).ThenInclude(x => x.Role).SingleOrDefaultAsync(x => x.Id == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Usuario no encontrado.");
        if (user.UserRoles.Any(x => x.Role.NormalizedName == "ADMINISTRATOR"))
            throw new InvalidOperationException("Los permisos directos no se aplican a la cuenta de administración; modificá los roles en su lugar.");
        if (changes.Select(x => x.PermissionId).Distinct().Count() != changes.Count) throw new ArgumentException("No repitas permisos en la solicitud.");
        if (changes.Any(x => !Enum.IsDefined(x.Effect))) throw new ArgumentException("Uno o más efectos de permiso no son válidos.");
        var permissionIds = changes.Select(x => x.PermissionId).ToArray();
        var existingPermissions = await db.Permissions.Where(x => permissionIds.Contains(x.Id)).Select(x => x.Id).ToListAsync(cancellationToken);
        if (existingPermissions.Count != permissionIds.Distinct().Count()) throw new ArgumentException("Uno o más permisos no existen.");
        var oldOverrides = await db.UserPermissionOverrides.Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        var requestedOverrides = changes.ToDictionary(x => x.PermissionId, x => x.Effect);
        var oldByPermission = oldOverrides.ToDictionary(x => x.PermissionId);
        db.UserPermissionOverrides.RemoveRange(oldOverrides.Where(x => !requestedOverrides.ContainsKey(x.PermissionId)));
        var now = DateTimeOffset.UtcNow;
        foreach (var change in changes)
        {
            if (oldByPermission.TryGetValue(change.PermissionId, out var existing))
            {
                if (existing.Effect != change.Effect)
                {
                    existing.Effect = change.Effect;
                    existing.AssignedByUserId = actorId;
                    existing.UpdatedAt = now;
                }
            }
            else
            {
                db.UserPermissionOverrides.Add(new UserPermissionOverride { UserId = userId, PermissionId = change.PermissionId, Effect = change.Effect, AssignedByUserId = actorId, UpdatedAt = now });
            }
        }
        user.TokenVersion++;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        AddAudit(actorId, userId, "admin.user.permissions-updated", $"{changes.Count} override(s)", ipAddress);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task BlockUserAsync(Guid userId, Guid actorId, string? ipAddress, CancellationToken cancellationToken)
    {
        if (userId == actorId) throw new InvalidOperationException("No podés bloquear tu propia cuenta.");
        // Keep the last-active-administrator guard safe under concurrent administrative requests.
        await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, cancellationToken);
        var user = await db.Users.Include(x => x.UserRoles).ThenInclude(x => x.Role).SingleOrDefaultAsync(x => x.Id == userId, cancellationToken)
            ?? throw new KeyNotFoundException("Usuario no encontrado.");
        if (user.IsActive && user.UserRoles.Any(x => x.Role.NormalizedName == "ADMINISTRATOR") && await CountActiveAdminsAsync(cancellationToken) <= 1)
            throw new InvalidOperationException("No se puede bloquear el último administrador activo.");
        user.IsActive = false;
        user.TokenVersion++;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        await RevokeRefreshTokensAsync(userId, cancellationToken);
        AddAudit(actorId, userId, "admin.user.blocked", user.Email, ipAddress);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task UnblockUserAsync(Guid userId, Guid actorId, string? ipAddress, CancellationToken cancellationToken)
    {
        var user = await db.Users.SingleOrDefaultAsync(x => x.Id == userId, cancellationToken) ?? throw new KeyNotFoundException("Usuario no encontrado.");
        user.IsActive = true;
        user.LockoutEnd = null;
        user.AccessFailedCount = 0;
        user.TokenVersion++;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        AddAudit(actorId, userId, "admin.user.unblocked", user.Email, ipAddress);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<string> ResetPasswordAsync(Guid userId, Guid actorId, string? ipAddress, CancellationToken cancellationToken)
    {
        var user = await db.Users.SingleOrDefaultAsync(x => x.Id == userId, cancellationToken) ?? throw new KeyNotFoundException("Usuario no encontrado.");
        var raw = $"Pst!{Convert.ToHexString(RandomNumberGenerator.GetBytes(12))}a9";
        user.PasswordHash = passwordHasher.HashPassword(user, raw);
        user.MustChangePassword = true;
        user.AccessFailedCount = 0;
        user.LockoutEnd = null;
        user.TokenVersion++;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        await RevokeRefreshTokensAsync(userId, cancellationToken);
        AddAudit(actorId, userId, "admin.user.password-reset", user.Email, ipAddress);
        await db.SaveChangesAsync(cancellationToken);
        return raw;
    }

    public async Task<IReadOnlyList<RoleSummary>> GetRolesAsync(CancellationToken cancellationToken)
    {
        var roles = await db.Roles.AsNoTracking().Include(x => x.RolePermissions).ThenInclude(x => x.Permission)
            .OrderBy(x => x.Name).ToListAsync(cancellationToken);
        var counts = await db.UserRoles.GroupBy(x => x.RoleId).Select(x => new { Id = x.Key, Count = x.Count() }).ToDictionaryAsync(x => x.Id, x => x.Count, cancellationToken);
        return roles.Select(x => new RoleSummary(x.Id, x.Name, x.Description, x.IsSystemRole,
            x.RolePermissions.Select(p => p.PermissionId).ToArray(), x.RolePermissions.Select(p => p.Permission.Code).OrderBy(p => p).ToArray(), counts.GetValueOrDefault(x.Id))).ToArray();
    }

    public async Task<RoleSummary> CreateRoleAsync(CreateRoleCommand command, Guid actorId, string? ipAddress, CancellationToken cancellationToken)
    {
        var name = command.Name.Trim();
        if (name.Length is < 2 or > 64 || !RoleNameRegex().IsMatch(name)) throw new ArgumentException("Nombre de rol inválido.");
        var normalized = name.ToUpperInvariant();
        if (await db.Roles.AnyAsync(x => x.NormalizedName == normalized, cancellationToken)) throw new ArgumentException("Ese rol ya existe.");
        var permissions = await db.Permissions.Where(x => command.PermissionIds.Contains(x.Id)).ToListAsync(cancellationToken);
        if (permissions.Count != command.PermissionIds.Distinct().Count()) throw new ArgumentException("Una o más opciones de permiso no existen.");
        var role = new AppRole { Name = name, NormalizedName = normalized, Description = command.Description?.Trim() };
        db.Roles.Add(role);
        foreach (var permission in permissions) db.RolePermissions.Add(new RolePermission { Role = role, Permission = permission });
        AddAudit(actorId, null, "admin.role.created", name, ipAddress);
        await db.SaveChangesAsync(cancellationToken);
        var saved = (await GetRolesAsync(cancellationToken)).Single(x => x.Id == role.Id);
        return saved;
    }

    public async Task SetRolePermissionsAsync(Guid roleId, IReadOnlyCollection<Guid> permissionIds, Guid actorId, string? ipAddress, CancellationToken cancellationToken)
    {
        var role = await db.Roles.Include(x => x.RolePermissions).SingleOrDefaultAsync(x => x.Id == roleId, cancellationToken)
            ?? throw new KeyNotFoundException("Rol no encontrado.");
        var allPermissions = await db.Permissions.ToListAsync(cancellationToken);
        var requested = await db.Permissions.Where(x => permissionIds.Contains(x.Id)).ToListAsync(cancellationToken);
        if (requested.Count != permissionIds.Distinct().Count()) throw new ArgumentException("Una o más opciones de permiso no existen.");
        if (role.NormalizedName == "ADMINISTRATOR") requested = allPermissions;
        var existingPermissionIds = role.RolePermissions.Select(x => x.PermissionId).ToHashSet();
        var requestedPermissionIds = requested.Select(x => x.Id).ToHashSet();
        db.RolePermissions.RemoveRange(role.RolePermissions.Where(x => !requestedPermissionIds.Contains(x.PermissionId)).ToArray());
        foreach (var permission in requested.Where(x => !existingPermissionIds.Contains(x.Id)))
            db.RolePermissions.Add(new RolePermission { RoleId = roleId, PermissionId = permission.Id });
        AddAudit(actorId, null, "admin.role.permissions-updated", role.Name, ipAddress);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ModuleSummary>> GetModulesAsync(CancellationToken cancellationToken)
    {
        var modules = await db.Modules.AsNoTracking().Include(x => x.Permissions).OrderBy(x => x.SortOrder).ThenBy(x => x.Name).ToListAsync(cancellationToken);
        return modules.Select(x => ToModuleSummary(x)).ToArray();
    }

    public async Task<ModuleSummary> CreateModuleAsync(CreateModuleCommand command, Guid actorId, string? ipAddress, CancellationToken cancellationToken)
    {
        var code = command.Code.Trim().ToLowerInvariant();
        var name = command.Name.Trim();
        if (!ModuleCodeRegex().IsMatch(code) || name.Length is < 2 or > 100) throw new ArgumentException("Código o nombre de módulo inválido. Usá minúsculas, números y guiones.");
        if (await db.Modules.AnyAsync(x => x.Code == code, cancellationToken)) throw new ArgumentException("Ese código de módulo ya existe.");
        var actions = command.Actions.Select(x => x.Trim().ToLowerInvariant()).Distinct().ToArray();
        if (actions.Length == 0 || actions.Length > 20 || actions.Any(x => !ActionRegex().IsMatch(x))) throw new ArgumentException("Indicá entre 1 y 20 acciones válidas: letras, números y guiones bajos.");
        var module = new ModuleDefinition { Code = code, Name = name, Description = command.Description?.Trim(), SortOrder = (await db.Modules.CountAsync(cancellationToken)) * 10 };
        db.Modules.Add(module);
        var adminRole = await db.Roles.SingleAsync(x => x.NormalizedName == "ADMINISTRATOR", cancellationToken);
        foreach (var action in actions)
        {
            var permission = new PermissionDefinition
            {
                Module = module, Code = $"{code}.{action}", Name = $"{name}: {action.Replace('_', ' ')}", Description = $"Permite la acción {action} dentro de {name}."
            };
            db.Permissions.Add(permission);
            db.RolePermissions.Add(new RolePermission { Role = adminRole, Permission = permission });
        }
        AddAudit(actorId, null, "admin.module.created", code, ipAddress);
        await db.SaveChangesAsync(cancellationToken);
        return ToModuleSummary(await db.Modules.Include(x => x.Permissions).SingleAsync(x => x.Id == module.Id, cancellationToken));
    }

    public async Task SetModuleEnabledAsync(Guid moduleId, bool enabled, Guid actorId, string? ipAddress, CancellationToken cancellationToken)
    {
        var module = await db.Modules.SingleOrDefaultAsync(x => x.Id == moduleId, cancellationToken) ?? throw new KeyNotFoundException("Módulo no encontrado.");
        if (module.Code == "settings" && !enabled) throw new InvalidOperationException("El módulo de configuración del sistema no se puede desactivar.");
        module.IsEnabled = enabled;
        AddAudit(actorId, null, enabled ? "admin.module.enabled" : "admin.module.disabled", module.Code, ipAddress);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<PermissionSummary>> GetPermissionsAsync(CancellationToken cancellationToken)
    {
        return await db.Permissions.AsNoTracking().Include(x => x.Module).OrderBy(x => x.Module.SortOrder).ThenBy(x => x.Code)
            .Select(x => new PermissionSummary(x.Id, x.Module.Code, x.Module.Name, x.Code, x.Name, x.Description, x.IsSystemPermission))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AuditEntry>> GetAuditLogAsync(int take, CancellationToken cancellationToken)
    {
        take = Math.Clamp(take, 1, 200);
        return await db.AuditLogs.AsNoTracking().OrderByDescending(x => x.CreatedAt).Take(take)
            .GroupJoin(db.Users.AsNoTracking(), log => log.ActorUserId, user => (Guid?)user.Id, (log, users) => new { log, actor = users.Select(x => x.Email).FirstOrDefault() })
            .Select(x => new AuditEntry(x.log.Id, x.log.ActorUserId, x.actor, x.log.TargetUserId, x.log.Action, x.log.Target, x.log.DetailsJson, x.log.IpAddress, x.log.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    private async Task<UserSummary> GetUserSummaryAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await db.Users.AsNoTracking().Include(x => x.UserRoles).ThenInclude(x => x.Role).SingleAsync(x => x.Id == userId, cancellationToken);
        return AuthService.ToSummary(user);
    }

    private Task<int> CountActiveAdminsAsync(CancellationToken cancellationToken) => db.Users.CountAsync(x => x.IsActive && (x.LockoutEnd == null || x.LockoutEnd <= DateTimeOffset.UtcNow) && x.UserRoles.Any(r => r.Role.NormalizedName == "ADMINISTRATOR"), cancellationToken);

    private async Task RevokeRefreshTokensAsync(Guid userId, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var tokens = await db.RefreshTokens.Where(x => x.UserId == userId && x.RevokedAt == null).ToListAsync(cancellationToken);
        foreach (var token in tokens) token.RevokedAt = now;
    }

    private void AddAudit(Guid? actor, Guid? targetUserId, string action, string? target, string? ipAddress) => db.AuditLogs.Add(new AuditLog
    {
        ActorUserId = actor, TargetUserId = targetUserId, Action = action, Target = target, IpAddress = ipAddress
    });

    private static ModuleSummary ToModuleSummary(ModuleDefinition x) => new(x.Id, x.Code, x.Name, x.Description, x.IsEnabled, x.SortOrder,
        x.Permissions.OrderBy(p => p.Code).Select(p => new PermissionSummary(p.Id, x.Code, x.Name, p.Code, p.Name, p.Description, p.IsSystemPermission)).ToArray());

    [GeneratedRegex("^[A-Za-z][A-Za-z0-9 _.-]{1,63}$", RegexOptions.CultureInvariant)] private static partial Regex RoleNameRegex();
    [GeneratedRegex("^[a-z][a-z0-9-]{1,62}$", RegexOptions.CultureInvariant)] private static partial Regex ModuleCodeRegex();
    [GeneratedRegex("^[a-z][a-z0-9_]{0,39}$", RegexOptions.CultureInvariant)] private static partial Regex ActionRegex();
}
