/**
 * Vista previa por rol (modo desarrollador): lógica pura, sin React ni red.
 *
 * Todo lo de este archivo es presentación. Nada de lo que calcula sale hacia el servidor: la autorización real
 * se decide siempre con la sesión real. Ver `docs/design/SHELL_RESEARCH.md` §6 y `docs/SECURITY.md`.
 */

/** Permiso que habilita el modo (el servidor lo valida en cada petición al endpoint de roles). */
export const DEVELOPER_MODE_PERMISSION = "platform.developer.mode";

/** Valor interno de «sin rol en esta aplicación». No coincide con ningún nombre de rol real. */
export const NO_ROLE = "__sin_rol__";

export type DeveloperRole = {
  name: string;
  description: string | null;
  isSystemRole: boolean;
  /** Permisos del rol dentro de la aplicación consultada. */
  permissions: readonly string[];
};

/** Elecciones por aplicación: `{ brisa: "Brisa — Usuario" }`. Solo nombres, nunca permisos. */
export type Selection = Readonly<Record<string, string>>;

/**
 * Permisos con los que se dibuja la interfaz durante la vista previa: se reemplaza únicamente la porción de la app
 * activa (`reales − permisos de la app + permisos del rol`). El resto de la plataforma queda como es. Los permisos
 * del rol que no pertenezcan a la app se descartan, así una respuesta inesperada no puede añadir nada más.
 */
export function applySimulation(
  real: ReadonlySet<string>,
  appPermissions: readonly string[],
  rolePermissions: readonly string[],
): ReadonlySet<string> {
  const slice = new Set(appPermissions);
  const next = new Set<string>();
  for (const code of real) {
    if (!slice.has(code)) next.add(code);
  }
  for (const code of rolePermissions) {
    if (slice.has(code)) next.add(code);
  }
  return next;
}

type AppPath = { code: string; basePath: string };

/** Código de la aplicación que corresponde a una ruta, sin importar si la persona puede entrar de verdad. */
export function appCodeForPath(
  pathname: string,
  apps: readonly AppPath[],
): string | null {
  const match = apps
    .filter(
      (app) =>
        pathname === app.basePath || pathname.startsWith(`${app.basePath}/`),
    )
    .sort((a, b) => b.basePath.length - a.basePath.length)[0];
  return match?.code ?? null;
}

const STORAGE_PREFIX = "pastel-devmode";
const storageKey = (userId: string) => `${STORAGE_PREFIX}:${userId}`;

/** Lee la elección guardada de esta pestaña. Cualquier dato inesperado se descarta. */
export function readSelection(userId: string): Selection {
  try {
    const raw = window.sessionStorage.getItem(storageKey(userId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
      return {};
    const clean: Record<string, string> = {};
    for (const [app, role] of Object.entries(parsed)) {
      if (typeof role === "string" && role.length > 0) clean[app] = role;
    }
    return clean;
  } catch {
    return {};
  }
}

export function writeSelection(userId: string, selection: Selection): void {
  try {
    if (Object.keys(selection).length === 0) {
      window.sessionStorage.removeItem(storageKey(userId));
    } else {
      window.sessionStorage.setItem(
        storageKey(userId),
        JSON.stringify(selection),
      );
    }
  } catch {
    /* Sin almacenamiento la vista previa dura solo hasta recargar. */
  }
}

export function clearSelection(userId: string): void {
  writeSelection(userId, {});
}
