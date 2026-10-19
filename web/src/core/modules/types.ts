import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

/** Cómo se decide si una persona ve el módulo en el hub y puede entrar. */
export type ModuleAccess = "public" | "authenticated" | "permission";

export type ModuleNavItem = {
  label: string;
  /** Ruta relativa a `basePath`; cadena vacía para la raíz del módulo. */
  to: string;
  icon: LucideIcon;
};

/** Ruta de módulo. `lazy` devuelve un módulo que exporta `Component` (convención de React Router en modo datos). */
export type ModuleRoute = {
  index?: boolean;
  path?: string;
  lazy: () => Promise<{ Component: ComponentType }>;
};

/** Contrato de `web/src/modules/<codigo>/manifest.ts` (ver `docs/ARCHITECTURE.md` 9.3). WP7 lo consume desde `virtual:pastel-modules`. */
export type ModuleManifest = {
  code: string;
  name: string;
  tagline: string;
  icon: LucideIcon;
  basePath: string;
  access: ModuleAccess;
  /** Permiso que habilita el módulo en el hub y el router (p. ej. `cosecha.access`). */
  requiredPermission?: string;
  nav: ModuleNavItem[];
  routes: ModuleRoute[];
};
