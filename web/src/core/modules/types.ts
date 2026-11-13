import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

/** Cómo se decide si una persona ve el módulo en el hub y puede entrar. */
export type ModuleAccess = "public" | "authenticated" | "permission";

export type ModuleNavItem = {
  label: string;
  /** Ruta relativa a `basePath`; cadena vacía para la raíz del módulo. */
  to: string;
  icon: LucideIcon;
  /** Si se indica, el ítem solo se ofrece a quien tenga este permiso (el servidor autoriza igual). */
  requiredPermission?: string;
  /**
   * Rutas relativas a `basePath` (por prefijo) que también marcan este ítem como activo, p. ej. una pantalla de detalle
   * que cuelga de otra sección. `""` es la raíz exacta del módulo. Así el shell no necesita conocer el interior del módulo.
   */
  alsoActiveOn?: readonly string[];
  /**
   * Encabezado de grupo opcional (p. ej. «Personas»). Solo se muestra si hay al menos dos grupos; los ítems sin grupo
   * van primero. Sin esta propiedad el menú es una lista plana, que es lo recomendable para pocos destinos.
   */
  group?: string;
};

/** Ruta de módulo. `lazy` devuelve un módulo que exporta `Component` (convención de React Router en modo datos). */
export type ModuleRoute = {
  index?: boolean;
  path?: string;
  /** Texto de la miga de pan de esta ruta (p. ej. «Usuarios»). Sin valor, no aporta miga. */
  crumb?: string;
  lazy: () => Promise<{ Component: ComponentType }>;
};

/**
 * Ruta de plataforma que aporta un módulo (solo Identity: `/ingresar`, `/cuenta`…). Es absoluta, no cuelga de `basePath`.
 * `session: true` la envuelve en `RequireAuth`; `false` es pública.
 */
export type PlatformRoute = {
  path: string;
  session: boolean;
  lazy: ModuleRoute["lazy"];
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
  /** Alternativa a `requiredPermission`: basta con tener uno de estos permisos (p. ej. Configuración). */
  requiredAnyPermission?: readonly string[];
  /** Posición en el hub y en el selector (menor primero). Sin valor, va al final. */
  order?: number;
  nav: ModuleNavItem[];
  routes: ModuleRoute[];
  /** Rutas fuera de `basePath` que el router monta tal cual. Solo las usa el módulo de plataforma Identity. */
  platformRoutes?: PlatformRoute[];
};
