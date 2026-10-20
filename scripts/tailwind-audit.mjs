#!/usr/bin/env node
// Auditoría de la migración a Tailwind (FASE-0 §11.1). Uso: node scripts/tailwind-audit.mjs [--json]
// Mide: atributos className, utilidades en JSX, clases semánticas definidas en CSS (y cuántas se usan una sola vez),
// líneas de CSS y de @apply, clases definidas sin uso y archivos CSS de más de 400 líneas.
// Es una heurística estática: no ejecuta la app ni interpreta clases construidas dinámicamente.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(import.meta.dirname, "..", "web", "src");

function walk(dir, exts, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, exts, out);
    else if (exts.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

/** Literales de cadena dentro de un fragmento (comillas simples, dobles o plantillas); `${…}` se descarta. */
function stringsIn(fragment) {
  const found = [];
  const re = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\]*(?:\\.[^`\\]*)*)`/g;
  for (const m of fragment.matchAll(re))
    found.push((m[1] ?? m[2] ?? m[3] ?? "").replace(/\$\{[^}]*\}/g, " "));
  return found;
}

/** Cada atributo className del JSX → lista de tokens. */
function classAttributes(source) {
  const attrs = [];
  for (const m of source.matchAll(/className=/g)) {
    let i = m.index + "className=".length;
    let fragment = "";
    if (source[i] === '"') {
      const end = source.indexOf('"', i + 1);
      fragment = source.slice(i, end + 1);
    } else if (source[i] === "{") {
      let depth = 0;
      let j = i;
      for (; j < source.length; j++) {
        if (source[j] === "{") depth++;
        else if (source[j] === "}" && --depth === 0) break;
      }
      fragment = source.slice(i + 1, j);
    }
    const tokens = stringsIn(fragment).flatMap((s) => expand(s).split(/\s+/));
    // Identificadores sueltos (`className={panel}`, `cn(panel, "x")`) → clases de la constante.
    const bare = fragment.replace(/"[^"]*"|'[^']*'|`[^`]*`/g, " ");
    for (const id of bare.match(/[A-Za-z_]\w*/g) ?? [])
      if (constants.has(id)) tokens.push(...expand(constants.get(id)).split(/\s+/));
    attrs.push(tokens.filter(Boolean));
  }
  return attrs;
}

const cssFiles = walk(root, [".css"]);
const tsxFiles = walk(root, [".tsx"]);
const tsFiles = walk(root, [".ts", ".tsx"]);

/** `const nombre = "clases…"` (o plantilla) en cualquier archivo: las clases que llegan a `className={nombre}`. */
const constants = new Map();
for (const file of tsFiles) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(/\bconst\s+(\w+)\s*=\s*("[^"\n]*"|'[^'\n]*'|`[^`]*`)\s*;/g))
    constants.set(m[1], m[2].slice(1, -1));
}
function expand(value, depth = 0) {
  if (depth > 3) return value;
  return value.replace(/\$\{\s*(\w+)\s*\}/g, (_, name) => expand(constants.get(name) ?? "", depth + 1));
}

let cssLines = 0;
let applyLines = 0;
const longCss = [];
const defined = new Set();
for (const file of cssFiles) {
  const raw = readFileSync(file, "utf8");
  const lines = raw.split("\n").length;
  cssLines += lines;
  // Sin comentarios ni @import (rutas como "./tokens.css" no son selectores) ni cadenas.
  const text = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@import[^;]*;/g, "")
    .replace(/"[^"]*"/g, '""');
  applyLines += text.split("\n").filter((l) => l.includes("@apply")).length;
  if (lines > 400) longCss.push(`${relative(root, file)} (${lines})`);
  const selectors = text.matchAll(/\.([A-Za-z_][\w-]*)(?=[\s,.:{[>+~)]|$)/g);
  for (const s of selectors) defined.add(s[1]);
}

let classNameAttrs = 0;
let attrsWithUtilities = 0;
let utilityTokens = 0;
const usage = new Map();
for (const file of tsxFiles) {
  for (const tokens of classAttributes(readFileSync(file, "utf8"))) {
    classNameAttrs++;
    let hasUtility = false;
    for (const t of tokens) {
      if (defined.has(t)) usage.set(t, (usage.get(t) ?? 0) + 1);
      else {
        utilityTokens++;
        hasUtility = true;
      }
    }
    if (hasUtility) attrsWithUtilities++;
  }
}

const semanticUsedOnce = [...defined].filter((c) => usage.get(c) === 1).length;
const unused = [...defined].filter((c) => !usage.has(c));

const result = {
  classNameAttributes: classNameAttrs,
  attributesWithUtilities: attrsWithUtilities,
  utilityPercent: classNameAttrs ? +((attrsWithUtilities / classNameAttrs) * 100).toFixed(1) : 0,
  utilityTokensInJsx: utilityTokens,
  semanticClassesDefined: defined.size,
  semanticClassesUsedOnce: semanticUsedOnce,
  semanticClassesUnused: unused.length,
  cssFiles: cssFiles.length,
  cssLines,
  applyLines,
  cssFilesOver400Lines: longCss,
};

const checkMode = process.argv.includes("--check");
const violations = [];

if (checkMode) {
  if (result.utilityPercent < 95) violations.push(`utilityPercent es ${result.utilityPercent}; el minimo es 95.`);
  if (result.semanticClassesDefined !== 0) violations.push(`semanticClassesDefined es ${result.semanticClassesDefined}; se esperaba 0.`);
  if (result.applyLines > 60) violations.push(`applyLines es ${result.applyLines}; el maximo es 60.`);
  if (result.cssFilesOver400Lines.length > 0) violations.push(`Hay archivos CSS con mas de 400 lineas: ${result.cssFilesOver400Lines.join(", ")}.`);
}

if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
else for (const [k, v] of Object.entries(result)) console.log(`${k}: ${Array.isArray(v) ? v.join(", ") || "-" : v}`);

if (checkMode) {
  if (violations.length > 0) {
    for (const violation of violations) console.error(`tailwind-audit: ${violation}`);
    process.exitCode = 1;
  } else {
    console.log("tailwind-audit: metas de migracion cumplidas.");
  }
}
