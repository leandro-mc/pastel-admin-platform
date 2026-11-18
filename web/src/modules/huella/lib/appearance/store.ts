import { useSyncExternalStore } from "react";
import { z } from "zod";
import { log } from "@/core/log";
import { buildPalette, paletteCss } from "./palette";
import { DEFAULT_PALETTE_ID, PRESETS, type PaletteDef } from "./presets";

/**
 * Apariencia de Huella: qué paleta se usa y las paletas propias. Es una preferencia visual del dispositivo (como el tema
 * claro/oscuro del shell, `core/preferences`): vive en `localStorage`, sin datos sensibles y sin pasar por el servidor.
 * La hoja de estilos se aplica con el CSSOM, no con un `<style>` de texto, porque la CSP del servidor es `style-src 'self'`.
 */

const KEY = "pastel-huella-apariencia";
const SHEET_ID = "huella-apariencia";
export const MAX_CUSTOM = 6;
export const MAX_NAME = 30;

const hex = z.string().regex(/^#[0-9a-f]{6}$/);
const customSchema = z.object({
  id: z.string().regex(/^c-[a-z0-9]{4,12}$/),
  name: z.string().trim().min(1).max(MAX_NAME),
  colors: z.object({ fondo: hex, texto: hex, acento: hex, realce: hex }),
});
const storedSchema = z.object({
  selected: z.string().max(20),
  custom: z.array(customSchema).max(MAX_CUSTOM),
});

export type CustomPalette = z.infer<typeof customSchema>;
export type AppearanceState = z.infer<typeof storedSchema>;

const INITIAL: AppearanceState = { selected: DEFAULT_PALETTE_ID, custom: [] };

function load(): AppearanceState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return INITIAL;
    const parsed = storedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : INITIAL;
  } catch {
    // Almacenamiento bloqueado o contenido dañado: se usa la paleta base.
    return INITIAL;
  }
}

function persist(state: AppearanceState): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch (error) {
    log.warn("No se pudo guardar la apariencia", error);
  }
}

export function allPalettes(state: AppearanceState): PaletteDef[] {
  return [
    ...PRESETS,
    ...state.custom.map((p) => ({ id: p.id, name: p.name, description: "", colors: p.colors, builtIn: false })),
  ];
}

/** La paleta en uso; si la elegida ya no existe, la base. */
export function activePalette(state: AppearanceState): PaletteDef {
  const all = allPalettes(state);
  return all.find((p) => p.id === state.selected) ?? all[0];
}

// --- Hoja de estilos (CSSOM) -------------------------------------------------------------------------------------

let adopted: CSSStyleSheet | null = null;
let fallback: HTMLStyleElement | null = null;

function applySheet(css: string | null): void {
  if (typeof document === "undefined") return;
  try {
    if ("adoptedStyleSheets" in document && typeof CSSStyleSheet !== "undefined" && "replaceSync" in CSSStyleSheet.prototype) {
      const others = document.adoptedStyleSheets.filter((s) => s !== adopted);
      if (css === null) {
        adopted = null;
        document.adoptedStyleSheets = others;
        return;
      }
      adopted ??= new CSSStyleSheet();
      adopted.replaceSync(css);
      document.adoptedStyleSheets = [...others, adopted];
      return;
    }
    // Navegadores sin hojas construibles: un <style> vacío y reglas por CSSOM (no cuenta como estilo en línea).
    if (css === null) {
      fallback?.remove();
      fallback = null;
      return;
    }
    if (!fallback) {
      fallback = document.createElement("style");
      fallback.id = SHEET_ID;
      document.head.appendChild(fallback);
    }
    const sheet = fallback.sheet;
    if (!sheet) return;
    while (sheet.cssRules.length > 0) sheet.deleteRule(0);
    // El CSS generado son dos reglas; se inserta cada una por separado.
    for (const rule of splitRules(css)) sheet.insertRule(rule, sheet.cssRules.length);
  } catch (error) {
    log.warn("No se pudo aplicar la paleta", error);
  }
}

function splitRules(css: string): string[] {
  const rules: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        rules.push(css.slice(start, i + 1));
        start = i + 1;
      }
    }
  }
  return rules;
}

/** Construye la paleta en uso y la aplica; la base (o una paleta que falle la regla del morado) quita el ajuste. */
function applyActive(state: AppearanceState): void {
  const palette = activePalette(state);
  if (palette.id === DEFAULT_PALETTE_ID) {
    applySheet(null);
    return;
  }
  const built = buildPalette(palette.colors);
  applySheet(built.purple.length > 0 ? null : paletteCss(built));
}

// --- Estado compartido -------------------------------------------------------------------------------------------

let state: AppearanceState = typeof window === "undefined" ? INITIAL : load();
const listeners = new Set<() => void>();

function commit(next: AppearanceState): void {
  state = next;
  persist(next);
  applyActive(next);
  listeners.forEach((listener) => listener());
}

/** Aplica la paleta guardada al arrancar (antes del primer pintado) y sigue los cambios hechos en otra pestaña. */
export function startAppearance(): void {
  if (typeof window === "undefined") return;
  applyActive(state);
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY) return;
    state = load();
    applyActive(state);
    listeners.forEach((listener) => listener());
  });
}

export const appearance = {
  select(id: string): void {
    if (allPalettes(state).some((p) => p.id === id)) commit({ ...state, selected: id });
  },
  /** Crea o actualiza una paleta propia y pasa a usarla. Devuelve su id, o `null` si ya hay `MAX_CUSTOM`. */
  saveCustom(palette: { id?: string; name: string; colors: CustomPalette["colors"] }): string | null {
    const name = palette.name.trim().slice(0, MAX_NAME);
    if (palette.id && state.custom.some((p) => p.id === palette.id)) {
      const id = palette.id;
      commit({
        selected: id,
        custom: state.custom.map((p) => (p.id === id ? { id, name, colors: palette.colors } : p)),
      });
      return id;
    }
    if (state.custom.length >= MAX_CUSTOM) return null;
    const id = `c-${Math.random().toString(36).slice(2, 10).padEnd(4, "0")}`;
    commit({ selected: id, custom: [...state.custom, { id, name, colors: palette.colors }] });
    return id;
  },
  removeCustom(id: string): void {
    commit({
      selected: state.selected === id ? DEFAULT_PALETTE_ID : state.selected,
      custom: state.custom.filter((p) => p.id !== id),
    });
  },
};

export function useAppearance(): AppearanceState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => INITIAL,
  );
}
