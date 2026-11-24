/** Aritmética de color mínima para las paletas de Huella: hex, HSL, mezcla y contraste WCAG. Funciones puras. */

export type Hsl = { h: number; s: number; l: number };

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Normaliza «#abc», «abc» o «#AABBCC» a «#aabbcc»; devuelve `null` si no es un color hexadecimal válido. */
export function normalizeHex(input: string): string | null {
  const match = HEX.exec(input.trim());
  if (!match) return null;
  let digits = match[1].toLowerCase();
  if (digits.length === 3) digits = [...digits].map((c) => c + c).join("");
  return `#${digits}`;
}

function toRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function fromRgb(r: number, g: number, b: number): string {
  const part = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function hexToHsl(hex: string): Hsl {
  const [r, g, b] = toRgb(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return fromRgb((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/** Mezcla `a` con `b`: `t = 0` es `a`, `t = 1` es `b`. */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = toRgb(a);
  const [br, bg, bb] = toRgb(b);
  return fromRgb(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

export function withHsl(hex: string, patch: Partial<Hsl>): string {
  return hslToHex({ ...hexToHsl(hex), ...patch });
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razón de contraste WCAG entre dos colores (1 a 21). */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Mueve la luminosidad de `fg` (hacia lo oscuro o lo claro) hasta que su contraste con todos los fondos llegue a `min`.
 * Conserva el tono y la saturación: solo cambia cuán claro u oscuro es.
 */
export function ensureContrast(fg: string, backgrounds: readonly string[], min: number, direction: "darker" | "lighter"): string {
  const step = direction === "darker" ? -0.005 : 0.005;
  let color = fg;
  for (let i = 0; i < 200; i += 1) {
    if (backgrounds.every((bg) => contrast(color, bg) >= min)) return color;
    const { h, s, l } = hexToHsl(color);
    const next = l + step;
    if (next < 0 || next > 1) break;
    color = hslToHex({ h, s, l: next });
  }
  return color;
}

/**
 * El tono que Pastel no usa (regla dura de diseño, `scripts/check-design.mjs`): HSL entre 235° y 345° con saturación
 * perceptible (≥ 12 %). Los grises azulados de baja saturación no cuentan. Se exige además un croma de al menos 3 %
 * (diferencia entre canales ≥ 8/255): un casi-blanco tiene saturación HSL alta solo por el redondeo del hexadecimal y a
 * la vista es neutro (croma ≈ 1 %), pero un lavanda claro real (croma ≈ 4 %) sí se rechaza.
 */
export function isPurple(hex: string): boolean {
  const { h, s } = hexToHsl(hex);
  const [r, g, b] = toRgb(hex);
  const chroma = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
  return s * 100 >= 12 && chroma >= 0.03 && h >= 235 && h <= 345;
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = toRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
