#!/usr/bin/env node
// Hook de pre-commit de Pastel: chequeos RAPIDOS sobre los archivos preparados (staged).
// No ejecuta dotnet format, build ni pruebas: eso vive en scripts/test-*.ps1.
//
// Politica:
//   - Correccion automatica solo cuando es segura y el archivo no tiene cambios sin preparar:
//       C#: quitar BOM, finales LF, nueva linea final.  Frontend: Prettier.
//   - Todo lo demas detiene el commit e indica como corregirlo.
//   - Los archivos corregidos se vuelven a preparar (git add) antes de crear el commit.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  analyzeCSharp,
  findSecrets,
  fixCSharp,
  forbiddenPathReason,
  isBinary,
  isCSharp,
  isPrettierManaged,
} from "./lib.mjs";

if (process.env.PASTEL_SKIP_HOOKS === "1") {
  console.log("[pastel] pre-commit omitido (PASTEL_SKIP_HOOKS=1).");
  process.exit(0);
}

const MAX_SCAN_BYTES = 2 * 1024 * 1024;

function git(args, { cwd } = {}) {
  return execFileSync("git", args, { cwd, maxBuffer: 256 * 1024 * 1024 });
}

function gitLines(args, cwd) {
  return git(args, { cwd })
    .toString("utf8")
    .split("\0")
    .filter((entry) => entry.length > 0);
}

const root = git(["rev-parse", "--show-toplevel"]).toString("utf8").trim();
const staged = gitLines(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"], root);
if (staged.length === 0) process.exit(0);

const withUnstagedChanges = new Set(gitLines(["diff", "--name-only", "-z"], root));
const problems = [];
const restage = new Set();
const warnings = [];

const problem = (file, message, fix) => problems.push({ file, message, fix });

// 1. Rutas prohibidas y secretos (sobre el contenido preparado).
for (const file of staged) {
  const reason = forbiddenPathReason(file);
  if (reason) {
    problem(file, reason, `git restore --staged "${file}"`);
    continue;
  }
  const blob = git(["show", `:${file}`], { cwd: root });
  if (blob.length > MAX_SCAN_BYTES || isBinary(blob)) continue;
  for (const finding of findSecrets(blob.toString("utf8"))) {
    problem(
      file,
      `posible secreto (${finding.kind}) en la linea ${finding.line}`,
      `Quite el valor, rote la credencial si fue real y use variables de entorno; luego git add "${file}"`,
    );
  }
}

// 2. C#: correcciones seguras o bloqueo.
for (const file of staged.filter(isCSharp)) {
  const partial = withUnstagedChanges.has(file);
  const path = join(root, file);

  if (partial) {
    const found = analyzeCSharp(git(["show", `:${file}`], { cwd: root }));
    reportCSharp(file, found, true);
    continue;
  }

  const original = readFileSync(path);
  let found = analyzeCSharp(original);
  if (found.hasBom || found.hasCarriageReturn || found.missingFinalNewline) {
    writeFileSync(path, fixCSharp(original));
    restage.add(file);
    found = analyzeCSharp(readFileSync(path));
  }
  reportCSharp(file, found, false);
}

function reportCSharp(file, found, partial) {
  const where = partial ? "en el contenido preparado " : "";
  const hint = partial
    ? "El archivo tiene cambios sin preparar, por eso no se corrige solo. Corrijalo y use git add."
    : "";
  if (found.hasBom) problem(file, `${where}tiene BOM (debe ser UTF-8 sin BOM)`, hint);
  if (found.hasCarriageReturn) problem(file, `${where}tiene finales CRLF (debe ser LF)`, hint);
  if (found.missingFinalNewline) problem(file, `${where}no termina con nueva linea`, hint);
  if (found.trailingWhitespaceLines.length > 0) {
    const shown = found.trailingWhitespaceLines.slice(0, 5).join(", ");
    problem(
      file,
      `espacios al final de linea (lineas ${shown}${found.trailingWhitespaceLines.length > 5 ? ", ..." : ""})`,
      "Elimine los espacios sobrantes (no se corrige solo para no alterar cadenas literales) y use git add." +
        (partial ? " Nota: el archivo tiene cambios sin preparar; revise tambien esa parte." : ""),
    );
  }
}

// 3. Frontend: Prettier sobre los archivos que administra `npm run format`.
const prettierFiles = staged.filter(isPrettierManaged);
if (prettierFiles.length > 0) {
  const prettierBin = join(root, "web", "node_modules", "prettier", "bin", "prettier.cjs");
  if (!existsSync(prettierBin)) {
    warnings.push(
      "Prettier no esta instalado: se omitio el formato del frontend. Ejecute `npm ci` en web/ para activarlo.",
    );
  } else {
    const relative = (file) => file.slice("web/".length);
    const clean = prettierFiles.filter((file) => !withUnstagedChanges.has(file));
    const partial = prettierFiles.filter((file) => withUnstagedChanges.has(file));

    if (clean.length > 0) {
      const before = new Map(clean.map((file) => [file, readFileSync(join(root, file))]));
      const result = spawnSync(
        process.execPath,
        [prettierBin, "--write", "--log-level", "warn", ...clean.map(relative)],
        { cwd: join(root, "web"), encoding: "utf8" },
      );
      if (result.status !== 0) {
        problem(
          "web/",
          `Prettier fallo:\n${(result.stderr || result.stdout || "").trim()}`,
          "Corrija el error indicado por Prettier y vuelva a intentar el commit.",
        );
      } else {
        for (const file of clean) {
          if (!readFileSync(join(root, file)).equals(before.get(file))) restage.add(file);
        }
      }
    }

    if (partial.length > 0) {
      const result = spawnSync(
        process.execPath,
        [prettierBin, "--check", "--log-level", "warn", ...partial.map(relative)],
        { cwd: join(root, "web"), encoding: "utf8" },
      );
      if (result.status !== 0) {
        for (const file of partial) {
          problem(
            file,
            "no cumple Prettier y tiene cambios sin preparar, por eso no se corrige solo",
            "cd web && npm run format   (luego git add del archivo)",
          );
        }
      }
    }
  }
}

// 4. Resultado.
for (const file of restage) git(["add", "--", file], { cwd: root });
if (restage.size > 0) {
  console.log(`[pastel] Se corrigio y volvio a preparar ${restage.size} archivo(s):`);
  for (const file of restage) console.log(`  - ${file}`);
}
for (const warning of warnings) console.warn(`[pastel] AVISO: ${warning}`);

if (problems.length > 0) {
  console.error("\n[pastel] Commit detenido: hay problemas que no se corrigen solos.\n");
  for (const { file, message, fix } of problems) {
    console.error(`  x ${file}: ${message}`);
    if (fix) console.error(`      -> ${fix}`);
  }
  console.error(
    "\nLas validaciones completas (dotnet format, build, pruebas) NO se ejecutan aqui: use scripts/*.ps1.",
  );
  console.error("Emergencia: PASTEL_SKIP_HOOKS=1 git commit ...  (quedara pendiente de corregir).");
  process.exit(1);
}
