#!/usr/bin/env node
// Instala los hooks versionados de .githooks/ en este clon (git config local core.hooksPath).
// Es idempotente. Para desinstalar: git config --unset core.hooksPath
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"]).toString("utf8").trim();
const required = [
  ".githooks/pre-commit",
  ".githooks/commit-msg",
  "scripts/hooks/pre-commit.mjs",
  "scripts/hooks/commit-msg.mjs",
  "scripts/hooks/lib.mjs",
];
const missing = required.filter((file) => !existsSync(join(root, file)));
if (missing.length > 0) {
  console.error(`Faltan archivos del hook: ${missing.join(", ")}. Sincronice la rama e intente de nuevo.`);
  process.exit(1);
}

const major = Number(process.versions.node.split(".")[0]);
if (major < 20) {
  console.error(`Se requiere Node 20 o superior (actual: ${process.versions.node}).`);
  process.exit(1);
}

execFileSync("git", ["config", "core.hooksPath", ".githooks"], { cwd: root });
try {
  for (const hook of [".githooks/pre-commit", ".githooks/commit-msg"]) {
    execFileSync("git", ["update-index", "--chmod=+x", hook], { cwd: root, stdio: "ignore" });
  }
} catch {
  // Sin efecto en sistemas de archivos que no soportan el bit ejecutable.
}

console.log("Hook de pre-commit instalado (core.hooksPath=.githooks).");
console.log("Valida formato y secretos en cada commit (sobre los archivos preparados) y el mensaje del commit; no modifica commits ya creados.");
console.log("Prettier requiere dependencias del frontend: cd web && npm ci");
