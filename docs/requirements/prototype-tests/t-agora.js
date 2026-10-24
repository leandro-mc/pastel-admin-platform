const assert = require("node:assert/strict");
module.exports = async ({ w, d, $, $$, click, type, text, t, wait }) => {
  const go = async (h) => { w.location.hash = h; await wait(40); };
  const chk = (sel, v) => { const n = $(sel); n.checked = v; n.dispatchEvent(new w.Event("change", { bubbles: true })); };

  t("Inicio finito: bloque «Hoy en 5 minutos» con 2 piezas y 5 min en total", () => { assert.match(text(), /Hoy en 5 minutos/); assert.match(text(), /2 piezas · 5 min de lectura en total/); });
  t("Termina con «Está al día» y hay una sola marca de fin (sin scroll infinito)", () => { assert.equal($$(".end").length, 1); assert.match($(".end").textContent, /Está al día/); });
  t("Bienvenida sin cuenta la primera vez", () => { assert.match(text(), /¿Qué le interesa\?/); assert.match(text(), /solo en este navegador/); });
  click('[data-a="int"][data-i="Economía en casa"]'); click('[data-a="intok"]');
  t("Elegir intereses cierra la bienvenida y sube esa serie al inicio de las historias", () => { assert.ok(!/¿Qué le interesa\?/.test($("#main").textContent)); assert.match($(".story").textContent, /Economía en casa/); });
  t("Cada tarjeta muestra tipo, resumen de 20 s, sello y número de fuentes", () => $$("article.card").forEach((c) => { assert.match(c.textContent, /En 20 segundos/); assert.ok(c.querySelector(".seal svg"), "sello sin icono"); assert.match(c.querySelector(".seal").textContent.trim(), /Verificado|Pendiente|Modificada/); assert.match(c.textContent, /Fuentes \(\d+\)/); assert.match(c.querySelector(".chip").textContent, /Hechos|Análisis|Opinión/); }));
  t("Los tres estados del sello aparecen con su texto", () => { const s = text(); assert.match(s, /Verificado por Revisora Ejemplo/); assert.match(s, /Pendiente de verificación/); assert.match(s, /Modificada tras la verificación/); });
  t("Las tarjetas no muestran contadores públicos de vanidad", () => assert.ok(!/\d+\s*(me gusta|reacciones|compartidos)/i.test($("#main").textContent)));

  click('[data-a="mk"][data-k="guardar"]');
  t("Guardar marca el botón (aria-pressed) y avisa", () => { assert.equal($('[data-a="mk"][data-k="guardar"]').getAttribute("aria-pressed"), "true"); assert.match($("#toast").textContent, /Guardado/); });
  await go("#/guardados");
  t("Guardados muestra la pieza guardada", () => assert.ok($$("article.card").length === 1));

  await go("#/p/presupuesto");
  t("Pieza: Se sabe / No se sabe / Por qué importa / Fuentes / Cómo sabemos esto", () => { const s = text(); ["Se sabe", "No se sabe", "Por qué importa", "Fuentes (3)", "Cómo sabemos esto", "Se revisó que la descripción general"].forEach((x) => assert.ok(s.includes(x), x)); });
  click('[data-a="term"][data-k="ingresos"]');
  t("Glosario en línea: tocar el término muestra su definición", () => { assert.match($(".pop").textContent, /Dinero que el Estado recibe/); assert.equal($('[data-a="term"][data-k="ingresos"]').getAttribute("aria-expanded"), "true"); });
  const r0 = $('input[data-a="qa"][data-q="0"][value="1"]'); r0.checked = true; r0.dispatchEvent(new w.Event("change", { bubbles: true }));
  t("¿Qué entendí?: una respuesta incorrecta explica sin puntuar", () => assert.match($(".q .res").textContent, /Revise: El Ejecutivo lo propone/));
  const r1 = $('input[data-a="qa"][data-q="0"][value="0"]'); r1.checked = true; r1.dispatchEvent(new w.Event("change", { bubbles: true }));
  t("¿Qué entendí?: la correcta se confirma", () => assert.match($(".q .res").textContent, /^Correcto\./));
  t("Compartir por WhatsApp lleva título, sello y resumen", () => { const href = decodeURIComponent($('a[href^="https://wa.me/?text="]').getAttribute("href")); assert.match(href, /¿Qué es el presupuesto nacional/); assert.match(href, /Verificado por Revisora Ejemplo/); assert.match(href, /En 20 segundos: El presupuesto es el plan/); assert.match(href, /#\/p\/presupuesto/); });
  t("Vista previa tipo WhatsApp con el sello", () => assert.match($(".wa").textContent, /Verificado por Revisora Ejemplo/));
  click("details summary"); $("#err").value = "El segundo párrafo omite una fuente"; click('[data-a="err"]');
  t("Señalar un error llega a la bandeja editorial", () => assert.match($("#toast").textContent, /bandeja editorial/));
  await go("#/p/deuda");
  t("Corrección visible con fecha en una pieza modificada tras verificar", () => assert.match($(".seal.mod[style]").textContent, /20 oct: Se aclaró la diferencia entre deuda/));
  await go("#/p/inflacion");
  t("Pieza sin verificar lo dice con claridad", () => assert.match(text(), /todavía no ha sido verificada por una persona revisora/));

  await go("#/");
  click("#calm");
  t("Modo calma: se oculta la actualidad enlazada y se informa", () => { assert.equal($("#calm").getAttribute("aria-pressed"), "true"); assert.ok(!/Actualidad enlazada/.test($("#rail").textContent)); assert.match($("#main").textContent, /Modo calma activo/); });
  await go("#/f/actualidad");
  t("En Modo calma la sección Actualidad no muestra noticias duras", () => assert.match($("#main").textContent, /Modo calma activo: la actualidad dura está oculta/));
  click("#calm");
  await go("#/f/actualidad");
  t("Sin Modo calma la actualidad enlaza al medio original con contexto propio", () => { assert.match($("#main").textContent, /Contexto de Ágora/); assert.ok($('a[rel~="noopener"]')); });

  click('[data-sz="2"]');
  t("Texto A++ sube el tamaño base a 21 px y marca el botón", () => { assert.equal(d.documentElement.style.getPropertyValue("--fs"), "21px"); assert.equal($('[data-sz="2"]').getAttribute("aria-pressed"), "true"); });
  click("#theme"); click("#theme");
  t("Tema alterna entre automático, oscuro y claro", () => assert.equal(d.documentElement.dataset.theme, "light"));

  await go("#/");
  type("#q", "whatsapp");
  t("La búsqueda filtra por título", () => { assert.equal($$("article.card").length, 1); assert.match($("article.card").textContent, /Cuatro preguntas/); });
  type("#q", "");

  await go("#/editorial");
  t("Compositor: «Marcar como lista» bloqueado hasta cumplir la lista de control", () => { assert.ok($('[data-a="ready"]').disabled); assert.ok($$(".chk .x").length >= 6); });
  const set = (k, v) => { const n = $(`[data-e="${k}"]`); n.value = v; n.dispatchEvent(new w.Event("input", { bubbles: true })); n.dispatchEvent(new w.Event("change", { bubbles: true })); };
  set("title", "¿Qué es un decreto?"); set("sum", "x".repeat(300));
  t("Resumen > 280 caracteres marca el contador y falla la lista", () => { assert.ok($(".cnt.over")); assert.ok($$(".chk li").some((l) => /280/.test(l.textContent) && l.querySelector(".x"))); });
  set("sum", "Un decreto es una norma que dicta el Poder Ejecutivo."); set("type", "hechos"); set("know", "Lo dicta el Ejecutivo."); set("unk", "Cuántos hay vigentes."); set("src", "Fuente uno https://example.org/a\nFuente dos https://example.org/b");
  chk('[data-e="alt"]', true); chk('[data-e="orig"]', true); chk('[data-e="gl"]', true);
  t("Con todo cumplido la lista queda en verde y se habilita el envío a revisión", () => { assert.equal($$(".chk .x").length, 0); assert.ok(!$('[data-a="ready"]').disabled); });
  click('[data-a="ready"]');
  t("El envío aclara que el sello lo otorga otra persona", () => assert.match($("#toast").textContent, /persona revisora/));
  t("La vista previa refleja el borrador como «Pendiente»", () => { const pv = $$("article.card").pop(); assert.match(pv.textContent, /¿Qué es un decreto\?/); assert.match(pv.textContent, /Pendiente de verificación/); assert.match(pv.textContent, /Fuentes \(2\)/); });
};
