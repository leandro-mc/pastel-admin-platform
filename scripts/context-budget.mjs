#!/usr/bin/env node
// Mide cuánto contexto carga un agente según el tipo de tarea (tokens ≈ caracteres / 4; estimación).
// «Después»: la tabla de AGENTS.md §2 del árbol de trabajo (lee solo las secciones `§N` indicadas).
// «Antes»: la ruta de lectura previa a 2026-11-15 (AGENTS.md §1 de entonces), con los archivos de `--before`.
// Uso: node scripts/context-budget.mjs [--before <ref>]   (por defecto, 0cb5a8b: `dev` antes del cambio)
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const before = args.includes("--before") ? args[args.indexOf("--before") + 1] : "0cb5a8b";

const MODULES = [
  ["AGORA", "Agora", "agora"],
  ["BRISA", "Brisa", "brisa"],
  ["BALANCE", "Balance", "balance"],
  ["COSECHA", "Cosecha", "cosecha"],
  ["HUELLA", "Huella", "huella"],
];

const readNow = (path) =>
  existsSync(join(root, path)) ? readFileSync(join(root, path), "utf8") : null;
const readAt = (path) => {
  try {
    return execFileSync("git", ["show", `${before}:${path}`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
};

/** Texto de la sección `n` (p. ej. "4" o "9.4"): desde su encabezado hasta el siguiente de igual o mayor nivel. */
function section(text, n) {
  const lines = text.split("\n");
  const escaped = n.replace(/\./g, "\\.");
  const start = lines.findIndex((l) => new RegExp(`^#{2,6} ${escaped}(\\. | )`).test(l));
  if (start < 0) throw new Error(`No existe la sección ${n}`);
  const level = lines[start].match(/^#+/)[0].length;
  let end = lines.findIndex((l, i) => i > start && /^#+ /.test(l) && l.match(/^#+/)[0].length <= level);
  if (end < 0) end = lines.length;
  return lines.slice(start, end).join("\n");
}

const substitute = (path, [upper, pascal, lower]) =>
  path.replaceAll("<M>", path.startsWith("src/") ? pascal : upper).replaceAll("<m>", lower);

/** Caracteres de una lista de entradas `ruta [§N …]`. */
function measure(entries, read, mod) {
  let chars = 0;
  const missing = [];
  for (const entry of new Set(entries)) {
    const [rawPath, ...sections] = entry.split(/\s+/);
    const path = substitute(rawPath, mod);
    const text = read(path);
    if (text === null) {
      missing.push(path);
      continue;
    }
    chars += sections.length === 0 ? text.length : sections.reduce((sum, s) => sum + section(text, s.replace("§", "")).length, 0);
  }
  return { chars, missing };
}

// ── Rutas «después»: tabla de AGENTS.md §2 ──
const agents = readNow("AGENTS.md");
const table = section(agents, "2").split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| Tarea") && !l.startsWith("|---"));
const after = [];
for (const row of table) {
  const [, task, reads] = row.split("|").map((c) => c.trim());
  const files = [...reads.matchAll(/`([^`]+)`/g)].map((m) => m[1]).filter((f) => /\.md( |$)/.test(f));
  if (/^Unión/.test(reads)) {
    after.push({ task, files: [...new Set([...after.at(-2).files, ...after.at(-1).files])] });
  } else if (files.length > 0) {
    after.push({ task, files: ["AGENTS.md", ...files] });
  }
}

// ── Rutas «antes»: AGENTS.md §1 previo («README y AGENTS; PROGRESS; ARCHITECTURE y el área; el módulo; GIT_WORKFLOW y TESTING») ──
const base = ["README.md", "AGENTS.md", "docs/PROGRESS.md", "docs/ARCHITECTURE.md", "docs/GIT_WORKFLOW.md", "docs/TESTING.md"];
const ficha = "docs/modules/<M>.md";
const beforeRoutes = [
  [...base, "docs/ERROR_HANDLING_AND_LOGGING.md", ficha, "src/Modules/<M>/MODULE.md"],
  [...base, "docs/DESIGN_SYSTEM.md", ficha, "web/src/modules/<m>/MODULE.md"],
  [...base, "docs/ERROR_HANDLING_AND_LOGGING.md", "docs/DESIGN_SYSTEM.md", ficha, "src/Modules/<M>/MODULE.md", "web/src/modules/<m>/MODULE.md"],
  [...base, "docs/SECURITY.md", "docs/ERROR_HANDLING_AND_LOGGING.md"],
  [...base],
  [...base, "docs/DESIGN_SYSTEM.md"],
  [...base, "docs/OPERATIONS.md"],
  ["README.md", "AGENTS.md", "docs/PROGRESS.md", "docs/requirements/README.md", "docs/requirements/METODO-DE-TRABAJO.md"],
];

const tokens = (c) => Math.round(c / 4);
const rows = [];
let sumBefore = 0;
let sumAfter = 0;
after.forEach((route, i) => {
  const isModule = route.files.some((f) => f.includes("<M>") || f.includes("<m>"));
  const mods = isModule ? MODULES : [MODULES[0]];
  const avg = (entries, read) => {
    const results = mods.map((m) => measure(entries, read, m));
    for (const r of results) if (r.missing.length) throw new Error(`Faltan archivos: ${r.missing.join(", ")}`);
    return results.reduce((s, r) => s + r.chars, 0) / results.length;
  };
  const b = avg(beforeRoutes[i], readAt);
  const a = avg(route.files, readNow);
  sumBefore += b;
  sumAfter += a;
  rows.push(`| ${route.task} | ${tokens(b).toLocaleString("es-CR")} | ${tokens(a).toLocaleString("es-CR")} | −${Math.round((1 - a / b) * 100)} % |`);
});

console.log(`Contexto por tipo de tarea (tokens estimados = caracteres/4; módulos: promedio de los cinco). Antes: ${before}; después: árbol de trabajo.\n`);
console.log("| Tarea | Antes | Después | Cambio |\n|---|---:|---:|---:|");
console.log(rows.join("\n"));
console.log(`| **Promedio** | **${tokens(sumBefore / rows.length).toLocaleString("es-CR")}** | **${tokens(sumAfter / rows.length).toLocaleString("es-CR")}** | **−${Math.round((1 - sumAfter / sumBefore) * 100)} %** |`);

const always = (read, files) => files.reduce((s, f) => s + (read(f)?.length ?? 0), 0);
const fixedBefore = always(readAt, base);
const fixedAfter = always(readNow, ["AGENTS.md"]);
console.log(`\nLectura fija de toda tarea: antes ${tokens(fixedBefore).toLocaleString("es-CR")} (README, AGENTS, PROGRESS, ARCHITECTURE, GIT_WORKFLOW, TESTING); después ${tokens(fixedAfter).toLocaleString("es-CR")} (AGENTS).`);
