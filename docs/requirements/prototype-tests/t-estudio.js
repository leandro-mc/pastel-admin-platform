const assert = require("node:assert/strict");
module.exports = async ({ w, d, $, $$, click, type, text, t, wait }) => {
  w.__NOWAIT = true;
  const asRole = async (id) => { const s = $("#dk-role"); s.value = id; s.dispatchEvent(new w.Event("change", { bubbles: true })); await wait(10); };
  const sel = (k, v) => { const n = $(`[data-k="${k}"]`); n.value = v; n.dispatchEvent(new w.Event("change", { bubbles: true })); };
  const chk = (k, v) => { const n = $(`[data-k="${k}"]`); n.checked = v; n.dispatchEvent(new w.Event("change", { bubbles: true })); };
  const waitRes = async () => { for (let i = 0; i < 200; i++) { if ($(".paper")) return; await wait(20); } };
  const run = async () => { click('[data-a="map"]'); click('[data-a="gen"]'); await waitRes(); };
  const luNums = () => { const n = $$(".box .num"); return [parseFloat(n[0].textContent), parseFloat(n[1].textContent)]; };
  const ckAll = () => $$(".chk li").every((li) => li.querySelector(".ok"));
  const sec = (id) => click(`[data-a="sec"][data-id="${id}"]`);

  // ── Propietaria: el banco es un cuaderno de texto largo ──
  t("Barra de desarrollo con 3 roles; arranca como propietaria y el banco avisa que es privado", () => { assert.equal($("#dk-role").options.length, 3); assert.equal($("#dk-role").value, "owner"); assert.match($(".banner").textContent, /privado.*nunca se publica ni se envía/); });
  t("Banco: 11 secciones con su estado (historia, experiencia, habilidades y por qué, proyectos, educación, certificados, idiomas, otros, privado, voz, encabezado)", () => { assert.equal($$("#snav button").length, 11); const n = $("#snav").textContent; ["Mi historia", "Experiencia", "Habilidades y por qué", "Proyectos", "Educación", "Certificados", "Idiomas", "Privado: filtros y preferencias", "Mi voz"].forEach((x) => assert.ok(n.includes(x), x)); });
  t("Experiencia: cada entrada tiene un área de texto GRANDE con el relato (no viñetas sueltas)", () => { const tas = $$("textarea.big"); assert.equal(tas.length, 3); assert.ok(tas[0].value.split(/\s+/).length > 100, "relato corto"); assert.match(tas[0].value, /Entré a Empresa Ejemplo/); });
  t("El sistema deriva logros del relato: 7 logros, 6 con cifra y 1 sin cifra con la pregunta que hará", () => { const dv = $("#d-exps-0").textContent; assert.match(dv, /7 logros · 6 con cifra/); assert.match(dv, /1 sin cifra/); assert.match(dv, /El sistema le preguntará/); });
  const ta = $('textarea[data-p="exps.0.text"]'); ta.value += "\n\nMigré 3 servicios a contenedores en 2 semanas."; ta.dispatchEvent(new w.Event("input", { bubbles: true }));
  t("Al seguir escribiendo, los logros se actualizan al instante sin perder el texto", () => { assert.match($("#d-exps-0").textContent, /8 logros · 7 con cifra/); assert.match($('textarea[data-p="exps.0.text"]').value, /Migré 3 servicios/); assert.match($('[data-w="exps.0.text"]').textContent, /\d+ palabras/); assert.match($("#saved").textContent, /Guardado/); });
  sec("skills");
  t("Habilidades: cada una explica «por qué la tengo» y se ve cuáles tienen respaldo en logros", () => { const s = text(); assert.match(s, /Lo uso a diario|Es mi herramienta principal/); assert.ok($$(".tag.k").some((x) => /logro\(s\) la respaldan/.test(x.textContent))); const docker = $$(".entry").find((e) => /Docker/.test(e.querySelector(".hd").textContent)); assert.match(docker.textContent, /sin logro que la respalde/); });
  sec("projects"); t("Proyectos: separa «qué hace» de «cómo está hecho»", () => { assert.match(text(), /¿Qué hace y para quién\?/); assert.match(text(), /¿Cómo está hecho\?/); });
  sec("privado"); t("Privado: filtros y preferencias que nunca salen en un CV", () => { assert.match($("#editor").textContent, /nunca.*sale en un CV/); assert.ok($('input[data-p="privado.modalidad"]')); assert.ok($('input[data-p="privado.pretension"]')); });
  sec("exps"); click('[data-a="add"][data-k="exps"]');
  t("Agregar una experiencia crea una entrada vacía lista para contar", () => assert.equal($$("textarea.big").length, 4));
  click('[data-a="del"][data-k="exps"][data-i="3"]'); t("Quitar una experiencia", () => assert.equal($$("textarea.big").length, 3));

  // ── Crear CV: una sola pantalla con vista previa viva ──
  click('[data-a="tab"][data-id="crear"]');
  t("Crear CV: nivel sugerido por los años de experiencia profesional (6 años → Mid)", () => { assert.match(text(), /Con 6 años de experiencia profesional se sugiere/); assert.match($('[data-k="level"]').textContent, /Mid-level.*sugerido/); });
  t("Antes de generar hay un estado vacío útil (no un callejón sin salida)", () => { assert.match($(".sticky").textContent, /Aquí aparecerá su CV/); assert.ok($('[data-a="sample"]')); });
  t("Sin analizar, «Generar CV» no existe todavía", () => assert.ok(!$('[data-a="gen"]')));
  click('[data-a="map"]');
  t("Mapa de evidencia honesto: Playwright ✓, JMeter ~ adyacente k6, Kubernetes ✕ brecha", () => { const c = $$(".chips span").map((s) => s.textContent); assert.ok(c.some((x) => /^✓ Playwright/.test(x))); assert.ok(c.some((x) => /^~ JMeter.*adyacente: k6/.test(x))); assert.ok(c.some((x) => /^✕ Kubernetes.*brecha/.test(x))); });
  t("Filtros duros: 5 requisitos eliminatorios comparados con los datos privados, todos cumplidos", () => { const rows = $$(".hard tr").slice(1); assert.equal(rows.length, 5); assert.ok(rows.every((r) => r.querySelector(".ok"))); const s = $(".hard").textContent; assert.match(s, /3 años de experiencia en automatización de pruebas/); assert.match(s, /6 años/); assert.match(s, /Inglés B2/); assert.match(s, /Trabajo remoto/); });
  click('[data-a="gen"]'); await waitRes();
  t("Mid/Carta: el CV aparece en la vista previa sin cambiar de pestaña y respeta el cupo (≤ 97 LU)", () => { assert.ok($(".paper")); assert.match($(".paper h4").textContent, /Marta Solís Araya/); const [a, c] = luNums(); assert.equal(c, 97); assert.ok(a <= c); assert.match($(".paper").textContent, /Perfil profesional/); });
  t("La escalera de ajuste actuó y el reporte ATS tiene las 10 comprobaciones en verde", () => { assert.match($("ol").textContent, /Paso 1|Paso 2/); click('[data-a="pv"][data-id="rep"]'); assert.equal($$(".chk li").length, 10); assert.ok(ckAll()); });
  t("Vista «Lo que ve el ATS»: texto en orden de lectura, fecha en la misma línea y sin Kubernetes inventado", () => { click('[data-a="pv"][data-id="ats"]'); const pre = $("pre.cv").textContent; assert.match(pre, /QA Automation Engineer, Empresa Ejemplo S\.A\., San José, CR\s+Mar 2022 - Presente/); assert.ok(!/kubernetes/i.test(pre)); assert.ok(pre.indexOf("Habilidades técnicas") < pre.indexOf("Experiencia laboral")); });
  t("Exportación: PDF y Word de muestra; LaTeX queda para la fase 2", () => { const hrefs = $$("a[download]").map((a) => a.getAttribute("href")); assert.ok(hrefs.some((h) => /mid-qa-fullstack\.pdf$/.test(h))); assert.ok(hrefs.some((h) => /mid-qa-fullstack\.docx$/.test(h))); assert.ok($$("button[disabled]").some((b) => /LaTeX/.test(b.textContent))); });

  // ── Guardián de verdad ──
  click('[data-a="ed"]'); type('[data-k="edtext"]', "Automaticé 999 pruebas con Playwright en tiempo récord."); click('[data-a="edsave"]');
  t("Editar con una cifra nueva se rechaza", () => assert.match($(".err").textContent, /Cifra nueva «999»/));
  type('[data-k="edtext"]', "x".repeat(200)); click('[data-a="edsave"]'); t("Editar por encima del tope duro se rechaza", () => assert.match($(".err").textContent, /Excede el tope duro \(200\/175/));
  type('[data-k="edtext"]', "Líder orientado a resultados con 140 pruebas."); click('[data-a="edsave"]'); t("Una frase prohibida se rechaza", () => assert.match($(".err").textContent, /Frase prohibida/));
  type('[data-k="edtext"]', "Automaticé 140 pruebas con Playwright; la regresión bajó de 2 días a 3 horas."); click('[data-a="edsave"]'); t("Edición con cifras del banco se acepta", () => assert.match($("#toast").textContent, /Línea guardada/));

  // ── Niveles ──
  sel("level", "junior"); await run();
  t("Junior/Carta: 1 página (≤ 50 LU), perfil ≤ 270 caracteres y todo en verde", () => { const [a, c] = luNums(); assert.equal(c, 50); assert.ok(a <= 50, "LU " + a); click('[data-a="pv"][data-id="rep"]'); assert.ok(ckAll()); click('[data-a="pv"][data-id="page"]'); const sum = $(".paper .sec").nextElementSibling.textContent; assert.ok(sum.length <= 270, sum.length); });
  sel("level", "senior"); sel("paper", "a4"); await run();
  t("Senior/A4: cupo 109 LU y cumple", () => { const [a, c] = luNums(); assert.equal(c, 109); assert.ok(a <= 109); });

  // ── Primera vez ──
  await asRole("primera");
  t("Primera vez: bienvenida, banco vacío y todas las secciones piden contar", () => { assert.match($(".banner").textContent, /Bienvenida/); assert.equal($$("#snav .st.no").length >= 8, true); assert.match($("#editor").textContent, /Mi historia/); });
  click('[data-a="tab"][data-id="crear"]');
  t("Primera vez: Crear CV explica qué falta y lleva de vuelta al banco", () => { assert.match($("#view").textContent, /Todavía no hay material para armar un CV/); assert.ok($('[data-a="tab"][data-id="banco"].go')); });
  click('[data-a="tab"][data-id="banco"].go'); sec("exps"); click('[data-a="add"][data-k="exps"]');
  const t0 = $('textarea[data-p="exps.0.text"]'); t0.value = "Entré como ayudante. Automaticé el cierre de caja y reduje 2 horas diarias de trabajo."; t0.dispatchEvent(new w.Event("input", { bubbles: true }));
  t("Primera vez: al contar un logro, el sistema lo entiende y lo muestra", () => assert.match($("#d-exps-0").textContent, /1 logros? · 1 con cifra/));
  click('[data-a="tab"][data-id="crear"]'); t("Con un logro ya se habilita el flujo de creación", () => assert.match($("#view").textContent, /¿Para qué puesto\?/));

  // ── Invitada (F3) ──
  await asRole("invitada");
  t("Invitada: su banco es solo suyo y tiene cuota compartida", () => { assert.match($(".banner").textContent, /Modo invitada/); assert.match($(".banner").textContent, /ni la propietaria ni nadie más/); });
  click('[data-a="tab"][data-id="crear"]');
  t("Invitada: no maneja claves de IA, usa la cuota compartida", () => assert.match($("details.box").textContent, /cuota compartida/));
  await run(); sel("level", "mid"); await run(); sel("level", "mid"); await run();
  t("Invitada: tras 3 CV en la semana se bloquea el cuarto con el motivo", () => { assert.ok($('[data-a="gen"]').disabled); assert.match($("#view").textContent, /límite de 3 CV esta semana/); });

  click('#devbar [data-t="light"]'); t("Tema claro", () => assert.equal(d.documentElement.dataset.theme, "light"));
  click('#devbar [data-t="dark"]'); t("Tema oscuro", () => assert.equal(d.documentElement.dataset.theme, "dark"));
};
