import { clamp, contrast, ensureContrast, hexToHsl, hslToHex, isPurple, mix, normalizeHex, rgba, withHsl } from "./color";

/**
 * Una paleta de Huella son CUATRO colores en tres niveles de jerarquía (Material 3 usa 5–6 colores clave; la regla
 * 60-30-10 pide una base dominante, un color secundario y un acento escaso):
 *   base     → `fondo` y `texto`: de ellos salen superficies, bordes y los tres niveles de texto (≈ 90 % de la pantalla);
 *   acento   → `acento`: lo que se puede hacer (botón principal, enlaces, pestaña activa, foco);
 *   realce   → `realce`: lo que está elegido (oferta de trabajo, chips, filtros activos).
 * Los estados (éxito, advertencia, error) NO se eligen: su color es significado, no decoración. Todo lo demás se
 * deriva aquí, en claro y en oscuro, con contraste WCAG AA garantizado y sin colores chillones.
 */
export const COLOR_KEYS = ["fondo", "texto", "acento", "realce"] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];
export type PaletteColors = Record<ColorKey, string>;
export type Tokens = Record<string, string>;
export type Mode = "light" | "dark";

export type CheckId = "textOnBg" | "mutedOnBg" | "onAccent" | "accentOnBg" | "controlBorder" | "selectedEdge" | "inkOnSelected";

export type Check = { id: CheckId; min: number; light: number; dark: number };

export type BuiltPalette = {
  light: Tokens;
  dark: Tokens;
  checks: readonly Check[];
  /** Los colores que de verdad se usan (en claro) tras el ajuste de comodidad y contraste. */
  resolved: PaletteColors;
  /** Tokens cuyo tono cae en el rango morado (debe estar vacío: regla dura de diseño). */
  purple: readonly string[];
};

/** Límites de comodidad: por encima de esto un color «encandila». */
const MAX_ACCENT_SATURATION = 0.55;
const MAX_BG_SATURATION = 0.3;

const STATES: Record<Mode, Tokens> = {
  light: {
    "--danger": "#b42318",
    "--danger-soft": "#fdecea",
    "--success": "#1d6b48",
    "--success-soft": "#e5f3ec",
    "--warning": "#8a5300",
    "--warning-soft": "#fdf1d8",
  },
  dark: {
    "--danger": "#ff8a80",
    "--danger-soft": "#3a1d1d",
    "--success": "#7fd1a6",
    "--success-soft": "#15301f",
    "--warning": "#f2c26b",
    "--warning-soft": "#3a2c12",
  },
};

type Derived = { tokens: Tokens; bg: string; edgeBg: string; text: string; muted: string; accent: string; onAccent: string; borderStrong: string; hlEdge: string; hl: string; surface: string };

function buildLight(c: PaletteColors): Derived {
  const bg0 = hexToHsl(c.fondo);
  const appBg = hslToHex({ h: bg0.h, s: Math.min(bg0.s, MAX_BG_SATURATION), l: clamp(bg0.l, 0.86, 0.96) });
  const bgL = hexToHsl(appBg).l;
  const surface = "#ffffff";
  const sunken = mix(appBg, surface, 0.65);
  const sidebar = withHsl(appBg, { l: bgL - 0.025 });

  const t0 = hexToHsl(c.texto);
  const text = ensureContrast(hslToHex({ h: t0.h, s: Math.min(t0.s, 0.25), l: Math.min(t0.l, 0.16) }), [appBg], 12, "darker");
  const textSecondary = ensureContrast(mix(text, appBg, 0.2), [appBg, surface], 8, "darker");
  const muted = ensureContrast(mix(text, appBg, 0.42), [appBg, sunken], 5.5, "darker");
  const border = withHsl(appBg, { l: bgL - 0.07 });
  const borderStrong = ensureContrast(withHsl(appBg, { s: Math.min(hexToHsl(appBg).s, 0.15), l: 0.6 }), [appBg, surface, sunken], 3.1, "darker");

  const a0 = hexToHsl(c.acento);
  const accent = ensureContrast(
    hslToHex({ h: a0.h, s: Math.min(a0.s, MAX_ACCENT_SATURATION), l: clamp(a0.l, 0.18, 0.45) }),
    [surface, appBg],
    5,
    "darker",
  );
  const accentStrong = withHsl(accent, { l: Math.max(0.1, hexToHsl(accent).l - 0.07) });
  const onAccent = contrast("#ffffff", accent) >= 4.5 ? "#ffffff" : text;

  const r0 = hexToHsl(c.realce);
  const hlEdge = ensureContrast(
    hslToHex({ h: r0.h, s: Math.min(r0.s, MAX_ACCENT_SATURATION), l: clamp(r0.l, 0.15, 0.5) }),
    [sunken, surface, appBg],
    3.1,
    "darker",
  );
  const hl = mix(hlEdge, surface, 0.84);

  const infoBase = withHsl(accent, { s: Math.min(a0.s, 0.2), l: 0.33 });
  const infoSoft = mix(infoBase, surface, 0.92);
  const info = ensureContrast(infoBase, [infoSoft, surface], 5.5, "darker");

  const tokens: Tokens = {
    "--app-bg": appBg,
    "--surface": surface,
    "--surface-raised": surface,
    "--surface-sunken": sunken,
    "--sidebar-bg": sidebar,
    "--text": text,
    "--text-secondary": textSecondary,
    "--muted": muted,
    "--border": border,
    "--border-strong": borderStrong,
    "--input": surface,
    "--accent": accent,
    "--accent-strong": accentStrong,
    "--accent-soft": mix(accent, surface, 0.88),
    "--accent-subtle": mix(accent, surface, 0.94),
    "--on-accent": onAccent,
    "--hl": hl,
    "--hl-soft": mix(hlEdge, surface, 0.92),
    "--hl-edge": hlEdge,
    "--hl-ink": text,
    "--info": info,
    "--info-soft": infoSoft,
    "--focus": rgba(accent, 0.38),
    "--shadow": `0 16px 40px ${rgba(text, 0.08)}`,
    "--shadow-soft": `0 1px 2px ${rgba(text, 0.06)}, 0 4px 14px ${rgba(text, 0.05)}`,
    "--shadow-bottom-nav": `0 -6px 20px ${rgba(text, 0.06)}`,
    ...STATES.light,
  };
  return { tokens, bg: appBg, edgeBg: appBg, text, muted, accent, onAccent, borderStrong, hlEdge, hl, surface };
}

function buildDark(c: PaletteColors): Derived {
  const bg0 = hexToHsl(c.fondo);
  const h = bg0.h;
  const s = clamp(bg0.s, 0.08, 0.25);
  const shade = (l: number) => hslToHex({ h, s, l });
  const appBg = shade(0.07);
  const sunken = shade(0.095);
  const surface = shade(0.105);
  const raised = shade(0.13);
  const grounds = [appBg, sunken, surface, raised];

  const t0 = hexToHsl(c.texto);
  const ts = Math.min(t0.s, 0.2);
  const text = hslToHex({ h: t0.h, s: ts, l: 0.93 });
  const textSecondary = hslToHex({ h: t0.h, s: ts, l: 0.82 });
  const muted = ensureContrast(hslToHex({ h: t0.h, s: ts, l: 0.7 }), [raised, surface], 5, "lighter");
  const borderStrong = ensureContrast(hslToHex({ h, s: Math.min(s, 0.15), l: 0.45 }), grounds, 3.1, "lighter");

  const a0 = hexToHsl(c.acento);
  const accent = ensureContrast(hslToHex({ h: a0.h, s: Math.min(a0.s, 0.45), l: 0.76 }), grounds, 7, "lighter");
  const onAccent = contrast(appBg, accent) >= 4.5 ? appBg : "#000000";

  const r0 = hexToHsl(c.realce);
  const hlEdge = ensureContrast(hslToHex({ h: r0.h, s: Math.min(r0.s, 0.4), l: 0.66 }), [surface, raised, sunken], 3.1, "lighter");
  const hl = hslToHex({ h: r0.h, s: Math.min(r0.s, 0.25), l: 0.19 });

  const infoSoft = hslToHex({ h: a0.h, s: Math.min(a0.s, 0.18), l: 0.14 });
  const info = ensureContrast(hslToHex({ h: a0.h, s: Math.min(a0.s, 0.2), l: 0.75 }), [infoSoft, surface], 5.5, "lighter");

  const tokens: Tokens = {
    "--app-bg": appBg,
    "--surface": surface,
    "--surface-raised": raised,
    "--surface-sunken": sunken,
    "--sidebar-bg": shade(0.085),
    "--text": text,
    "--text-secondary": textSecondary,
    "--muted": muted,
    "--border": shade(0.18),
    "--border-strong": borderStrong,
    "--input": shade(0.085),
    "--accent": accent,
    "--accent-strong": accent,
    "--accent-soft": hslToHex({ h: a0.h, s: Math.min(a0.s, 0.2), l: 0.16 }),
    "--accent-subtle": hslToHex({ h: a0.h, s: Math.min(a0.s, 0.18), l: 0.125 }),
    "--on-accent": onAccent,
    "--hl": hl,
    "--hl-soft": hslToHex({ h: r0.h, s: Math.min(r0.s, 0.22), l: 0.145 }),
    "--hl-edge": hlEdge,
    "--hl-ink": text,
    "--info": info,
    "--info-soft": infoSoft,
    "--focus": rgba(accent, 0.5),
    "--shadow": "0 18px 44px rgba(0, 0, 0, 0.35)",
    "--shadow-soft": "0 4px 18px rgba(0, 0, 0, 0.22)",
    "--shadow-bottom-nav": "0 -6px 22px rgba(0, 0, 0, 0.35)",
    ...STATES.dark,
  };
  return { tokens, bg: appBg, edgeBg: surface, text, muted, accent, onAccent, borderStrong, hlEdge, hl, surface };
}

const isHex = (value: string) => /^#[0-9a-f]{6}$/.test(value);

/** Genera todos los tokens de una paleta en claro y en oscuro, con las comprobaciones de contraste y de tono. */
export function buildPalette(colors: PaletteColors): BuiltPalette {
  const light = buildLight(colors);
  const dark = buildDark(colors);

  const row = (id: CheckId, min: number, measure: (d: Derived) => number): Check => ({
    id,
    min,
    light: measure(light),
    dark: measure(dark),
  });
  const checks = [
    row("textOnBg", 7, (d) => contrast(d.text, d.bg)),
    row("mutedOnBg", 4.5, (d) => contrast(d.muted, d.bg)),
    row("onAccent", 4.5, (d) => contrast(d.onAccent, d.accent)),
    row("accentOnBg", 4.5, (d) => contrast(d.accent, d.bg)),
    row("controlBorder", 3, (d) => contrast(d.borderStrong, d.edgeBg)),
    row("selectedEdge", 3, (d) => contrast(d.hlEdge, d.surface)),
    row("inkOnSelected", 7, (d) => contrast(d.text, d.hl)),
  ];

  const purple = [...Object.entries(light.tokens), ...Object.entries(dark.tokens)]
    .filter(([, value]) => isHex(value) && isPurple(value))
    .map(([name]) => name);

  const lt = light.tokens;
  return {
    light: lt,
    dark: dark.tokens,
    checks,
    resolved: { fondo: lt["--app-bg"], texto: lt["--text"], acento: lt["--accent"], realce: lt["--hl-edge"] },
    purple: [...new Set(purple)],
  };
}

export type ColorErrors = Partial<Record<ColorKey, "invalid" | "purple">>;

/** Normaliza los cuatro colores escritos por la persona; devuelve los errores por campo (hex inválido o tono morado). */
export function parseColors(input: Record<ColorKey, string>): { colors: PaletteColors | null; errors: ColorErrors } {
  const errors: ColorErrors = {};
  const colors = {} as PaletteColors;
  for (const key of COLOR_KEYS) {
    const hex = normalizeHex(input[key]);
    if (!hex) errors[key] = "invalid";
    else if (isPurple(hex)) errors[key] = "purple";
    else colors[key] = hex;
  }
  return Object.keys(errors).length > 0 ? { colors: null, errors } : { colors, errors };
}

/**
 * CSS de la paleta para `[data-module="huella"]`. Selector doblado: gana al bloque base de `module-themes.css` sin
 * depender del orden de las hojas; el oscuro lleva un nivel más para ganar también al claro de esta misma paleta. Solo
 * se escriben nombres fijos y colores hexadecimales validados, nunca texto de la persona.
 */
export function paletteCss(built: BuiltPalette): string {
  const block = (tokens: Tokens) =>
    Object.entries(tokens)
      .map(([name, value]) => `${name}:${value};`)
      .join("");
  const base = '[data-module="huella"][data-module="huella"]';
  return `${base}{${block(built.light)}}[data-theme="dark"] ${base},[data-theme="dark"]${base}{${block(built.dark)}}`;
}
