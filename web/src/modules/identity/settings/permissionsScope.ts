import type { Permission, Role } from "../api/schemas";

/** Workspace solo muestra y edita permisos de plataforma; los permisos funcionales pertenecen a cada app. */
export function isPlatformPermissionCode(code: string): boolean {
  return code === "dashboard.view" || code.startsWith("settings.");
}

export function isPlatformPermission(permission: Permission): boolean {
  return isPlatformPermissionCode(permission.code);
}

/** Los roles de sistema son visibles para explicar la jerarquía; otros roles deben tener solo permisos globales. */
export function isPlatformRole(role: Role): boolean {
  if (role.isSystemRole) return true;
  return role.permissions.length > 0 && role.permissions.every(isPlatformPermissionCode);
}
