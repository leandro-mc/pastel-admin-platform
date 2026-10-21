import { modules } from "virtual:pastel-modules";
import { useAuth } from "@/core/auth";
import type { ModuleManifest } from "./types";

export const allModules: readonly ModuleManifest[] = [...modules].sort(
  (a, b) =>
    (a.order ?? 1000) - (b.order ?? 1000) || a.code.localeCompare(b.code),
);
export const productModules: readonly ModuleManifest[] = allModules.filter(
  (m) => m.code !== "identity",
);
export const soleProductModule: ModuleManifest | null =
  productModules.length === 1 ? productModules[0]! : null;

type Access = {
  isAuthenticated: boolean;
  hasPermission: (code: string) => boolean;
};
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
export function useAccessibleModules(): readonly ModuleManifest[] {
  const { status, hasPermission } = useAuth();
  return allModules.filter((m) =>
    canAccess(m, {
      isAuthenticated: status === "authenticated",
      hasPermission,
    }),
  );
}
const LAST_APP_KEY_PREFIX = "pastel-last-app";
export function rememberCurrentApp(
  pathname: string,
  userId: string,
  accessibleBasePaths: readonly string[],
): void {
  if (!userId) return;
  const active = productModules.find(
    (m) => pathname === m.basePath || pathname.startsWith(m.basePath + "/"),
  );
  if (!active || !accessibleBasePaths.includes(active.basePath)) return;
  try {
    window.localStorage.setItem(
      `${LAST_APP_KEY_PREFIX}:${userId}`,
      active.basePath,
    );
  } catch {
    /* Optional preference. */
  }
}
export function getRememberedAppPath(
  userId: string,
  accessibleBasePaths: readonly string[] = productModules.map(
    (m) => m.basePath,
  ),
): string | null {
  if (!userId) return null;
  try {
    const saved = window.localStorage.getItem(
      `${LAST_APP_KEY_PREFIX}:${userId}`,
    );
    return (
      productModules.find(
        (m) => m.basePath === saved && accessibleBasePaths.includes(m.basePath),
      )?.basePath ?? null
    );
  } catch {
    return null;
  }
}
