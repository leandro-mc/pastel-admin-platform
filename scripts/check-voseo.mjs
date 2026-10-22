#!/usr/bin/env node
// F0-W09: ninguna cadena del frontend ni mensaje del backend debe usar voseo.
// Regla del proyecto (docs/DESIGN_SYSTEM.md): trato de usted o impersonal, sin voseo ni tuteo.
// Detecta formas voseantes inequívocas (lista explícita, sin heurísticas de acento que generarían
// falsos positivos como «leído»). Excepción puntual: comentario `check-voseo:allow` en la misma línea
// (solo para una ficha de módulo que autorice voseo de forma expresa).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const IMPERATIVES = [
  "ingresá", "accedé", "hacé", "revisá", "elegí", "escribí", "confirmá", "probá", "intentá", "esperá", "volvé",
  "contactá", "seleccioná", "mirá", "asegurate", "tené", "poné", "dejá", "cerrá", "abrí", "guardá", "completá",
  "verificá", "usá", "buscá", "cambiá", "creá", "agregá", "quitá", "eliminá", "bloqueá", "desbloqueá", "restablecé",
  "copiá", "descargá", "subí", "bajá", "activá", "desactivá", "recordá", "avisá", "continuá", "iniciá", "actualizá",
  "definí", "asigná", "rellená", "marcá", "desmarcá", "filtrá", "ordená", "decí", "sabé", "pensá", "sentí", "viví",
  "cargá", "enviá", "mandá", "pagá", "comprá", "hablá", "llamá", "aceptá", "recibí", "pedí", "repetí", "seguí",
  "salí", "entrá", "fijate", "vení", "andá", "tomá", "pasá", "ayudá", "comenzá", "terminá", "finalizá", "cancelá",
  "regresá", "ocultá", "mostrá", "encontrá", "ingresate", "contactate", "comunicate", "registrate", "logueate",
];

const PRESENT = [
  "tenés", "podés", "querés", "sabés", "hacés", "ponés", "venís", "decís", "vivís", "sentís", "elegís", "escribís",
  "ingresás", "necesitás", "usás", "buscás", "cambiás", "olvidás", "pensás", "recordás", "salís", "abrís", "recibís",
  "perdés", "entendés", "esperás", "probás", "cargás", "guardás", "seguís", "pedís", "repetís", "confirmás", "aceptás",
  "creás", "mirás", "llamás", "mandás", "enviás", "pagás", "comprás", "hablás", "trabajás", "elegís", "sos", "vos",
];

const WORDS = [...new Set([...IMPERATIVES, ...PRESENT])];
// Límites con propiedades Unicode: \b de JavaScript es solo ASCII y marcaría «leído» o «entréguela».
const PATTERN = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${WORDS.join("|")})(?![\\p{L}\\p{N}_])`, "giu");
const ALLOW_MARKER = "check-voseo:allow";

/** Devuelve las formas voseantes de un texto, con su número de línea (base 1). */
export function findVoseo(text) {
  const findings = [];
  text.split("\n").forEach((line, index) => {
    if (line.includes(ALLOW_MARKER)) return;
    for (const match of line.matchAll(PATTERN)) {
      // «SOS» en mayúsculas es la sigla inglesa; el voseo «sos» solo aparece en minúsculas o con inicial.
      if (match[0] === "SOS") continue;
      findings.push({ line: index + 1, word: match[0] });
    }
  });
  return findings;
}

const SKIPPED_DIRECTORIES = new Set(["node_modules", "bin", "obj", "dist", ".git", "Migrations", "coverage"]);
const EXTENSIONS = new Set([".ts", ".tsx", ".cs"]);

function* walk(directory) {
  for (const name of readdirSync(directory)) {
    if (SKIPPED_DIRECTORIES.has(name)) continue;
    // Los proyectos de pruebas contienen datos de ejemplo; no son texto de producto.
    if (name.endsWith(".Tests")) continue;
    const path = join(directory, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (EXTENSIONS.has(extname(path))) yield path;
  }
}

/** Escanea el texto de producto: web/src y src (frontend y backend). */
export function scanRepository(root) {
  const results = [];
  for (const base of ["web/src", "src"]) {
    const directory = join(root, base);
    try {
      statSync(directory);
    } catch {
      continue;
    }
    for (const file of walk(directory)) {
      for (const finding of findVoseo(readFileSync(file, "utf8"))) {
        results.push({ file: relative(root, file).replaceAll("\\", "/"), ...finding });
      }
    }
  }
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const results = scanRepository(root);
  if (results.length === 0) {
    console.log("check-voseo: sin hallazgos.");
  } else {
    console.error(`check-voseo: ${results.length} hallazgo(s) de voseo (trato permitido: usted o impersonal).`);
    for (const { file, line, word } of results) console.error(`  ${file}:${line}  «${word}»`);
    console.error("Use «Ingrese», «Revise», etc., o redacte de forma impersonal.");
    process.exit(1);
  }
}
