import { routes } from "@/core/routes";

/** Rutas de Configuración (módulo Identity). Las pestañas y los editores son rutas reales: se pueden enlazar y recargar. */
export const settingsPaths = {
  root: routes.settings,
  users: `${routes.settings}/usuarios`,
  roles: `${routes.settings}/roles`,
  modules: `${routes.settings}/modulos`,
  audit: `${routes.settings}/auditoria`,
  userAccess: (userId: string) =>
    `${routes.settings}/accesos/usuario/${userId}`,
  roleAccess: (roleId: string) => `${routes.settings}/accesos/rol/${roleId}`,
} as const;

/** Códigos de permiso que usa la interfaz solo para mostrar u ocultar (la autorización real es del servidor). */
export const identityPermissions = {
  usersRead: "settings.users.read",
  usersCreate: "settings.users.create",
  usersUpdate: "settings.users.update",
  usersLock: "settings.users.lock",
  usersResetPassword: "settings.users.reset_password",
  rolesRead: "settings.roles.read",
  rolesCreate: "settings.roles.create",
  rolesUpdate: "settings.roles.update",
  permissionsRead: "settings.permissions.read",
  modulesRead: "settings.modules.read",
  modulesManage: "settings.modules.manage",
  auditRead: "settings.audit.read",
} as const;
