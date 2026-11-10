import assert from "node:assert/strict";
import test from "node:test";
import { scanSource } from "../check-design.mjs";

const rules = (path, source) => scanSource(path, source).map((finding) => finding.rule);

// ---- Reglas duras: morado y símbolos de IA ----

test("rechaza clases de Tailwind moradas", () => {
  assert.ok(rules("web/src/example.tsx", '<div className="bg-purple-500 text-violet-700" />').includes("purple"));
});

test("rechaza colores morados literales en cualquier archivo, también en los de tokens", () => {
  assert.ok(rules("web/src/example.tsx", 'const color = "#8b5cf6";').includes("purple"));
  assert.ok(rules("web/src/core/design/tokens.css", ":root { --accent: #7c3aed; }").includes("purple"));
  assert.ok(rules("web/src/core/design/module-themes.css", ".x { color: hsl(270 60% 50%); }").includes("purple"));
});

test("rechaza iconos de IA de lucide", () => {
  assert.ok(rules("web/src/example.tsx", 'import { Bot } from "lucide-react";').includes("ai-symbol"));
});

test("rechaza emojis de IA", () => {
  assert.ok(rules("web/src/example.tsx", 'const label = "✨";').includes("ai-symbol"));
});

test("no clasifica un gris azulado de baja saturacion como morado", () => {
  assert.deepEqual(rules("web/src/core/design/tokens.css", ":root { --muted: #64748b; }"), []);
});

// ---- Lo que ya NO se restringe: la identidad visual de cada app está en definición ----

test("permite colores literales no morados en cualquier archivo", () => {
  assert.deepEqual(rules("web/src/example.tsx", 'const color = "#e2b16b";'), []);
  assert.deepEqual(rules("web/src/modules/identity/components/GoogleLogo.tsx", 'const blue = "#4285F4";'), []);
  assert.deepEqual(rules("web/src/example.css", ".panel { color: rgb(20 120 90); background: hsl(160 40% 30%); }"), []);
});

test("permite @apply en cualquier archivo CSS", () => {
  assert.deepEqual(rules("web/src/example.css", ".panel { @apply flex; }"), []);
});
