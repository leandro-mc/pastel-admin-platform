const assert = require("node:assert/strict");
module.exports = async ({ w, d, $, $$, click, type, text, t, wait }) => {
  const go = async (h) => { w.location.hash = h; await wait(40); };
  const asRole = async (id) => { const s = $("#dk-role"); s.value = id; s.dispatchEvent(new w.Event("change", { bubbles: true })); await wait(10); };
  const chk = (sel, v) => { const n = $(sel); n.checked = v; n.dispatchEvent(new w.Event("change", { bubbles: true })); };
  const nav = () => $$("#side a").map((a) => a.textContent.trim());
  const tbl = () => { const rows = [...$$(".tbl")].pop() && [...$$(".tbl")].find((x) => /Capacidad/.test(x.textContent)); const heads = [...rows.querySelectorAll("tr:first-child th")].slice(1).map((h) => h.textContent.trim()); const m = {}; [...rows.querySelectorAll("tr")].slice(1).forEach((r) => { const c = [...r.children]; m[c[0].textContent.trim()] = Object.fromEntries(heads.map((h, i) => [h, c[i + 1].textContent.trim() === "✓"])); }); return m; };

  // ── Visitante ──
  t("La barra de desarrollo existe, lista 8 roles y arranca como Visitante", () => { assert.ok($("#devbar")); assert.equal($("#dk-role").options.length, 8); assert.equal($("#dk-role").value, "anon"); assert.match($("#dk-desc").textContent, /Lee, busca y comparte/); });
  t("Visitante: inicio finito con «Hoy en 5 minutos» (2 piezas · 5 min) y «Está al día»", () => { assert.match(text(), /2 piezas · 5 min de lectura en total/); assert.equal($$(".end").length, 1); assert.match($(".end").textContent, /Está al día/); });
  t("Visitante: navegación sin Guardados/Redactar/Revisión/Curaduría/Bandeja/Administración", () => { const n = nav().join("|"); assert.ok(/Escucha ciudadana/.test(n)); ["Guardados", "Redactar", "Revisión", "Curaduría", "Bandeja", "Administración"].forEach((x) => assert.ok(!n.includes(x), x)); });
  t("Visitante: las tarjetas invitan a crear cuenta en lugar de mostrar guardar/reaccionar", () => { const c = $("article.card"); assert.ok(!/Me ayudó a entender/.test(c.textContent)); assert.match(c.textContent, /Cree su cuenta/); });
  t("Visitante: los iconos de series son SVG con significado (no letras sueltas)", () => { const s = $$(".story span"); assert.equal(s.length, 5); assert.ok(s.every((x) => x.querySelector("svg"))); });
  await go("#/revision");
  t("Visitante: /revisión muestra «Sin permiso» con el motivo y a quién corresponde", () => { assert.match($("#main").textContent, /Esta sección es para una revisora especialista/); assert.match($("#main").textContent, /persona distinta de quien escribe/); });
  await go("#/escucha");
  t("Visitante: en la escucha puede leer pero no votar", () => { assert.match($("#main").textContent, /Para votar:/); assert.equal($$(".vote").length, 0); assert.match($("#main").textContent, /Acuerdos entre todos los grupos/); });
  t("La escucha dice que no es representativa y que no hay comentarios", () => { assert.match($("#main").textContent, /no representa a toda la población/); assert.match($("#main").textContent, /No hay comentarios ni respuestas entre personas/); });
  await go("#/p/presupuesto");
  t("Visitante: compartir exige marcar que leyó la pieza (fricción antes de compartir)", () => { const a = $('.acts a.btn'); assert.equal(a.getAttribute("aria-disabled"), "true"); click('[data-a="shareok"]'.replace('[data-a', 'input[data-a')); const b = $(".acts a.btn"); assert.match(b.getAttribute("href"), /^https:\/\/wa\.me\/\?text=/); });
  t("Visitante no puede señalar errores: se le ofrece crear cuenta", () => { assert.ok(!$("#err")); assert.match($("#main").textContent, /¿Encontró un error\?/); });
  await go("#/p/inflacion");
  t("Análisis con bloque «Perspectivas»: dónde coinciden / difieren / qué evidencia cambiaría", () => { const s = text(); ["Dónde coinciden", "Dónde difieren", "Qué evidencia cambiaría la conversación"].forEach((x) => assert.ok(s.includes(x), x)); });
  await go("#/p/voces");
  t("Formato «Voces cercanas»: personas con razones distintas y datos que faltan", () => { assert.match(text(), /Voces cercanas/); assert.match(text(), /Doña Marta \(ejemplo\)/); assert.match(text(), /Don Luis \(ejemplo\)/); });

  // ── Persona registrada ──
  await asRole("lector"); await go("#/");
  t("Lectora: ve Guardados y sigue sin ver Redactar/Revisión", () => { const n = nav().join("|"); assert.ok(n.includes("Guardados")); assert.ok(!n.includes("Redactar") && !n.includes("Revisión")); });
  click('[data-a="mk"][data-k="guardar"]');
  t("Lectora: guardar funciona y aparece en Guardados", async () => { assert.equal($('[data-a="mk"][data-k="guardar"]').getAttribute("aria-pressed"), "true"); });
  await go("#/guardados"); t("Guardados lista la pieza guardada", () => assert.equal($$("article.card").length, 1));
  await go("#/escucha");
  click('[data-a="vote"][data-id="s1"][data-v="d"]'); click('[data-a="vote"][data-id="s3"][data-v="a"]');
  t("Lectora: con menos de 3 votos no se ven los resultados", () => assert.match($("#main").textContent, /Vote al menos 3 afirmaciones para ver los resultados \(2\/3\)/));
  click('[data-a="vote"][data-id="s4"][data-v="a"]');
  t("Lectora: con 3 votos ve acuerdos entre grupos (s3,s4,s5,s6) y divisiones (s1,s2)", () => { const s = $("#main").textContent; assert.match(s, /Acuerdos entre todos los grupos/); const h = [...$$("#main h3")]; const cons = $("#main").innerHTML.split("Dónde las opiniones se dividen"); assert.ok(/horarios y paradas/.test(cons[0]) && /seguridad en las paradas/.test(cons[0])); assert.ok(/pase seguido/.test(cons[1]) && /llegue a más barrios/.test(cons[1])); });
  type("#prop", "El bus debería pasar los domingos."); click('[data-a="prop"]');
  t("Lectora: proponer una afirmación la envía a moderación", () => assert.match($("#toast").textContent, /Enviada a moderación/));
  await go("#/p/presupuesto"); $("#err").value = "Falta una fuente"; click('[data-a="err"]');
  t("Lectora: señalar error llega a la bandeja", () => assert.match($("#toast").textContent, /bandeja editorial/));
  await go("#/editorial"); t("Lectora: Redactar muestra «Sin permiso»", () => assert.match($("#main").textContent, /Esta sección es para una colaboradora o editora/));

  // ── Colaboradora ──
  await asRole("colab"); await go("#/editorial");
  t("Colaboradora: puede redactar y la lista de control bloquea el envío", () => { assert.match($("#main").textContent, /Lista de control de publicación/); assert.ok($('[data-a="ready"]').disabled); });
  await go("#/revision"); t("Colaboradora: no puede revisar (separación: quien escribe no verifica)", () => assert.match($("#main").textContent, /Esta sección es para una revisora especialista/));

  // ── Revisora ──
  await asRole("revisor"); await go("#/revision");
  t("Revisora: ve la cola de piezas sin sello vigente", () => { assert.match($("#main").textContent, /Cola de revisión/); assert.ok($$('[data-a="rvsel"]').length >= 3); });
  click('[data-a="rvsel"][data-id="contexto"]');
  t("Revisora: no puede otorgar sello a una pieza que escribió ella (separación de funciones)", () => { assert.match($("#main").textContent, /Usted escribió esta pieza/); assert.ok($('[data-a="grant"]').disabled); });
  click('[data-a="rvsel"][data-id="inflacion"]'); [0, 1, 2].forEach((i) => chk(`[data-a="rvck"][data-i="${i}"]`, true));
  t("Revisora: sin alcance escrito (≥20 caracteres) no se puede otorgar", () => assert.ok($('[data-a="grant"]').disabled));
  const sc = $('[data-a="rvscope"]'); sc.value = "Se comprobaron las dos fuentes oficiales y las definiciones de IPC."; sc.dispatchEvent(new w.Event("input", { bubbles: true }));
  t("Revisora: con las tres comprobaciones y el alcance, se habilita el sello", () => assert.ok(!$('[data-a="grant"]').disabled));
  click('[data-a="grant"]'); await go("#/p/inflacion");
  t("El sello queda otorgado con su alcance escrito", () => { assert.match($(".seal").textContent, /Verificado por Revisora \(usted\)/); assert.match($("#main").textContent, /Se comprobaron las dos fuentes oficiales/); });
  await go("#/curaduria"); t("Revisora: Curaduría no le corresponde", () => assert.match($("#main").textContent, /Esta sección es para una editora/));

  // ── Editora ──
  await asRole("editor"); await go("#/curaduria");
  t("Editora: ve el tope de 5 minutos y está dentro", () => { assert.match($("#main").textContent, /Seleccionado: 5 min/); assert.match($("#main").textContent, /Dentro del tope/); });
  chk('[data-a="today"][data-id="inflacion"]', true);
  t("Editora: al pasar de 5 minutos se advierte", () => assert.match($("#main").textContent, /Pasa de 5 minutos/));
  await go("#/"); t("El inicio refleja la curaduría (3 piezas)", () => assert.match(text(), /3 piezas · 9 min de lectura en total/));
  await go("#/revision"); t("Editora no otorga sellos", () => assert.match($("#main").textContent, /Quien cura no otorga sellos/));

  // ── Moderadora ──
  await asRole("moderador"); await go("#/bandeja");
  t("Moderadora: la bandeja aclara que se modera lo factual y no las opiniones", () => assert.match($("#main").textContent, /no las opiniones/));
  click('[data-a="bres"][data-k="errors"]');
  t("Moderadora: derivar un error avisa a quien lo señaló", () => assert.match($("#toast").textContent, /se avisó a quien lo señaló/));
  click('[data-a="bres"][data-k="props"][data-v="rechazada"]');
  t("Moderadora: puede rechazar una propuesta con ataque personal", () => assert.ok($$(".tag").some((x) => x.textContent === "rechazada")));
  await go("#/editorial"); t("Moderadora no edita contenido", () => assert.match($("#main").textContent, /Esta sección es para una colaboradora o editora/));

  // ── Administrador ──
  await asRole("admin"); await go("#/admin");
  t("Admin: ve cuentas, matriz de permisos y auditoría", () => { const s = $("#main").textContent; assert.match(s, /Cuentas y roles/); assert.match(s, /Matriz de permisos/); assert.match(s, /Auditoría/); });
  t("Matriz: separación de funciones (review solo revisora/propietario; curate solo editora/propietario; moderate solo moderadora/propietario; admin solo admin/propietario)", () => {
    const m = tbl(), only = (cap, ...ok) => Object.entries(m[cap]).filter(([, v]) => v).map(([k]) => k).sort().join(",") === ok.sort().join(",");
    assert.ok(only("Otorgar sello", "Revisora", "Propietario")); assert.ok(only("Curar «Hoy en 5 minutos»", "Editora", "Propietario")); assert.ok(only("Moderar bandeja", "Moderadora", "Propietario")); assert.ok(only("Gestionar cuentas y roles", "Admin", "Propietario"));
    assert.ok(only("Redactar y enviar a revisión", "Colaboradora", "Propietario")); assert.ok(only("Ajustes de la plataforma", "Propietario"));
  });
  t("Admin: no puede asignar el rol de propietario", () => assert.ok([...$$('select[data-a="urole"] option[value="owner"]')].every((o) => o.disabled)));
  const us = $('select[data-a="urole"][data-i="0"]'); us.value = "colab"; us.dispatchEvent(new w.Event("change", { bubbles: true }));
  t("Admin: cambiar un rol queda en la auditoría", () => { assert.match($("#toast").textContent, /Rol actualizado y auditado/); assert.match($("#main").textContent, /cambió el rol de Ana \(ejemplo\): lector → colab/); });
  t("Admin: no ve los ajustes de propietario", () => assert.ok(!/Ajustes de la plataforma \(solo propietario\)/.test($("#main").textContent)));
  await go("#/revision"); t("Admin no verifica", () => assert.match($("#main").textContent, /Esta sección es para una revisora especialista/));

  // ── Propietario ──
  await asRole("owner");
  t("Propietario: ve todas las secciones", () => ["Guardados", "Redactar", "Revisión", "Curaduría", "Bandeja", "Administración"].forEach((x) => assert.ok(nav().includes(x), x)));
  await go("#/admin"); t("Propietario: ve ajustes y los comentarios abiertos bloqueados hasta «Comunidad»", () => { assert.match($("#main").textContent, /Ajustes de la plataforma \(solo propietario\)/); assert.match($("#main").textContent, /bloqueado hasta la etapa «Comunidad»/); });

  // ── Tema y accesibilidad ──
  click('#devbar [data-t="dark"]'); t("Tema oscuro desde la barra de desarrollo", () => assert.equal(d.documentElement.dataset.theme, "dark"));
  click('#devbar [data-t="light"]'); t("Tema claro", () => assert.equal(d.documentElement.dataset.theme, "light"));
  click('#devbar [data-t="auto"]'); t("Tema automático (sigue al sistema)", () => assert.equal(d.documentElement.dataset.theme, undefined));
  click('[data-sz="2"]'); t("Texto A++ a 21 px", () => assert.equal(d.documentElement.style.getPropertyValue("--fs"), "21px"));
  click("#calm"); t("Modo calma oculta la actualidad enlazada", () => assert.ok(!/Actualidad enlazada/.test($("#rail").textContent)));
};
