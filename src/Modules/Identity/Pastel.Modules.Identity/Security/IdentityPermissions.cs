using Pastel.Platform.Modules;

namespace Pastel.Modules.Identity.Security;

/// <summary>Códigos de permiso de Identity. No se cambian los códigos existentes (los usan roles y excepciones guardados).</summary>
internal static class IdentityPermissions
{
    public const string DashboardView = "dashboard.view";

    public const string UsersRead = "settings.users.read";
    public const string UsersCreate = "settings.users.create";
    public const string UsersUpdate = "settings.users.update";
    public const string UsersLock = "settings.users.lock";
    public const string UsersResetPassword = "settings.users.reset_password";
    public const string RolesRead = "settings.roles.read";
    public const string RolesCreate = "settings.roles.create";
    public const string RolesUpdate = "settings.roles.update";
    public const string PermissionsRead = "settings.permissions.read";
    public const string ModulesRead = "settings.modules.read";
    public const string ModulesManage = "settings.modules.manage";
    public const string AuditRead = "settings.audit.read";

    public static IReadOnlyList<PermissionGroup> Groups { get; } =
    [
        new("dashboard", "Inicio", 0,
        [
            new(DashboardView, "Ver panel", "Ver el panel principal."),
        ]),
        new("settings", "Configuración", 100,
        [
            new(UsersRead, "Ver usuarios", "Consultar la lista y los detalles de usuarios."),
            new(UsersCreate, "Crear usuarios", "Crear cuentas desde administración."),
            new(UsersUpdate, "Actualizar usuarios", "Modificar la asignación de roles."),
            new(UsersLock, "Bloquear usuarios", "Bloquear o desbloquear cuentas."),
            new(UsersResetPassword, "Restablecer contraseñas", "Generar una contraseña temporal."),
            new(RolesRead, "Ver roles", "Consultar roles y permisos."),
            new(RolesCreate, "Crear roles", "Crear roles de la aplicación."),
            new(RolesUpdate, "Editar permisos", "Asignar permisos a roles."),
            new(PermissionsRead, "Ver permisos", "Consultar el catálogo de permisos."),
            new(ModulesRead, "Ver módulos", "Consultar los módulos registrados."),
            new(ModulesManage, "Administrar módulos", "Activar o desactivar módulos."),
            new(AuditRead, "Ver auditoría", "Consultar los eventos de auditoría administrativos."),
        ]),
    ];
}
