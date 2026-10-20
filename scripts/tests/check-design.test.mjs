import assert from "node:assert/strict";
import test from "node:test";
import { scanSource } from "../check-design.mjs";

const rules = (path, source) => scanSource(path, source).map((finding) => finding.rule);

test("rechaza clases de Tailwind moradas", () => {
  assert.ok(rules("web/src/example.tsx", '<div className="bg-purple-500 text-violet-700" />').includes("purple"));
});

test("rechaza colores literales fuera de los archivos de tokens", () => {
  assert.ok(rules("web/src/example.tsx", 'const color = "#e2b16b";').includes("loose-color"));
});

test("permite definir colores en el archivo de tokens", () => {
  assert.deepEqual(rules("web/src/core/design/tokens.css", ":root { --surface: #e2b16b; }"), []);
});

test("rechaza iconos de IA de lucide", () => {
  assert.ok(rules("web/src/example.tsx", 'import { Bot } from "lucide-react";').includes("ai-symbol"));
});

test("rechaza emojis de IA", () => {
  assert.ok(rules("web/src/example.tsx", 'const label = "✨";').includes("ai-symbol"));
});

test("restringe @apply a base.css", () => {
  assert.ok(rules("web/src/example.css", ".panel { @apply flex; }").includes("apply"));
  assert.deepEqual(rules("web/src/core/design/base.css", ".panel { @apply flex; }"), []);
});

test("no clasifica un gris azulado de baja saturacion como morado", () => {
  assert.deepEqual(rules("web/src/core/design/tokens.css", ":root { --muted: #64748b; }"), []);
});

test("permite los colores oficiales del logotipo de Google", () => {
  assert.deepEqual(rules("web/src/modules/identity/components/GoogleLogo.tsx", 'const blue = "#4285F4";'), []);
});
