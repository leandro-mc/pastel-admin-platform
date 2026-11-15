#!/usr/bin/env node
// Hook commit-msg: valida el mensaje segun docs/GIT_WORKFLOW.md (formato, longitud y patrones de ruido).
import { readFileSync } from "node:fs";
import { commitMessageProblems } from "./lib.mjs";

if (process.env.PASTEL_SKIP_HOOKS === "1") process.exit(0);

const file = process.argv[2];
if (!file) process.exit(0);

const problems = commitMessageProblems(readFileSync(file, "utf8"));
if (problems.length > 0) {
  console.error("\n[pastel] Mensaje de commit rechazado:\n");
  for (const problem of problems) console.error(`  x ${problem}`);
  console.error("\nEjemplo: feat(identity): agregar el refresco con ventana de gracia");
  console.error("Reglas: docs/GIT_WORKFLOW.md. Emergencia: PASTEL_SKIP_HOOKS=1 git commit ...");
  process.exit(1);
}
