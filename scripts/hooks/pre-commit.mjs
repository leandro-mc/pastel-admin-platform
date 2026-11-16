#!/usr/bin/env node
// Hook de pre-commit de Pastel: SOLO seguridad, sobre los archivos preparados (staged).
// Detiene el commit ante rutas prohibidas (.csn, .env, claves) y patrones de secretos.
// No formatea, no ejecuta Prettier, lint, build ni pruebas: eso se hace a pedido del propietario
// (scripts/format-*.ps1 y scripts/test-*.ps1; ver AGENTS.md §4).
import { execFileSync } from "node:child_process";
import { findSecrets, forbiddenPathReason, isBinary } from "./lib.mjs";

if (process.env.PASTEL_SKIP_HOOKS === "1") {
  console.log("[pastel] pre-commit omitido (PASTEL_SKIP_HOOKS=1).");
  process.exit(0);
}

const MAX_SCAN_BYTES = 2 * 1024 * 1024;

function git(args, { cwd } = {}) {
  return execFileSync("git", args, { cwd, maxBuffer: 256 * 1024 * 1024 });
}

const root = git(["rev-parse", "--show-toplevel"]).toString("utf8").trim();
const staged = git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"], { cwd: root })
  .toString("utf8")
  .split("\0")
  .filter((entry) => entry.length > 0);
if (staged.length === 0) process.exit(0);

const problems = [];
const problem = (file, message, fix) => problems.push({ file, message, fix });

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

if (problems.length > 0) {
  console.error("\n[pastel] Commit detenido: archivos prohibidos o posibles secretos.\n");
  for (const { file, message, fix } of problems) {
    console.error(`  x ${file}: ${message}`);
    if (fix) console.error(`      -> ${fix}`);
  }
  console.error("\nEmergencia: PASTEL_SKIP_HOOKS=1 git commit ...  (quedara pendiente de corregir).");
  process.exit(1);
}
