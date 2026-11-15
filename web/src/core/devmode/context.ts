import { createContext, useContext } from "react";
import type { DeveloperRole } from "./simulation";

export type DeveloperRolesState = {
  status: "idle" | "loading" | "ready" | "error";
  items: readonly DeveloperRole[];
  retry: () => void;
};

export type DevModeValue = {
  /** La cuenta real tiene el permiso del modo desarrollador. */
  enabled: boolean;
  /** Aplicación de la ruta actual (sin importar si la persona puede entrar de verdad). */
  activeApp: string | null;
  roles: DeveloperRolesState;
  /** Rol elegido para la app activa: nombre, `NO_ROLE` o `null` (acceso real). */
  selected: string | null;
  /** Hay una vista previa aplicada a la interfaz. */
  simulating: boolean;
  /** Elige un rol de la app activa; `null` vuelve al acceso real. */
  select: (role: string | null) => void;
};

export const DISABLED: DevModeValue = {
  enabled: false,
  activeApp: null,
  roles: { status: "idle", items: [], retry: () => undefined },
  selected: null,
  simulating: false,
  select: () => undefined,
};

export const DevModeContext = createContext<DevModeValue>(DISABLED);

/** Estado del modo desarrollador. Fuera del proveedor equivale a «deshabilitado». */
export function useDevMode(): DevModeValue {
  return useContext(DevModeContext);
}
