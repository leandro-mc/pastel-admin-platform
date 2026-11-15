import type { Permission, Role } from "../api/schemas";

/** Workspace solo muestra y edita permisos de plataforma; los permisos funcionales pertenecen a cada app. */
export function isPlatformPermissionCode(code: string): boolean {
  return code === "dashboard.view" || code.startsWith("settings.");
}

export function isPlatformPermission(permission: Permission): boolean {
  return isPlatformPermissionCode(permission.code);
}

/** Modo desarrollador (vista previa por rol): se concede a cuentas concretas, nunca a un rol personalizado. */
export const DEVELOPER_MODE_CODE = "platform.developer.mode";

/** Lo que Workspace puede conceder como excepción individual: permisos de plataforma y el modo desarrollador. */
export function isUserOverridablePermission(permission: Permission): boolean {
  return (
    isPlatformPermissionCode(permission.code) ||
    permission.code === DEVELOPER_MODE_CODE
  );
}

/** Los roles de sistema son visibles para explicar la jerarquía; otros roles deben tener solo permisos globales. */
export function isPlatformRole(role: Role): boolean {
  if (role.isSystemRole) return true;
  // El permiso compartido dashboard.view también puede aparecer en roles de producto como Member.
  // Un rol personalizado pertenece a Workspace solo cuando tiene al menos un permiso settings.*
  // y ninguno fuera del ámbito de plataforma.
  return (
    role.permissions.some((code) => code.startsWith("settings.")) &&
    role.permissions.every(isPlatformPermissionCode)
  );
}
