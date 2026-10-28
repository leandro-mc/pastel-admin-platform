import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  analyzeCSharp,
  findSecrets,
  fixCSharp,
  forbiddenPathReason,
  isCSharp,
  isPrettierManaged,
} from "../hooks/lib.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// ---------- Unitarias ----------

test("rechaza .csn, .env y claves; permite .env.example", () => {
  assert.ok(forbiddenPathReason("src/data/modelo.csn"));
  assert.ok(forbiddenPathReason("backup/MODELO.CSN"));
  assert.ok(forbiddenPathReason(".env"));
  assert.ok(forbiddenPathReason("deploy/.env.production"));
  assert.ok(forbiddenPathReason("keys/oauth.pem"));
  assert.equal(forbiddenPathReason(".env.example"), null);
  assert.equal(forbiddenPathReason("src/Program.cs"), null);
});

test("detecta secretos conocidos sin devolver el valor", () => {
  const github = `token = "${"github_pat_"}${"A1b2".repeat(10)}"`;
  const google = `secret=${"GOCSPX-"}${"x".repeat(24)}`;
  const key = `${"-----BEGIN "}${"RSA PRIVATE KEY-----"}`;
  for (const [text, kind] of [
    [github, "token fine-grained de GitHub"],
    [google, "client secret de Google OAuth"],
    [key, "clave privada"],
  ]) {
    const findings = findSecrets(`linea 1\n${text}`);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].line, 2);
    assert.equal(findings[0].kind, kind);
    assert.equal(JSON.stringify(findings).includes("AAAA"), false);
  }
  assert.deepEqual(findSecrets("var token = options.Token; // sin secretos"), []);
});

test("analyzeCSharp detecta BOM, CRLF, falta de nueva linea y espacios finales", () => {
  const bad = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("class A {} \r\nclass B {}", "utf8")]);
  const found = analyzeCSharp(bad);
  assert.equal(found.hasBom, true);
  assert.equal(found.hasCarriageReturn, true);
  assert.equal(found.missingFinalNewline, true);
  assert.deepEqual(found.trailingWhitespaceLines, [1]);
  const clean = analyzeCSharp(Buffer.from("class A {}\n", "utf8"));
  assert.deepEqual(clean, {
    hasBom: false,
    hasCarriageReturn: false,
    missingFinalNewline: false,
    trailingWhitespaceLines: [],
  });
});

test("fixCSharp es idempotente y no toca el contenido de las lineas", () => {
  const source = Buffer.concat([
    Buffer.from([0xef, 0xbb, 0xbf]),
    Buffer.from('var s = """\r\n  texto con espacio \r\n""";\r\nclass A {}', "utf8"),
  ]);
  const once = fixCSharp(source);
  assert.equal(once.toString("utf8"), 'var s = """\n  texto con espacio \n""";\nclass A {}\n');
  assert.ok(fixCSharp(once).equals(once));
});

test("clasifica rutas de C# y de Prettier como npm run format", () => {
  assert.equal(isCSharp("src/Modules/Identity/A.cs"), true);
  assert.equal(isCSharp("src/Modules/Identity/obj/A.cs"), false);
  assert.equal(isCSharp("docs/ejemplo.cs"), false);
  assert.equal(isPrettierManaged("web/src/app/App.tsx"), true);
  assert.equal(isPrettierManaged("web/src/core/design/base.css"), true);
  assert.equal(isPrettierManaged("web/tests/e2e/login.spec.ts"), true);
  assert.equal(isPrettierManaged("web/vite.config.ts"), true);
  assert.equal(isPrettierManaged("web/package-lock.json"), false);
  assert.equal(isPrettierManaged("src/App.tsx"), false);
});

// ---------- Extremo a extremo en un repositorio temporal ----------

function createRepo() {
  const dir = mkdtempSync(join(tmpdir(), "pastel-hook-"));
  const run = (...args) => execFileSync("git", args, { cwd: dir, encoding: "utf8" });
  run("init", "-q", "-b", "main");
  run("config", "user.name", "Test");
  run("config", "user.email", "test@example.com");
  run("config", "core.autocrlf", "false");
  cpSync(join(repoRoot, ".githooks"), join(dir, ".githooks"), { recursive: true });
  cpSync(join(repoRoot, "scripts", "hooks"), join(dir, "scripts", "hooks"), { recursive: true });
  writeFileSync(join(dir, ".gitattributes"), "* text=auto eol=lf\n");
  run("config", "core.hooksPath", ".githooks");
  return { dir, run };
}

function write(dir, path, content) {
  const full = join(dir, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

function commit(dir, message = "chore: prueba del hook") {
  return spawnSync("git", ["commit", "-q", "-m", message], { cwd: dir, encoding: "utf8" });
}

const withRepo = (name, body) =>
  test(name, () => {
    const repo = createRepo();
    try {
      body(repo);
    } finally {
      rmSync(repo.dir, { recursive: true, force: true });
    }
  });

withRepo("corrige BOM/CRLF/nueva linea de un .cs, lo vuelve a preparar y permite el commit", ({ dir, run }) => {
  write(dir, "src/Mod/A.cs", Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("class A {}\r\nclass B {}", "utf8")]));
  run("add", "src/Mod/A.cs");
  const result = commit(dir);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(dir, "src/Mod/A.cs"), "utf8"), "class A {}\nclass B {}\n");
  assert.equal(run("show", "HEAD:src/Mod/A.cs"), "class A {}\nclass B {}\n");
  assert.equal(run("status", "--porcelain", "--", "src").trim(), "", "no debe quedar nada modificado en src/");
});

withRepo("un .cs ya correcto se confirma sin modificarlo (idempotencia)", ({ dir, run }) => {
  write(dir, "src/Mod/A.cs", "class A {}\n");
  run("add", "src/Mod/A.cs");
  const before = run("hash-object", "src/Mod/A.cs");
  assert.equal(commit(dir).status, 0);
  assert.equal(run("hash-object", "src/Mod/A.cs"), before);
});

withRepo("bloquea espacios al final de linea en C# sin alterar el archivo", ({ dir, run }) => {
  write(dir, "src/Mod/A.cs", "class A {} \n");
  run("add", "src/Mod/A.cs");
  const result = commit(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /espacios al final de linea/);
  assert.equal(readFileSync(join(dir, "src/Mod/A.cs"), "utf8"), "class A {} \n");
});

withRepo("bloquea un .csn, un .env y un secreto", ({ dir, run }) => {
  write(dir, "backup/modelo.csn", "x");
  write(dir, ".env", "A=1");
  write(dir, "docs/nota.md", `token ${"github_pat_"}${"Zz9_".repeat(8)}\n`);
  run("add", "-f", "backup/modelo.csn", ".env", "docs/nota.md");
  const result = commit(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /modelo\.csn/);
  assert.match(result.stderr, /\.env/);
  assert.match(result.stderr, /token fine-grained de GitHub/);
  assert.equal(result.stderr.includes("Zz9_Zz9_"), false, "no debe imprimir el valor del secreto");
});

withRepo("no corrige solo un .cs con cambios sin preparar: bloquea e indica como", ({ dir, run }) => {
  write(dir, "src/Mod/A.cs", "class A {}\n");
  run("add", "src/Mod/A.cs");
  assert.equal(commit(dir).status, 0);
  write(dir, "src/Mod/A.cs", "class A {} \n");
  run("add", "src/Mod/A.cs");
  write(dir, "src/Mod/A.cs", "class A {} \nclass B {}\n");
  const result = commit(dir, "chore: prueba parcial");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /cambios sin preparar/);
  assert.match(result.stderr, /espacios al final de linea/);
  assert.equal(run("show", ":src/Mod/A.cs"), "class A {} \n", "el contenido preparado no se altera");
  assert.equal(readFileSync(join(dir, "src/Mod/A.cs"), "utf8"), "class A {} \nclass B {}\n");
});

withRepo("PASTEL_SKIP_HOOKS=1 omite el hook de forma explicita", ({ dir, run }) => {
  write(dir, "src/Mod/A.cs", "class A {} \n");
  run("add", "src/Mod/A.cs");
  const result = spawnSync("git", ["commit", "-q", "-m", "chore: omitir el hook"], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, PASTEL_SKIP_HOOKS: "1" },
  });
  assert.equal(result.status, 0);
});

withRepo("sin Prettier instalado avisa y no bloquea archivos del frontend", ({ dir, run }) => {
  write(dir, "web/src/app/App.tsx", "export const a=1\n");
  run("add", "web/src/app/App.tsx");
  const result = commit(dir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /Prettier no esta instalado/);
});
