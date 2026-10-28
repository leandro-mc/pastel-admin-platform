// Funciones puras del hook de pre-commit. No tocan git ni el disco: se prueban en
// scripts/tests/pre-commit.test.mjs.

const FORBIDDEN_EXTENSIONS = new Map([
  [".csn", "los archivos .csn no se versionan (origen sin determinar; ver docs/TESTING.md)"],
  [".pem", "las claves privadas y certificados no se versionan"],
  [".pfx", "las claves privadas y certificados no se versionan"],
  [".p12", "las claves privadas y certificados no se versionan"],
  [".key", "las claves privadas no se versionan"],
]);

/** Devuelve el motivo por el que una ruta no debe versionarse, o null. */
export function forbiddenPathReason(path) {
  const name = path.split("/").pop() ?? path;
  if (name === ".env.example") return null;
  if (name === ".env" || name.startsWith(".env.")) {
    return "los archivos .env contienen secretos y no se versionan (use .env.example)";
  }
  const dot = name.lastIndexOf(".");
  if (dot >= 0) {
    const reason = FORBIDDEN_EXTENSIONS.get(name.slice(dot).toLowerCase());
    if (reason) return reason;
  }
  return null;
}

const SECRET_PATTERNS = [
  { kind: "token fine-grained de GitHub", regex: /github_pat_[A-Za-z0-9_]{22,}/ },
  { kind: "token de GitHub", regex: /\bgh[pousr]_[A-Za-z0-9]{30,}/ },
  { kind: "clave privada", regex: /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/ },
  { kind: "clave de acceso de AWS", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { kind: "client secret de Google OAuth", regex: /\bGOCSPX-[A-Za-z0-9_-]{20,}/ },
  { kind: "clave de API de Anthropic", regex: /\bsk-ant-[A-Za-z0-9_-]{20,}/ },
];

/** Busca patrones de secretos conocidos. Nunca devuelve el valor encontrado. */
export function findSecrets(text) {
  const findings = [];
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    for (const { kind, regex } of SECRET_PATTERNS) {
      if (regex.test(lines[index])) findings.push({ line: index + 1, kind });
    }
  }
  return findings;
}

export function isBinary(buffer) {
  return buffer.subarray(0, 8000).includes(0);
}

function hasBom(buffer) {
  return buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
}

/** Diagnostica un archivo C#: BOM, CR, nueva linea final y espacios al final de linea. */
export function analyzeCSharp(buffer) {
  const bom = hasBom(buffer);
  const text = buffer.subarray(bom ? 3 : 0).toString("utf8");
  const trailingWhitespaceLines = [];
  text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .forEach((line, index) => {
      if (/[ \t]+$/.test(line)) trailingWhitespaceLines.push(index + 1);
    });
  return {
    hasBom: bom,
    hasCarriageReturn: text.includes("\r"),
    missingFinalNewline: text.length > 0 && !text.endsWith("\n") && !text.endsWith("\r"),
    trailingWhitespaceLines,
  };
}

/** Correcciones seguras: sin BOM, finales LF y nueva linea final. No toca el contenido de las lineas. */
export function fixCSharp(buffer) {
  const bom = hasBom(buffer);
  let text = buffer.subarray(bom ? 3 : 0).toString("utf8");
  text = text.replace(/\r\n?/g, "\n");
  if (text.length > 0 && !text.endsWith("\n")) text += "\n";
  return Buffer.from(text, "utf8");
}

const PRETTIER_ROOT_FILES = new Set([
  "web/vite.config.ts",
  "web/vitest.config.ts",
  "web/playwright.config.ts",
  "web/eslint.config.js",
]);

/** Archivos que `npm run format` de web/ administra con Prettier. */
export function isPrettierManaged(path) {
  if (PRETTIER_ROOT_FILES.has(path)) return true;
  if (/^web\/(src|tests)\/.+\.(ts|tsx|css)$/.test(path)) {
    return !/^web\/tests\/.+\.css$/.test(path);
  }
  return /^web\/vite\/.+\.ts$/.test(path);
}

export function isCSharp(path) {
  return /^(src|tests)\/.+\.cs$/.test(path) && !/(^|\/)(bin|obj)\//.test(path);
}

const COMMIT_TYPES = "feat|fix|refactor|test|docs|chore|ci|style";
const COMMIT_SUBJECT = new RegExp(`^(${COMMIT_TYPES})(\\([a-z0-9._/-]+\\))?!?: \\S`);
const NOISE_SUBJECT = /^(wip|checkpoint|tmp|temp)\b|checkpoint/i;
const PROGRESS_ONLY_SUBJECT = /^(docs|chore)(\([^)]*\))?: (record|registrar)\b/i;

/**
 * Valida el mensaje de un commit segun docs/GIT_WORKFLOW.md. Devuelve la lista de problemas (vacia si es valido).
 * Se omiten los merges, reverts y los fixup/squash que genera un rebase interactivo.
 */
export function commitMessageProblems(message) {
  const subject =
    message
      .split("\n")
      .map((line) => line.trimEnd())
      .find((line) => line.length > 0 && !line.startsWith("#")) ?? "";
  if (/^(Merge |Revert |fixup! |squash! |amend! )/.test(subject)) return [];

  const problems = [];
  if (!COMMIT_SUBJECT.test(subject)) {
    problems.push(`El resumen debe ser «tipo(ambito): resumen» con tipo en {${COMMIT_TYPES.replaceAll("|", ", ")}}.`);
  }
  if (subject.length > 72) {
    problems.push(`El resumen mide ${subject.length} caracteres; el maximo es 72.`);
  }
  if (NOISE_SUBJECT.test(subject)) {
    problems.push("No se commitea por punto de control ni a medias (wip, checkpoint, tmp): agrupe el trabajo en una unidad completa.");
  }
  if (PROGRESS_ONLY_SUBJECT.test(subject)) {
    problems.push("No se registra el avance en commits aparte: actualice docs/PROGRESS.md dentro del commit de la unidad.");
  }
  return problems;
}

