import { createContext, useContext } from "react";
import type { Task } from "../api/schemas";

/** Lo que las pantallas de Brisa comparten: sus tareas, «hoy» y las acciones comunes (crear, abrir, marcar). */
export type BrisaContextValue = {
  /** Tareas propias no eliminadas. */
  tasks: Task[];
  today: string;
  zone: string;
  focusDate: string;
  setFocusDate: (date: string) => void;
  /** Abre el editor para una tarea nueva en el día indicado. */
  createFor: (date: string) => void;
  /** Abre el editor de una tarea existente. */
  edit: (task: Task) => void;
  /** Marca o reabre en un toque (con «Deshacer»). */
  toggle: (task: Task) => void;
  /** Tareas con un cambio en curso. */
  busyIds: ReadonlySet<string>;
};

export const BrisaContext = createContext<BrisaContextValue | null>(null);

export function useBrisa(): BrisaContextValue {
  const value = useContext(BrisaContext);
  if (!value) throw new Error("useBrisa debe usarse dentro de BrisaFrame.");
  return value;
}
