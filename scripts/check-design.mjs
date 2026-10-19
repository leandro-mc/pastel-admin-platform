#!/usr/bin/env node
// Guarda de diseño (docs/DESIGN_SYSTEM.md; FASE-0 §11 y §12.6). Uso: node scripts/check-design.mjs
// Falla (código 1) si encuentra en web/src o web/index.html:
//   1. Morado: color con tono HSL entre 235° y 345° (hexadecimal, rgb(), hsl()) o clases de Tailwind indigo/violet/purple/fuchsia/pink.
//   2. Símbolos de IA: iconos de lucide (Sparkles, Stars, Wand*, Bot*, Brain*, Cpu) o los emojis ✨ 🤖 🪄 🔮.
//   3. Colores sueltos: hexadecimales, rgb() o hsl() fuera de core/design/{tokens,module-themes}.css (y de las exenciones:
//      GoogleLogo.tsx y `<meta name="theme-color">`, que el navegador solo admite como valor literal).
//   4. `@apply` fuera de core/design/base.css.
// Heurística estática: no evalúa clases construidas dinámicamente ni valida el resultado visual.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

const repo = join(import.meta.dirname, "..");
const PURPLE_MIN = 235;
const PURPLE_MAX = 345;
/** Por debajo de esta saturación (%) el tono HSL no es perceptible y no se considera morado (grises azulados). */
const MIN_SATURATION = 12;

/** Archivos donde sí se definen valores de color. Todo lo demás debe usar tokens. */
const COLOR_DEFINITION_FILES = [
  "web/src/core/design/tokens.css",
  "web/src/core/design/module-themes.css",
];
/** Exenciones documentadas: colores de marca de terceros (la «G» de Google exige sus colores oficiales). */
const BRAND_EXEMPT_FILES = ["web/src/modules/identity/components/GoogleLogo.tsx"];
const APPLY_FILES = ["web/src/core/design/base.css"];

const AI_ICONS =
  /\b(Sparkles?|Stars?|Wand\d*|WandSparkles|Bot|BotMessageSquare|BotOff|Brain|BrainCircuit|BrainCog|Cpu)\b/;
const AI_EMOJI = /[✨🤖🪄🔮]/u;
const PURPLE_CLASS =
  /(?<![\w-])(?:[a-z-]+:)*(?:bg|text|border|ring|from|via|to|fill|stroke|outline|accent|decoration|shadow|divide|caret)-(?:indigo|violet|purple|fuchsia|pink)(?:-\d{2,3})?(?![\w-])/;
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g;
const FUNC_COLOR = /\b(rgba?|hsla?)\(\s*([^)]*)\)/gi;

function hexToHsl(hex) {
  let h = hex.slice(1);
  if (h.length <= 4) h = [...h].map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return rgbToHsl(r, g, b);
}

function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 };
}

/** Tono y saturación de `rgb()/hsl()`; `null` si usa variables u otra sintaxis que no se puede evaluar. */
function functionToHsl(name, args) {
  if (/var\(|calc\(|from\s/.test(args)) return null;
  const nums = args.match(/-?\d*\.?\d+/g)?.map(Number);
  if (!nums || nums.length < 3) return null;
  if (/^hsl/i.test(name)) return { h: ((nums[0] % 360) + 360) % 360, s: nums[1], l: nums[2] };
  const [r, g, b] = nums.slice(0, 3).map((n) => n / 255);
  return rgbToHsl(r, g, b);
}

const isPurple = ({ h, s }) => s >= MIN_SATURATION && h >= PURPLE_MIN && h <= PURPLE_MAX;

/** Analiza un archivo (ruta relativa a la raíz del repo, con «/») y devuelve sus hallazgos. */
export function scanSource(path, text) {
  const findings = [];
  const add = (line, rule, message) => findings.push({ path, line, rule, message });
  const isCss = path.endsWith(".css");
  const defines = COLOR_DEFINITION_FILES.includes(path);
  const brand = BRAND_EXEMPT_FILES.includes(path);

  text.split("\n").forEach((rawLine, index) => {
    const line = index + 1;
    const themeColorMeta = /<meta\s+name="theme-color"/.test(rawLine);
    // En CSS se ignoran los comentarios de bloque en la misma línea; en TS, los de línea.
    const code = isCss ? rawLine.replace(/\/\*.*?\*\//g, "") : rawLine.replace(/^\s*\/\/.*$/, "");
    if (!code.trim()) return;

    if (AI_EMOJI.test(code)) add(line, "ai-symbol", "Emoji de IA prohibido (✨ 🤖 🪄 🔮).");
    if (!isCss && AI_ICONS.test(code) && /lucide|import|<\w|icon/i.test(code))
      add(line, "ai-symbol", "Icono de IA prohibido (Sparkles, Stars, Wand*, Bot*, Brain*, Cpu). La marca es Flower2.");
    if (PURPLE_CLASS.test(code)) add(line, "purple", "Clase de Tailwind morada/violeta prohibida.");
    if (/@apply\b/.test(code) && !APPLY_FILES.includes(path))
      add(line, "apply", "`@apply` solo se permite en core/design/base.css.");

    for (const m of code.matchAll(HEX)) {
      if (isPurple(hexToHsl(m[0]))) add(line, "purple", `Color ${m[0]} con tono entre ${PURPLE_MIN}° y ${PURPLE_MAX}°.`);
      else if (!defines && !brand && !themeColorMeta) add(line, "loose-color", `Color suelto ${m[0]}: use un token (bg-accent, text-fg…).`);
    }
    for (const m of code.matchAll(FUNC_COLOR)) {
      const hsl = functionToHsl(m[1], m[2]);
      if (hsl && isPurple(hsl)) add(line, "purple", `Color ${m[0]} con tono entre ${PURPLE_MIN}° y ${PURPLE_MAX}°.`);
      else if (!defines && !brand && !themeColorMeta && !/^(rgba?|hsla?)\(\s*var\(/i.test(m[0]))
        add(line, "loose-color", `Color suelto ${m[0]}: use un token.`);
    }
  });
  return findings;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|css|html)$/.test(name)) out.push(full);
  }
  return out;
}

export function scanRepo(root = repo) {
  const files = [...walk(join(root, "web", "src")), join(root, "web", "index.html")];
  return files.flatMap((file) =>
    scanSource(relative(root, file).split(sep).join("/"), readFileSync(file, "utf8")),
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const findings = scanRepo();
  for (const f of findings) console.error(`${f.path}:${f.line} [${f.rule}] ${f.message}`);
  if (findings.length > 0) {
    console.error(`\ncheck-design: ${findings.length} hallazgo(s).`);
    process.exit(1);
  }
  console.log("check-design: sin hallazgos.");
}
