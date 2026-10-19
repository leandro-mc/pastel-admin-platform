using Pastel.SharedKernel;

namespace Pastel.Modules.Identity.Common;

/// <summary>Errores esperables de Identity. Códigos <c>identity.&lt;recurso&gt;.&lt;motivo&gt;</c>; mensajes en español de Costa Rica (trato de usted).</summary>
internal static class IdentityErrors
{
    // Acceso
    public static readonly Error InvalidCredentials = Error.Unauthorized(
        "identity.login.invalid_credentials", "Correo o contraseña incorrectos, o cuenta no disponible.");

    public static readonly Error LocalLoginDisabled = Error.Forbidden(
        "identity.login.disabled", "El ingreso con contraseña no está disponible. Use otro método de acceso.");

    public static readonly Error RegistrationDisabled = Error.Forbidden(
        "identity.register.disabled", "El registro no está disponible. Solicite su cuenta a administración.");

    public static readonly Error RegistrationRejected = Error.Conflict(
        "identity.register.unavailable", "No se pudo crear la cuenta con esos datos.");

    public static readonly Error InvalidSession = Error.Unauthorized(
        "identity.session.invalid", "La sesión no es válida. Ingrese de nuevo.");

    public static readonly Error SessionExpired = Error.Unauthorized(
        "identity.session.expired", "La sesión expiró o dejó de ser válida. Ingrese de nuevo.");

    // Contraseñas
    public static Error CurrentPasswordIncorrect() => Error.Validation(
        "identity.password.current_incorrect", "La contraseña actual no es correcta.",
        new Dictionary<string, string[]> { ["currentPassword"] = ["La contraseña actual no es correcta."] });

    public static Error PasswordWeak(string field) => Error.Validation(
        "identity.password.weak", "La contraseña no cumple los requisitos de seguridad.",
        new Dictionary<string, string[]> { [field] = [PasswordPolicy.Description] });

    // Usuarios
    public static readonly Error UserNotFound = Error.NotFound("identity.user.not_found", "No se encontró la persona usuaria.");

    public static readonly Error EmailTaken = Error.Conflict(
        "identity.user.email_taken", "No se puede crear una cuenta con esos datos.");

    public static readonly Error CannotBlockSelf = Error.Conflict(
        "identity.user.cannot_block_self", "No puede bloquear su propia cuenta.");

    public static readonly Error LastActiveAdministrator = Error.Conflict(
        "identity.admin.last_active", "No se puede dejar la plataforma sin una persona administradora activa.");

    public static readonly Error OverridesNotForAdministrator = Error.Conflict(
        "identity.user.overrides_not_allowed", "Los permisos directos no aplican a una cuenta de administración. Modifique sus roles.");

    // Roles y permisos
    public static readonly Error RoleNotFound = Error.NotFound("identity.role.not_found", "No se encontró el rol.");

    public static readonly Error UnknownRoles = Error.Validation(
        "identity.role.unknown", "Uno o más roles no existen.",
        new Dictionary<string, string[]> { ["roleIds"] = ["Uno o más roles no existen."] });

    public static readonly Error UnknownPermissions = Error.Validation(
        "identity.permission.unknown", "Uno o más permisos no existen.",
        new Dictionary<string, string[]> { ["permissionIds"] = ["Uno o más permisos no existen."] });

    public static readonly Error RoleNameTaken = Error.Conflict(
        "identity.role.name_taken", "Ya existe un rol con ese nombre.",
        new Dictionary<string, string[]> { ["name"] = ["Ya existe un rol con ese nombre."] });

    // Jerarquía de privilegios (S1): todas son 403
    public static readonly Error PrivilegeAdministratorRoleRequired = Error.Forbidden(
        "identity.privilege.administrator_role_required", "Solo una persona administradora puede asignar o quitar el rol Administrator.");

    public static readonly Error PrivilegeAdministratorAccountProtected = Error.Forbidden(
        "identity.privilege.administrator_account_protected", "Solo una persona administradora puede actuar sobre una cuenta de administración.");

    public static readonly Error PrivilegeSelfAction = Error.Forbidden(
        "identity.privilege.self_action_not_allowed", "No puede realizar esta acción sobre su propia cuenta.");

    public static readonly Error PrivilegePermissionNotHeld = Error.Forbidden(
        "identity.privilege.permission_not_held", "No puede conceder permisos que usted no tiene.");

    public static readonly Error PrivilegeOwnRoleProtected = Error.Forbidden(
        "identity.privilege.own_role_protected", "No puede modificar un rol que usted mismo tiene.");

    public static readonly Error PrivilegeSystemRoleImmutable = Error.Forbidden(
        "identity.privilege.system_role_immutable", "El rol Administrator es de sistema y no se puede modificar.");

    // Módulos
    public static readonly Error ModuleNotFound = Error.NotFound("identity.module.not_found", "No se encontró el módulo.");

    public static readonly Error SettingsModuleLocked = Error.Conflict(
        "identity.module.settings_locked", "El módulo de configuración del sistema no se puede desactivar.");
}
