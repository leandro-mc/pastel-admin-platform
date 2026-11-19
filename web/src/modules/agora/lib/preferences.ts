import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Preferencias de lectura guardadas solo en este navegador (persona anónima): modo calma y categorías seguidas.
 * No son datos personales ni credenciales; si el almacenamiento no está disponible, la pantalla funciona igual.
 */
const CALM_KEY = "agora.calm";
const FOLLOW_KEY = "agora.follow";
const CHANGE_EVENT = "agora:preferences";

function read(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento: el cambio vale solo para esta visita.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

/** Modo calma (AG-CAL-01): oculta la actualidad y deja solo lo esencial. */
export function useCalmMode(): [boolean, (value: boolean) => void] {
  const raw = useSyncExternalStore(subscribe, () => read(CALM_KEY), () => "");
  const set = useCallback((value: boolean) => write(CALM_KEY, value ? "1" : ""), []);
  return [raw === "1", set];
}

function parseList(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw || "[]");
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

/** Categorías seguidas por una persona anónima (en este navegador). */
export function useLocalFollows(): [string[], (slug: string) => void] {
  const raw = useSyncExternalStore(subscribe, () => read(FOLLOW_KEY), () => "");
  const list = useMemo(() => parseList(raw), [raw]);
  const toggle = useCallback((slug: string) => {
    const current = parseList(read(FOLLOW_KEY));
    const next = current.includes(slug)
      ? current.filter((item) => item !== slug)
      : [...current, slug];
    write(FOLLOW_KEY, JSON.stringify(next));
  }, []);
  return [list, toggle];
}
