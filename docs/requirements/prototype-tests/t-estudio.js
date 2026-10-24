const assert = require("node:assert/strict");
module.exports = async ({ w, d, $, $$, click, type, text, t, wait }) => {
  w.__NOWAIT = true;
  const radio = (k, v) => { const n = $(`[data-k="${k}"][value="${v}"]`); n.checked = true; n.dispatchEvent(new w.Event("change", { bubbles: true })); };
  const setSel = (k, v) => { const n = $(`[data-k="${k}"]`); n.value = v; n.dispatchEvent(new w.Event("change", { bubbles: true })); };
  const chk = (k, v) => { const n = $(`[data-k="${k}"]`); n.checked = v; n.dispatchEvent(new w.Event("change", { bubbles: true })); };
  const lu = () => { const m = $(".box .num").textContent, c = $$(".box .num")[1].textContent; return [parseFloat(m), parseFloat(c)]; };
  const waitRes = async () => { for (let i = 0; i < 150; i++) { if ($("#tabs [aria-current]").textContent === "Resultado") return; await wait(20); } };
  const run = async () => { click('[data-a="map"]'); click('[data-a="gen"]'); await waitRes(); };
  const ckAll = () => $$(".chk li").every((li) => li.querySelector(".ok"));

  click('[data-v="banco"]');
  t("Banco: ninguna variante excede su tope (corta ≤110, larga ≤170)", () => assert.equal($$(".cnt.over").length, 0));
  t("Banco: habilidades sin respaldo se señalan (Docker, Cypress…)", () => assert.match($(".chips").textContent, /Docker · sin respaldo/));
  click('[data-v="generar"]');

  t("Gemini gratuito: nivel Máximo no disponible y escudo de PII obligatorio", () => { assert.ok($('[data-k="tier"] option[value="best"]').disabled); assert.ok($('[data-k="pii"]').disabled && $('[data-k="pii"]').checked); });
  t("Lo que se enviaría no contiene correo ni teléfono", () => assert.match(text(), /✓ sin correo ni teléfono/));
  t("El botón Generar está bloqueado hasta mapear la evidencia", () => assert.ok($('[data-a="gen"]').disabled));
  click('[data-a="map"]');
  t("Mapa de evidencia: cubierto / parcial / brecha honestos", () => {
    const c = $$(".chips span").map((s) => s.textContent);
    assert.ok(c.some((x) => /^✓ Playwright/.test(x))); assert.ok(c.some((x) => /^~ JMeter.*adyacente: k6/.test(x))); assert.ok(c.some((x) => /^✕ Kubernetes.*brecha/.test(x))); assert.ok(c.some((x) => /^~ Docker/.test(x))); assert.ok(c.some((x) => /^✓ Inglés/.test(x)));
    assert.ok($('[data-a="gen"]').disabled === false);
  });

  click('[data-a="gen"]'); await waitRes();
  t("Mid / Carta: pasa a Resultado y respeta el cupo (≤ 97 LU, 2 págs.)", () => { assert.match(text(), /Resultado · Mid-level/); const [a, c] = lu(); assert.equal(c, 97); assert.ok(a <= c, a + ">" + c); });
  t("La escalera de ajuste actuó sobre el borrador que se pasaba", () => assert.match($("ol").textContent, /Paso 1|Paso 2/));
  t("Reporte ATS: las 10 comprobaciones pasan", () => { assert.equal($$(".chk li").length, 10); assert.ok(ckAll(), $$(".chk .no").map((n) => n.parentNode.textContent).join("|")); });
  t("Kubernetes no aparece en el CV (no se inventa) y sí las habilidades reales", () => { const pre = $("pre.cv").textContent; assert.ok(!/kubernetes/i.test(pre)); assert.match(pre, /Playwright/); });
  t("El texto extraído mantiene fecha y cargo en la misma línea", () => assert.match($("pre.cv").textContent, /QA Automation Engineer, Empresa Ejemplo S\.A\., San José, CR\s+Mar 2022 - Presente/));

  // Guardián de verdad al editar
  click('[data-a="ed"]');
  type('[data-k="edtext"]', "Automaticé 999 pruebas con Playwright en tiempo récord.");
  click('[data-a="edsave"]');
  t("Editar con una cifra nueva se rechaza", () => assert.match($(".err").textContent, /Cifra nueva «999»/));
  type('[data-k="edtext"]', "x".repeat(200)); click('[data-a="edsave"]');
  t("Editar por encima del tope duro se rechaza", () => assert.match($(".err").textContent, /Excede el tope duro \(200\/175/));
  type('[data-k="edtext"]', "Líder de resultados orientado a resultados con 140 pruebas."); click('[data-a="edsave"]');
  t("Editar con una frase prohibida se rechaza", () => assert.match($(".err").textContent, /Frase prohibida/));
  type('[data-k="edtext"]', "Automaticé 140 pruebas con Playwright; la regresión bajó de 2 días a 3 horas."); click('[data-a="edsave"]');
  t("Editar con cifras del banco y sin frases vacías se acepta", () => { assert.match($("#toast").textContent, /Línea guardada/); assert.ok(ckAll()); });

  // Junior (1 página) y A4
  click('[data-v="generar"]'); radio("level", "junior"); await run();
  t("Junior / Carta: ≤ 50 LU en 1 página y todas las comprobaciones pasan", () => { const [a, c] = lu(); assert.equal(c, 50); assert.ok(a <= 50, "LU " + a); assert.match(text(), /de 1 página/); assert.ok(ckAll()); });
  t("Junior: la 3.ª experiencia queda solo con encabezado (presupuesto 0)", () => { const pre = $("pre.cv").textContent.split("\n"), i = pre.findIndex((l) => l.startsWith("Practicante")); assert.ok(i > 0); assert.ok(!pre[i + 1].startsWith("•")); });
  click('[data-v="generar"]'); radio("level", "senior"); radio("paper", "a4"); await run();
  t("Senior / A4: cupo 109 LU y cumple", () => { const [a, c] = lu(); assert.equal(c, 109); assert.ok(a <= 109); assert.ok(ckAll()); });

  // Sin borrador excesivo no hace falta ajustar
  click('[data-v="generar"]'); radio("paper", "letter"); radio("level", "mid"); chk("over", false); await run();
  t("Sin desborde simulado: cupo garantizado sin ajustes", () => assert.match($("ol").textContent, /Cupo garantizado sin ajustes/));

  // Proveedores y PII
  click('[data-v="generar"]'); setSel("prov", "openai");
  t("OpenAI: el escudo de PII se puede desactivar y entonces se avisa", () => { assert.ok(!$('[data-k="pii"]').disabled); chk("pii", false); assert.match(text(), /⚠ incluye datos personales/); });
  setSel("prov", "gemini");
  t("Volver a Gemini gratuito fuerza el escudo otra vez", () => { assert.ok($('[data-k="pii"]').checked); assert.match(text(), /✓ sin correo ni teléfono/); });
  radio("mode", "enfocado");
  t("Modo enfocado: mini-prompt con tope de 200 y contador", () => { assert.equal($('[data-k="focus"]').getAttribute("maxlength"), "200"); assert.match(text(), /\d+\/200/); });
  click('[data-a="map"]');
  t("Modo enfocado analiza el mini-prompt (QA, CI/CD, API) sin separar deseables", () => { const c = $$(".chips span").map((s) => s.textContent); assert.ok(c.some((x) => /CI\/CD/.test(x))); assert.ok(c.some((x) => /API/.test(x))); assert.ok(!c.some((x) => /deseable/.test(x))); });
};
