/** Etiquetas legibles de las acciones de auditoría; lo desconocido se muestra con formato legible (no se oculta). */
const labels: Record<string, string> = {
  "auth.login.succeeded": "Ingreso correcto",
  "auth.login.failed": "Ingreso fallido",
  "auth.login.denied": "Ingreso denegado",
  "auth.logout": "Cierre de sesión",
  "auth.register": "Registro de cuenta",
  "auth.access.denied": "Acceso denegado",
  "auth.refresh.succeeded": "Sesión renovada",
  "auth.refresh.grace-reused": "Renovación repetida en la ventana de gracia",
  "auth.refresh.reuse-detected": "Reutilización de sesión detectada",
  "auth.google.login": "Ingreso con Google",
  "auth.google.linked": "Cuenta vinculada con Google",
  "auth.google.registered": "Cuenta creada con Google",
  "auth.google.denied": "Ingreso con Google denegado",
  "user.password.changed": "Contraseña cambiada",
  "admin.user.created": "Usuario creado",
  "admin.user.roles-updated": "Roles de usuario actualizados",
  "admin.user.permissions-updated": "Excepciones de permisos actualizadas",
  "admin.user.blocked": "Usuario bloqueado",
  "admin.user.unblocked": "Usuario desbloqueado",
  "admin.user.password-reset": "Contraseña restablecida",
  "admin.role.created": "Rol creado",
  "admin.role.permissions-updated": "Permisos de rol actualizados",
  "admin.module.enabled": "Módulo activado",
  "admin.module.disabled": "Módulo desactivado",
  "identity.bootstrap.admin_created": "Cuenta de arranque creada",
  "identity.bootstrap.admin_restored": "Cuenta de arranque restaurada",
  "identity.bootstrap.admin_lockout_cleared":
    "Bloqueo de la cuenta de arranque limpiado",
};

export function auditLabel(action: string): string {
  return (
    labels[action] ??
    action.replaceAll(".", " · ").replaceAll("-", " ").replaceAll("_", " ")
  );
}
