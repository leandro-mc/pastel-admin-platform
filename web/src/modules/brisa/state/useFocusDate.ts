import { useCallback, useState } from "react";
import { log } from "@/core/log";
import { isIsoDate } from "../domain/dates";

const KEY = "brisa.focusDate";

type Saved = { date: string; savedOn: string };

function read(): Saved | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      "date" in value &&
      "savedOn" in value &&
      typeof value.date === "string" &&
      typeof value.savedOn === "string"
    ) {
      return { date: value.date, savedOn: value.savedOn };
    }
  } catch {
    // Almacenamiento bloqueado o valor dañado: se empieza en hoy.
  }
  return null;
}

/**
 * Día enfocado de la Semana. Sobrevive a una recarga (inventario §13.6, Q18) sin poner datos en la URL; en un día nuevo
 * se vuelve a empezar en hoy, para no abrir la app en un día que ya pasó.
 */
export function useFocusDate(today: string): [string, (date: string) => void] {
  const [saved, setSaved] = useState<Saved | null>(read);
  const focus =
    saved && saved.savedOn === today && isIsoDate(saved.date)
      ? saved.date
      : today;

  const setFocus = useCallback(
    (date: string) => {
      const next = { date, savedOn: today };
      setSaved(next);
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch (error) {
        log.warn("No se pudo guardar el día enfocado", error);
      }
    },
    [today],
  );

  return [focus, setFocus];
}
