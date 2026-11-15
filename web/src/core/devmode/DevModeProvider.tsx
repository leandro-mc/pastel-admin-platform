import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router";
import { AuthContext, useAuth, type AuthContextValue } from "@/core/auth";
import { DevModeContext, type DevModeValue } from "./context";
import { useDeveloperRoles } from "./queries";
import {
  DEVELOPER_MODE_PERMISSION,
  NO_ROLE,
  applySimulation,
  clearSelection,
  readSelection,
  writeSelection,
  type Selection,
} from "./simulation";

const NONE: Selection = {};

type Props = {
  children: ReactNode;
  /** Código de la app que corresponde a una ruta. Lo aporta el shell; este núcleo no conoce los módulos. */
  resolveApp: (pathname: string) => string | null;
};

/**
 * Vista previa por rol, transversal. Va dentro de `AuthProvider` y del router, por encima de las guardas.
 *
 * - Solo existe para cuentas con `platform.developer.mode`; el servidor lo vuelve a exigir al pedir los roles.
 * - Reemplaza **solo para dibujar** la porción de permisos de la app activa: `useAuth()` entrega el conjunto
 *   simulado, así que navegación, guardas y acciones de cualquier módulo lo heredan sin conocerlo.
 * - No envía nada al servidor: ninguna petición lleva el rol simulado. La autorización sigue siendo real.
 * - Guarda en `sessionStorage` (por pestaña y por cuenta) solo nombres de rol, nunca permisos.
 */
export function DevModeProvider({ children, resolveApp }: Props) {
  const real = useAuth();
  const { pathname } = useLocation();
  const userId = real.user?.id ?? null;
  const enabled =
    real.status === "authenticated" &&
    userId !== null &&
    real.hasPermission(DEVELOPER_MODE_PERMISSION);
  const activeApp = enabled ? resolveApp(pathname) : null;

  // `sessionStorage` es la única fuente de verdad; `version` fuerza la relectura tras cada cambio.
  const [version, setVersion] = useState(0);
  const selection = useMemo<Selection>(
    () => (enabled && userId ? readSelection(userId) : NONE),
    // `version` no se lee dentro: solo invalida la memoización para releer el almacenamiento.
    [enabled, userId, version],
  );
  const selected = activeApp ? (selection[activeApp] ?? null) : null;

  const roles = useDeveloperRoles(activeApp, enabled);
  const { isError, isPending, refetch } = roles;
  const rolesData = roles.data;
  const chosen =
    selected === null || selected === NO_ROLE
      ? undefined
      : rolesData?.roles.find((role) => role.name === selected);

  const change = useCallback(
    (app: string, role: string | null) => {
      if (!userId) return;
      const next: Record<string, string> = { ...readSelection(userId) };
      if (role === null) delete next[app];
      else next[app] = role;
      writeSelection(userId, next);
      setVersion((current) => current + 1);
    },
    [userId],
  );

  const select = useCallback(
    (role: string | null) => {
      if (activeApp) change(activeApp, role);
    },
    [activeApp, change],
  );

  // Una elección que ya no existe (rol renombrado o eliminado) se descarta en vez de dejar la interfaz vacía.
  useEffect(() => {
    if (
      activeApp &&
      selected !== null &&
      selected !== NO_ROLE &&
      rolesData &&
      !chosen
    )
      change(activeApp, null);
  }, [activeApp, selected, rolesData, chosen, change]);

  // La elección no sobrevive a cerrar sesión ni a perder el permiso.
  const lastUser = useRef<string | null>(null);
  useEffect(() => {
    if (userId) lastUser.current = userId;
    const loggedOut = real.status === "anonymous";
    const lostPermission = real.status === "authenticated" && !enabled;
    if ((loggedOut || lostPermission) && lastUser.current) {
      clearSelection(lastUser.current);
      if (loggedOut) lastUser.current = null;
    }
  }, [userId, real.status, enabled]);

  const resolving =
    enabled && selected !== null && !rolesData && roles.isPending;
  const applied =
    enabled && selected !== null && rolesData !== undefined
      ? selected === NO_ROLE
        ? applySimulation(real.permissions, rolesData.appPermissions, [])
        : chosen
          ? applySimulation(
              real.permissions,
              rolesData.appPermissions,
              chosen.permissions,
            )
          : null
      : null;

  const auth = useMemo<AuthContextValue>(
    () =>
      applied
        ? {
            ...real,
            permissions: applied,
            hasPermission: (c) => applied.has(c),
          }
        : real,
    [real, applied],
  );

  const value = useMemo<DevModeValue>(
    () => ({
      enabled,
      activeApp,
      roles: {
        status:
          !enabled || activeApp === null
            ? "idle"
            : isError
              ? "error"
              : isPending
                ? "loading"
                : "ready",
        items: rolesData?.roles ?? [],
        retry: () => void refetch(),
      },
      selected: applied ? selected : null,
      simulating: applied !== null,
      select,
    }),
    [
      enabled,
      activeApp,
      isError,
      isPending,
      refetch,
      rolesData,
      applied,
      selected,
      select,
    ],
  );

  return (
    <DevModeContext.Provider value={value}>
      <AuthContext.Provider value={auth}>
        {resolving ? (
          <div
            role="status"
            aria-busy="true"
            className="grid min-h-screen place-items-center bg-app text-fg-secondary"
          >
            Cargando la vista previa…
          </div>
        ) : (
          children
        )}
      </AuthContext.Provider>
    </DevModeContext.Provider>
  );
}
