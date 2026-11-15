import type { ModuleManifest, ModuleNavItem } from "@/core/modules/types";
import { routes } from "../routes";
import { shellStrings } from "../strings";

/** Nombre con el que se identifica una app en el shell (Identity se presenta como «Pastel Workspace»). */
export function appName(module: ModuleManifest): string {
  return module.code === "identity" ? shellStrings.workspaceName : module.name;
}

export function matchesPath(pathname: string, basePath: string): boolean {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

/** Ítems que declara la app; si no declara ninguno, un único «Inicio» (un módulo sin navegación sigue siendo alcanzable). */
export function navItemsOf(module: ModuleManifest): readonly ModuleNavItem[] {
  return module.nav.length > 0
    ? module.nav
    : [{ label: shellStrings.home, to: "", icon: module.icon }];
}

/** Ítems que la persona puede ver. El servidor autoriza igualmente cada operación. */
export function visibleNavItems(
  module: ModuleManifest,
  hasPermission: (code: string) => boolean,
): readonly ModuleNavItem[] {
  return navItemsOf(module).filter(
    (item) =>
      !item.requiredPermission || hasPermission(item.requiredPermission),
  );
}

export function itemHref(module: ModuleManifest, item: ModuleNavItem): string {
  return item.to ? `${module.basePath}/${item.to}` : module.basePath;
}

/**
 * Ítem activo: el que tenga la coincidencia más específica. La raíz del módulo (`to: ""`) solo coincide exacta, para que
 * «Inicio» no quede activo en todas las subpáginas. `alsoActiveOn` aporta rutas de detalle declaradas por el módulo.
 */
export function activeNavItem(
  module: ModuleManifest,
  items: readonly ModuleNavItem[],
  pathname: string,
): ModuleNavItem | undefined {
  let best: ModuleNavItem | undefined;
  let bestLength = -1;
  for (const item of items) {
    const candidates: [string, boolean][] = [
      [item.to, item.to === ""],
      ...(item.alsoActiveOn ?? []).map((rel): [string, boolean] => [
        rel,
        rel === "",
      ]),
    ];
    for (const [rel, exact] of candidates) {
      const target = rel ? `${module.basePath}/${rel}` : module.basePath;
      const hit = exact ? pathname === target : matchesPath(pathname, target);
      if (hit && target.length > bestLength) {
        best = item;
        bestLength = target.length;
      }
    }
  }
  return best;
}

export type Crumb = { label: string; to?: string };
type CrumbHandle = { crumb?: string };

/**
 * Migas reales de la ruta: la sección activa y, si la página es un detalle, su miga. No repite el nombre de la app
 * (ya está en el selector). En un nivel plano queda solo la sección actual, sin enlace.
 */
export function buildTrail(input: {
  pathname: string;
  module: ModuleManifest | null;
  items: readonly ModuleNavItem[];
  matches: readonly { handle?: unknown }[];
}): Crumb[] {
  const { pathname, module, items, matches } = input;
  const account = shellStrings.account;
  if (pathname === routes.account) return [{ label: account.mine }];
  if (pathname === routes.password)
    return [
      { label: account.mine, to: routes.account },
      { label: account.security },
    ];
  if (!module) return [];

  const active = activeNavItem(module, items, pathname);
  const crumbs = matches
    .map((match) => (match.handle as CrumbHandle | undefined)?.crumb)
    .filter((label): label is string => Boolean(label))
    .filter((label) => label !== module.name && label !== active?.label);

  const trail: Crumb[] = [];
  if (active)
    trail.push({
      label: active.label,
      to: crumbs.length > 0 ? itemHref(module, active) : undefined,
    });
  for (const label of crumbs) trail.push({ label });
  return trail;
}

/** Cuántos destinos caben visibles en la barra inferior; con más, el resto va en «Más» (navegación mixta). */
export const BOTTOM_NAV_MAX = 5;
