using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using Pastel.Domain.Entities;

namespace Pastel.Infrastructure.Persistence;

public static class DatabaseSeeder
{
    private static readonly (string Module, string ModuleName, string Permission, string PermissionName, string Description)[] PermissionCatalog =
    [
        ("dashboard", "Inicio", "dashboard.view", "Ver panel", "Ver el panel principal."),
        ("settings", "Configuración", "settings.users.read", "Ver usuarios", "Consultar la lista y los detalles de usuarios."),
        ("settings", "Configuración", "settings.users.create", "Crear usuarios", "Crear cuentas desde administración."),
        ("settings", "Configuración", "settings.users.update", "Actualizar usuarios", "Modificar la asignación de roles."),
        ("settings", "Configuración", "settings.users.lock", "Bloquear usuarios", "Bloquear o desbloquear cuentas."),
        ("settings", "Configuración", "settings.users.reset_password", "Restablecer contraseñas", "Generar una contraseña temporal."),
        ("settings", "Configuración", "settings.roles.read", "Ver roles", "Consultar roles y permisos."),
        ("settings", "Configuración", "settings.roles.create", "Crear roles", "Crear roles de la aplicación."),
        ("settings", "Configuración", "settings.roles.update", "Editar permisos", "Asignar permisos a roles."),
        ("settings", "Configuración", "settings.permissions.read", "Ver permisos", "Consultar el catálogo de permisos."),
        ("settings", "Configuración", "settings.modules.read", "Ver módulos", "Consultar módulos registrados."),
        ("settings", "Configuración", "settings.modules.manage", "Administrar módulos", "Registrar y activar o desactivar módulos."),
        ("settings", "Configuración", "settings.audit.read", "Ver auditoría", "Consultar eventos de auditoría administrativos.")
    ];

    public static async Task InitializeAsync(AppDbContext db, IConfiguration configuration, IPasswordHasher<AppUser> passwordHasher, ILogger logger, CancellationToken cancellationToken = default)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        foreach (var group in PermissionCatalog.Select(x => new { x.Module, x.ModuleName }).DistinctBy(x => x.Module))
        {
            if (!await db.Modules.AnyAsync(x => x.Code == group.Module, cancellationToken))
                db.Modules.Add(new ModuleDefinition { Code = group.Module, Name = group.ModuleName, SortOrder = group.Module == "dashboard" ? 0 : 100, IsEnabled = true });
        }
        await db.SaveChangesAsync(cancellationToken);
        var modules = await db.Modules.ToDictionaryAsync(x => x.Code, cancellationToken);
        foreach (var item in PermissionCatalog)
        {
            if (!await db.Permissions.AnyAsync(x => x.Code == item.Permission, cancellationToken))
                db.Permissions.Add(new PermissionDefinition { ModuleId = modules[item.Module].Id, Code = item.Permission, Name = item.PermissionName, Description = item.Description, IsSystemPermission = true });
        }
        if (!await db.Roles.AnyAsync(x => x.NormalizedName == "ADMINISTRATOR", cancellationToken))
            db.Roles.Add(new AppRole { Name = "Administrator", NormalizedName = "ADMINISTRATOR", Description = "Administración completa de la plataforma.", IsSystemRole = true });
        if (!await db.Roles.AnyAsync(x => x.NormalizedName == "MEMBER", cancellationToken))
            db.Roles.Add(new AppRole { Name = "Member", NormalizedName = "MEMBER", Description = "Acceso básico al panel.", IsSystemRole = false });
        await db.SaveChangesAsync(cancellationToken);

        var adminRole = await db.Roles.SingleAsync(x => x.NormalizedName == "ADMINISTRATOR", cancellationToken);
        var allPermissions = await db.Permissions.ToListAsync(cancellationToken);
        var currentAdminPermissionIds = await db.RolePermissions.Where(x => x.RoleId == adminRole.Id).Select(x => x.PermissionId).ToListAsync(cancellationToken);
        foreach (var permission in allPermissions.Where(p => !currentAdminPermissionIds.Contains(p.Id)))
            db.RolePermissions.Add(new RolePermission { RoleId = adminRole.Id, PermissionId = permission.Id });
        var memberRole = await db.Roles.SingleAsync(x => x.NormalizedName == "MEMBER", cancellationToken);
        var dashboardPermission = allPermissions.Single(x => x.Code == "dashboard.view");
        if (!await db.RolePermissions.AnyAsync(x => x.RoleId == memberRole.Id && x.PermissionId == dashboardPermission.Id, cancellationToken))
            db.RolePermissions.Add(new RolePermission { RoleId = memberRole.Id, PermissionId = dashboardPermission.Id });

        var bootstrapEmail = configuration["Bootstrap:AdminEmail"]?.Trim();
        var bootstrapPassword = configuration["Bootstrap:AdminPassword"];
        if (!string.IsNullOrWhiteSpace(bootstrapEmail) && !string.IsNullOrWhiteSpace(bootstrapPassword))
        {
            var normalizedEmail = bootstrapEmail.ToUpperInvariant();
            var admin = await db.Users.SingleOrDefaultAsync(x => x.NormalizedEmail == normalizedEmail, cancellationToken);
            if (admin is null)
            {
                admin = new AppUser { Email = bootstrapEmail, NormalizedEmail = normalizedEmail, DisplayName = "Administrador", PasswordHash = "pending", MustChangePassword = true };
                admin.PasswordHash = passwordHasher.HashPassword(admin, bootstrapPassword);
                db.Users.Add(admin);
                db.UserRoles.Add(new UserRole { User = admin, Role = adminRole });
                db.AuditLogs.Add(new AuditLog { ActorUserId = null, TargetUserId = admin.Id, Action = "system.bootstrap-admin-created", Target = admin.Email });
                logger.LogWarning("Bootstrap admin created for {AdminEmail}. Sign in and change its password immediately.", bootstrapEmail);
            }
            else if (!await db.UserRoles.AnyAsync(x => x.UserId == admin.Id && x.RoleId == adminRole.Id, cancellationToken))
            {
                db.UserRoles.Add(new UserRole { UserId = admin.Id, RoleId = adminRole.Id });
            }
        }
        else
        {
            logger.LogWarning("No bootstrap admin configured. Set Bootstrap__AdminEmail and Bootstrap__AdminPassword before first run to enable administration.");
        }
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }
}
