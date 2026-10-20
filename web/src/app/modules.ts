import { modules } from "virtual:pastel-modules";
import { useAuth } from "@/core/auth";
import type { ModuleManifest } from "@/core/modules/types";

/** Módulos del paquete en orden de presentación (el hub y el selector usan este orden). */
export const allModules: readonly ModuleManifest[] = [...modules].sort(
  (a, b) =>
    (a.order ?? 1000) - (b.order ?? 1000) || a.code.localeCompare(b.code),
);

/** Subaplicaciones de producto: todo lo que no es el módulo de plataforma Identity (Configuración). */
export const productModules: readonly ModuleManifest[] = allModules.filter(
  (m) => m.code !== "identity",
);

/** Con un solo módulo de producto en el paquete, `/` entra directo a él y el shell adopta su marca. */
export const soleProductModule: ModuleManifest | null =
  productModules.length === 1 ? productModules[0]! : null;

type Access = {
  isAuthenticated: boolean;
  hasPermission: (code: string) => boolean;
};

/** Decide si el módulo se ofrece a esta persona. Es solo presentación: el servidor siempre autoriza. */
export function canAccess(
  module: ModuleManifest,
  { isAuthenticated, hasPermission }: Access,
): boolean {
  if (module.access === "public") return true;
  if (!isAuthenticated) return false;
  if (module.access === "authenticated") return true;
  if (module.requiredAnyPermission)
    return module.requiredAnyPermission.some(hasPermission);
  return module.requiredPermission
    ? hasPermission(module.requiredPermission)
    : false;
}

/** Módulos que la persona actual puede ver, en orden. */
export function useAccessibleModules(): readonly ModuleManifest[] {
  const { status, hasPermission } = useAuth();
  const access = { isAuthenticated: status === "authenticated", hasPermission };
  return allModules.filter((m) => canAccess(m, access));
}


const LAST_APP_KEY_PREFIX = "pastel-last-app";

/**
 * Recuerda solo el inicio de una app de producto conocida y accesible para esta cuenta.
 * El valor se guarda por usuario en este navegador; no guarda rutas arbitrarias ni Workspace.
 */
export function rememberCurrentApp(
  pathname: string,
  userId: string,
  accessibleBasePaths: readonly string[],
): void {
  if (!userId) return;

  const active = productModules.find(
    (module) =>
      pathname === module.basePath || pathname.startsWith(module.basePath + "/"),
  );
  if (!active || !accessibleBasePaths.includes(active.basePath)) return;

  try {
    window.localStorage.setItem(
      `${LAST_APP_KEY_PREFIX}:${userId}`,
      active.basePath,
    );
  } catch {
    // Las preferencias no sensibles pueden no estar disponibles en navegación privada.
  }
}

/** Raíz de la última app accesible de esa cuenta; nunca devuelve un valor arbitrario del almacenamiento. */
export function getRememberedAppPath(userId: string): string | null {
  if (!userId) return null;
  try {
    const saved = window.localStorage.getItem(`${LAST_APP_KEY_PREFIX}:${userId}`);
    return productModules.find((module) => module.basePath === saved)?.basePath ?? null;
  } catch {
    return null;
  }
}
