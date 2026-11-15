import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { commitMessageProblems } from "../hooks/lib.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("acepta mensajes con el formato del proyecto", () => {
  assert.deepEqual(commitMessageProblems("feat(identity): agregar el refresco con ventana de gracia\n\nCuerpo."), []);
  assert.deepEqual(commitMessageProblems("fix: corregir el limite de intentos"), []);
  assert.deepEqual(commitMessageProblems("style(backend): normalizar el formato\n"), []);
});

test("omite merges, reverts y fixup de un rebase", () => {
  assert.deepEqual(commitMessageProblems("Merge branch 'dev' into feat/x"), []);
  assert.deepEqual(commitMessageProblems('Revert "feat: algo"'), []);
  assert.deepEqual(commitMessageProblems("fixup! feat(web): algo"), []);
});

test("rechaza sin tipo, demasiado largo, a medias y registros de avance", () => {
  assert.ok(commitMessageProblems("Refactor components for readability").length > 0);
  assert.ok(commitMessageProblems(`feat(web): ${"a".repeat(70)}`).some((p) => p.includes("72")));
  assert.ok(commitMessageProblems("wip: probando").length > 0);
  assert.ok(commitMessageProblems("chore: checkpoint de la fase").length > 0);
  assert.ok(commitMessageProblems("docs: record S3 checkpoint").length > 0);
  assert.ok(commitMessageProblems("docs(fase0): registrar el avance de WP2").length > 0);
});

test("el hook rechaza un mensaje malo y acepta uno bueno en un repositorio real", () => {
  const dir = mkdtempSync(join(tmpdir(), "pastel-msg-"));
  try {
    const run = (...args) => execFileSync("git", args, { cwd: dir, encoding: "utf8" });
    run("init", "-q", "-b", "main");
    run("config", "user.name", "Test");
    run("config", "user.email", "test@example.com");
    cpSync(join(repoRoot, ".githooks"), join(dir, ".githooks"), { recursive: true });
    cpSync(join(repoRoot, "scripts", "hooks"), join(dir, "scripts", "hooks"), { recursive: true });
    run("config", "core.hooksPath", ".githooks");
    writeFileSync(join(dir, "a.txt"), "a\n");
    run("add", "a.txt");
    const bad = spawnSync("git", ["commit", "-q", "-m", "wip cosas"], { cwd: dir, encoding: "utf8" });
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /Mensaje de commit rechazado/);
    const good = spawnSync("git", ["commit", "-q", "-m", "docs: agregar el primer archivo"], { cwd: dir, encoding: "utf8" });
    assert.equal(good.status, 0, good.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
