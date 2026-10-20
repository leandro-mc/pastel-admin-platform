import {
  LayoutGrid,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { routes } from "@/core/routes";
import { identityPermissions, settingsPaths } from "./paths";
import { settingsStrings } from "./settings/strings";
import { identityStrings } from "./strings";

const tabs = settingsStrings.tabs;

/**
 * Módulo de plataforma Identity: Configuración (`/configuracion/*`) y las pantallas de acceso que usa todo el shell
 * (`/ingresar`, `/cuenta`, `/cuenta/contrasena`). Siempre se incluye en el paquete.
 */
export default {
  code: "identity",
  name: identityStrings.module.name,
  tagline: identityStrings.module.tagline,
  icon: Settings,
  order: 900,
  basePath: settingsPaths.root,
  access: "permission",
  // Solo cuentas con el permiso explícito de Workspace entran al espacio global; cada pestaña exige el suyo.
  requiredAnyPermission: [identityPermissions.workspaceAccess],
  nav: [
    {
      label: tabs.users,
      to: "usuarios",
      icon: Users,
      requiredPermission: identityPermissions.usersRead,
    },
    {
      label: tabs.roles,
      to: "roles",
      icon: ShieldCheck,
      requiredPermission: identityPermissions.rolesRead,
    },
    {
      label: tabs.modules,
      to: "modulos",
      icon: LayoutGrid,
      requiredPermission: identityPermissions.modulesRead,
    },
    {
      label: tabs.audit,
      to: "auditoria",
      icon: ScrollText,
      requiredPermission: identityPermissions.auditRead,
    },
  ],
  routes: [
    { index: true, lazy: () => import("./settings/SettingsIndex") },
    {
      path: "usuarios",
      crumb: tabs.users,
      lazy: () => import("./settings/UsersPage"),
    },
    {
      path: "roles",
      crumb: tabs.roles,
      lazy: () => import("./settings/RolesPage"),
    },
    {
      path: "modulos",
      crumb: tabs.modules,
      lazy: () => import("./settings/ModulesPage"),
    },
    {
      path: "auditoria",
      crumb: tabs.audit,
      lazy: () => import("./settings/AuditPage"),
    },
    {
      path: "accesos/usuario/:userId",
      crumb: settingsStrings.access.crumb,
      lazy: () => import("./settings/UserAccessPage"),
    },
    {
      path: "accesos/rol/:roleId",
      crumb: settingsStrings.access.crumb,
      lazy: () => import("./settings/RoleAccessPage"),
    },
  ],
  platformRoutes: [
    {
      path: routes.login,
      session: false,
      lazy: () => import("./pages/LoginPage"),
    },
    {
      path: routes.account,
      session: true,
      lazy: () => import("./pages/AccountPage"),
    },
    {
      path: routes.password,
      session: true,
      lazy: () => import("./pages/ChangePasswordPage"),
    },
  ],
} satisfies ModuleManifest;
