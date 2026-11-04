const assert = require("node:assert/strict");
module.exports = async ({ w, d, $, $$, click, type, text, t, wait }) => {
  const asRole = async (id) => { const s = $("#dk-role"); s.value = id; s.dispatchEvent(new w.Event("change", { bubbles: true })); await wait(10); };
  const nav = () => $$("#side nav button").map((b) => b.textContent.trim());
  const go = (m) => click(`#side nav [data-nav="${m}"]`);
  const num = (sel, set, v) => { const n = $(sel); n.value = v; n.dispatchEvent(new w.Event("input", { bubbles: true })); n.dispatchEvent(new w.Event("change", { bubbles: true })); };
  const kgs = () => $$(".tbl .kgc").map((n) => parseFloat(n.textContent.replace(/\./g, "").replace(",", ".")));
  const sel = (sel, v) => { const n = $(sel); n.value = v; n.dispatchEvent(new w.Event("change", { bubbles: true })); };
  const cb = (sel, v) => { const n = $(sel); n.checked = v; n.dispatchEvent(new w.Event("change", { bubbles: true })); };

  // ── Estructura general ──
  t("Barra de desarrollo con 9 roles; arranca como propietario", () => { assert.equal($("#dk-role").options.length, 9); assert.equal($("#dk-role").value, "owner"); });
  t("Propietario: ve los 9 módulos internos, incluida la gestión de permisos", () => assert.deepEqual(nav(), ["Hoy", "Mercado", "Envíos", "Recepción", "Entregas", "Reclamos", "Dinero", "Productores", "Equipo y permisos"]));
  t("Hoy (propietario): 4 indicadores, siguiente mejor acción y agenda del día", () => { assert.equal($$(".kpi").length, 4); assert.match($("#view").textContent, /Convocar a 8 productores para el envío/); assert.match($("#view").textContent, /Agenda de hoy/); assert.match($("#view").textContent, /Caja negativa la semana del 17 nov/); });
  t("Escritorio con barra lateral; móvil con pestañas (hasta 4 + «Más»)", () => { assert.ok($("#side .brand")); assert.equal($$("#tabs button").length, 5); assert.match($("#tabs").textContent, /Más/); });

  // ── Envíos ──
  go("envios");
  t("Envíos: tabla de 8 productores con asignado, equidad, estado y contacto; suma = pedido (480 kg)", () => { assert.equal($$(".tbl tbody tr").length, 8); assert.equal(kgs().reduce((a, b) => a + b, 0), 480); assert.match($(".summ").textContent, /Pedido480 kg/); assert.ok($$(".tbl td .chip").some((c) => /\+\d+ %/.test(c.textContent))); });
  num('[data-a="ops:cap"][data-id="p3"]', 0, "20");
  t("Tope de 20 kg a Don Efraín se respeta y el total sigue en 480", () => { const row = $$(".tbl tbody tr")[2]; assert.match(row.querySelector(".kgc").textContent, /^20 kg/); assert.equal(kgs().reduce((a, b) => a + b, 0), 480); });
  num('[data-a="ops:cap"][data-id="p3"]', 0, "");
  t("Cada fila explica «¿Por qué esta cantidad?» (equidad explicable)", () => assert.match($(".tbl tbody tr").textContent, /ajuste de equidad/));
  click('[data-a="ops:queue"]');
  t("Cola abre con Don Mario por WhatsApp y el mensaje es de usted", () => { assert.ok(!$("#sheet").hidden); assert.match($("#sheet").textContent, /Don Mario/); assert.match($("#sheet").textContent, /Buenos días, Don Mario/); assert.match($("#sheet").textContent, /le pedimos/); assert.ok($("#sheet a[href^='https://wa.me/506']")); });
  click('#sheet [data-a="ops:resp"][data-st="ok"]'); click('#sheet [data-a="ops:resp"][data-st="ok"]');
  t("Don Efraín prefiere llamada: se le da guion y botón de llamar (no WhatsApp)", () => { assert.match($("#sheet").textContent, /Don Efraín/); assert.ok($("#sheet a[href^='tel:']")); assert.match($("#sheet").textContent, /Guion/); });
  click('#sheet [data-a="ops:resp"][data-st="ok"]'); click('#sheet [data-a="ops:resp"][data-st="ok"]');
  t("Don Rafa prefiere nota de voz: se ofrece grabarla", () => { assert.match($("#sheet").textContent, /Don Rafa/); assert.ok($('#sheet [data-a="ops:voice"]')); });
  click('#sheet [data-a="ops:resp"][data-st="ok"]'); click('#sheet [data-a="ops:resp"][data-st="ok"]');
  t("Don Beto no usa WhatsApp: el aviso va por el enlace de zona", () => { assert.match($("#sheet").textContent, /Don Beto/); assert.ok($('#sheet [data-a="ops:link"]')); });
  click('#sheet [data-a="ops:resp"][data-st="no"]');
  t("«No puede» redistribuye entre los demás y el total sigue exacto", () => { assert.match($("#toast").textContent, /se redistribuyeron \d+ kg/); assert.equal(kgs().reduce((a, b) => a + b, 0), 480); });
  click('#sheet [data-a="ops:resp"][data-st="ok"]'); click("[data-close]");

  // ── Recepción y modos ──
  go("recepcion");
  t("Recepción: 90 − 10 = 80 kg aceptados, lote y reloj de frescura; el gestor ve el anticipo estimado", () => { assert.match($(".summ").textContent, /80 kg/); assert.match($(".summ").textContent, /RB-\d{6}-P1/); assert.match($(".summ").textContent, /Fresca/); assert.match($(".summ").textContent, /Anticipo estimado/); });
  num('[data-a="ops:rc"][data-k="hh"]', 0, "30"); num('[data-a="ops:rc"][data-k="temp"]', 0, "18");
  t("A las 30 h «Vence pronto» y 18 °C avisa de cadena de frío rota (icono + texto)", () => { assert.match($(".summ").textContent, /Vence pronto/); assert.match($(".summ").textContent, /más de 15 °C/); });
  click("#offbtn"); click('[data-a="ops:save"]');
  t("Sin conexión: la recepción se guarda en el teléfono y queda en cola", () => { assert.ok(!$("#offline").hidden); assert.match($("#offline").textContent, /Pendientes: 1/); });
  click("#offbtn"); t("Al volver la señal se sincroniza", () => { assert.ok($("#offline").hidden); assert.match($("#toast").textContent, /sincronizados/); });

  // ── Reclamos y política ──
  go("reclamos");
  t("Reclamos: la política (8 h, 3 fotos, tolerancias, fondo) está visible", () => { const s = $("#view").textContent; assert.match(s, /hasta 8 horas/); assert.match(s, /3 fotos/); assert.match(s, /no se le cobra al productor/); assert.match(s, /fondo de reclamos/i); });
  click('[data-a="ops:cl"][data-id="c1"]');
  t("Reclamo dentro de ventana (15 % de 40 kg, oscurecimiento) → crédito del 50 % = ₡ 4 050 que sale del fondo", () => { const s = $(".summ").textContent; assert.match(s, /Crédito del 50 %/); assert.match(s, /₡ 4 050/); assert.match(s, /no se descuenta al productor/); assert.match(s, /Frío \/ manejo/); });
  click('[data-a="ops:cl"][data-id="c2"]');
  t("Reclamo fuera de ventana (20 h) → se considera aceptado", () => assert.match($(".summ").textContent, /Fuera de ventana: se considera aceptada/));

  // ── Dinero (modelo de pago) ──
  go("dinero");
  t("Pagos: pool de ₡ 644 000 en ventas; costos, fondo (3 %) y gestión (8 %) y neto a repartir calculados", () => { const s = $(".kpis").textContent; assert.match(s, /₡ 644 000/); assert.match(s, /₡ 138 000/); assert.match(s, /₡ 19 320/); assert.match(s, /₡ 51 520/); assert.match(s, /₡ 435 160/); assert.match(s, /₡ 951/); });
  t("Liquidación por productor con anticipo, adelantos y saldo; calendario fijo de viernes", () => { assert.equal($$(".tbl tbody tr").length, 8); assert.match($("#view").textContent, /Anticipo pagado/); assert.match($("#view").textContent, /viernes/); });
  num('[data-a="mny:am"]', 0, "999999"); click('[data-a="mny:adv"]');
  t("Adelanto de emergencia mayor al 30 % del saldo se rechaza con el máximo", () => assert.match($("#toast").textContent, /El máximo para Don Mario es ₡ \d/));
  num('[data-a="mny:am"]', 0, "10000"); click('[data-a="mny:adv"]');
  t("Adelanto dentro del límite se registra y baja el saldo", () => { assert.match($("#toast").textContent, /Adelanto de ₡ 10 000 registrado para Don Mario/); assert.match($(".tbl tbody tr").textContent, /₡ 10 000/); });
  click('[data-a="mny:sub"][data-k="caja"]'); t("Caja: marca con icono y texto la semana con faltante", () => assert.match($("#view").textContent, /Faltarían ₡ 1 050 000/));
  click('[data-a="mny:sub"][data-k="costos"]'); t("Costos: precio mínimo por kg a partir de costos, merma, gestión, fondo y margen", () => assert.match($(".summ .big").textContent, /₡ 1 66\d/));
  click('[data-a="mny:sub"][data-k="politica"]'); t("Política de pago visible: anticipo fijo, pool, adelanto, transparencia y tope de capital de trabajo", () => { const s = $("#view").textContent; ["Anticipo con calendario fijo", "Liquidación final por pool", "Adelanto de emergencia", "Transparencia", "Tope de capital de trabajo"].forEach((x) => assert.ok(s.includes(x), x)); });

  // ── Productores y equipo ──
  go("productores");
  t("Productores: 8 filas con canal de contacto editable y estimación desactualizada señalada", () => { assert.equal($$(".tbl tbody tr").length, 8); assert.ok($$(".chip").some((c) => /hace 12 d/.test(c.textContent) && c.classList.contains("warn"))); });
  sel('[data-a="ppl:ch"][data-id="p2"]', "voice");
  click('[data-a="ppl:sel"][data-id="p2"]');
  t("Ficha del productor: libro de equidad y consentimiento", () => { assert.match($("#sheet").textContent, /Libro de equidad/); assert.match($("#sheet").textContent, /Datos y mensajes autorizados/); });
  click('[data-a="ppl:chatfor"][data-id="p2"]');
  t("«Lo que recibe»: cambiar el canal a nota de voz se refleja en lo que recibe el productor", () => assert.match($("#sheet").textContent, /Nota de voz · 0:19/)); click("[data-close]");
  go("equipo");
  t("Equipo: invitar exige correo válido y deja rastro en auditoría", () => { num('[data-a="ppl:ivm"]', 0, "malo"); click('[data-a="ppl:inv"]'); assert.match($("#toast").textContent, /correo válido/); num('[data-a="ppl:ivm"]', 0, "nuevo@ejemplo.cr"); click('[data-a="ppl:inv"]'); assert.match($("#view").textContent, /invitó a nuevo@ejemplo\.cr como/); });
  t("Equipo: la matriz de permisos respeta el mínimo privilegio", () => {
    const tbl = [...$$(".tbl")].pop(), heads = [...tbl.querySelectorAll("thead th")].slice(1).map((h) => h.textContent.trim()), m = {};
    [...tbl.querySelectorAll("tbody tr")].forEach((r) => { const c = [...r.children]; m[c[0].textContent.trim()] = Object.fromEntries(heads.map((h, i) => [h, c[i + 1].textContent.trim() === "✓"])); });
    const only = (mod, ...ok) => Object.entries(m[mod]).filter(([, v]) => v).map(([k]) => k).sort().join(",") === ok.sort().join(",");
    assert.ok(only("Equipo y permisos", "Propietario")); assert.ok(only("Dinero", "Propietario", "Gestor", "Contabilidad")); assert.ok(only("Recepción", "Propietario", "Gestor", "Acopio")); assert.ok(only("Mercado", "Propietario", "Gestor", "Comercial")); assert.ok(only("WhatsApp", "Productor")); assert.ok(only("Mi portal", "Comprador"));
    assert.ok(!m["Dinero"]["Acopio"] && !m["Dinero"]["Comercial"] && !m["Dinero"]["Transportista"]);
  });
  click('[data-a="ppl:rev"][data-i="1"]'); t("Revocar un acceso es inmediato y se audita", () => { assert.match($("#toast").textContent, /Acceso revocado de inmediato/); assert.match($("#view").textContent, /revocó el acceso de/); });
  click('[data-a="ppl:view"][data-id="acopio"]'); await wait(10);
  t("«Ver como» cambia al rol elegido (Acopio)", () => { assert.equal($("#dk-role").value, "acopio"); assert.deepEqual(nav(), ["Hoy", "Recibir fruta"]); });

  // ── Acopio: nunca ve dinero ──
  go("recepcion");
  t("Acopio: la recepción NO muestra precios ni montos en ninguna parte", () => { assert.ok(!/₡/.test($("#view").textContent)); assert.match($(".summ").textContent, /Usted no ve precios ni montos/); });
  click('[data-a="ops:rcpt"]'); t("Acopio: genera un tiquete de peso solo con kilos (sin anticipo)", () => { assert.match($(".rcpt").textContent, /TIQUETE DE PESO/); assert.ok(!/Anticipo|₡/.test($(".rcpt").textContent)); });
  go("hoy"); t("Acopio: «Hoy» lista a quién recibe y cuánto, sin dinero", () => { assert.match($("#view").textContent, /Hoy recibe/); assert.ok(!/₡/.test($("#view").textContent)); });

  // ── Transportista ──
  await asRole("transportista");
  t("Transportista: solo «Hoy» y «Mi ruta»", () => assert.deepEqual(nav(), ["Hoy", "Mi ruta"]));
  go("entregas"); click('[data-a="ops:arr"][data-id="s1"]');
  for (let i = 0; i < 5; i++) click('[data-a="ops:wait"][data-id="s1"]');
  t("Espera de 75 min queda registrada y se marca como pagable (más de 1 hora)", () => { assert.match($("#view").textContent, /Espera: 75 min/); assert.match($("#view").textContent, /Espera pagable/); assert.match($(".summ").textContent, /₡ 6 000/); });
  t("No puede marcar entregada sin nombre de quien recibe y sin foto (prueba de entrega)", () => assert.ok($('[data-a="ops:done"][data-id="s1"]').disabled));
  num('[data-a="ops:rcv"][data-id="s1"]', 0, "Doña Ana"); click('[data-a="ops:sphoto"][data-id="s1"]');
  t("Con nombre y foto se habilita la entrega y queda con prueba", () => { assert.ok(!$('[data-a="ops:done"][data-id="s1"]').disabled); click('[data-a="ops:done"][data-id="s1"]'); assert.match($("#view").textContent, /Entregada · recibió Doña Ana/); });
  t("Transportista: su pago (ruta + esperas) con fecha prometida; sin ver precios de fruta", () => { assert.match($(".summ").textContent, /₡ 45 000/); assert.match($(".summ").textContent, /₡ 51 000/); assert.ok(!/1 450|1 350|1 250/.test($("#view").textContent)); });

  // ── Comercial ──
  await asRole("comercial");
  t("Comercial: Hoy, Mercado y Reclamos; sin Dinero ni Productores", () => { assert.deepEqual(nav(), ["Hoy", "Mercado", "Reclamos"]); });
  t("Comercial: «Hoy» muestra sus acciones y la ruta de arranque, sin montos a productores", () => { assert.match($("#view").textContent, /Sus acciones de hoy/); assert.match($("#view").textContent, /Fase A: 0\/6/); assert.ok(!/₡/.test($("#view").textContent)); });
  go("reclamos"); click('[data-a="ops:cl"][data-id="c1"]');
  t("Comercial ve el caso pero decide el gestor (sin botón de aplicar)", () => { assert.ok(!$('[data-a="ops:clok"]')); assert.match($(".summ").textContent, /Decide el gestor/); });

  // ── Contabilidad ──
  await asRole("contabilidad");
  t("Contabilidad: Hoy y Dinero; solo lectura (sin registrar adelantos)", () => { assert.deepEqual(nav(), ["Hoy", "Dinero"]); go("dinero"); click('[data-a="mny:sub"][data-k="pagos"]'); assert.ok(!$('[data-a="mny:adv"]')); assert.match($("#view").textContent, /Solo lectura/); assert.ok($('[data-a="mny:csv"]')); });

  // ── Comprador ──
  await asRole("comprador");
  t("Comprador: solo su portal, con oferta prometible y ficha de calidad", () => { assert.deepEqual(nav(), ["Mi portal"]); const s = $("#view").textContent; assert.match(s, /Oferta semanal prometible/); assert.match(s, /Ficha de calidad/); assert.match(s, /Aceptable/); assert.match(s, /No aceptable/); });
  t("Comprador: ventana de reclamo visible (le quedan 5 h) y el envío exige kilos y 3 fotos", () => { assert.match($(".summ").textContent, /Le quedan 5 h para reclamar/); assert.ok($('[data-a="ppl:cfs"]').disabled); });
  num('[data-a="ppl:cfk"]', 0, "6"); [0, 1, 2].forEach((i) => click(`[data-a="ppl:cfp"][data-i="${i}"]`));
  t("Con kilos y 3 fotos puede enviar el reclamo dentro de la ventana", () => { assert.ok(!$('[data-a="ppl:cfs"]').disabled); click('[data-a="ppl:cfs"]'); assert.match($("#toast").textContent, /Reclamo enviado dentro de la ventana/); });
  num('[data-a="ppl:bh"]', 0, "10");
  t("Pasadas 8 horas ya no puede reclamar y se le explica por qué", () => { assert.match($(".summ").textContent, /Pasó la ventana de 8 horas/); assert.ok(!$('[data-a="ppl:cfs"]')); });
  await asRole("gestor"); go("reclamos"); t("El reclamo del comprador llega al gestor con su ventana", () => assert.equal($$("#view .card .flag, #view .card").filter((c) => /Hotel Playa Ejemplo/.test(c.textContent)).length >= 2, true));

  // ── Enlace de zona ──
  await asRole("enlace");
  t("Enlace de zona: Hoy y Mi zona; ve cantidades y estado, no montos", () => { assert.deepEqual(nav(), ["Hoy", "Mi zona"]); go("zona"); assert.match($("#view").textContent, /no montos/); assert.ok(!/₡/.test($("#view").textContent)); });
  click('[data-a="ppl:avisar"]'); t("Registra a su nombre que avisó a quien no usa WhatsApp", () => assert.match($("#view").textContent, /Avisado/));

  // ── Productor (lo que recibe) ──
  await asRole("productor");
  t("Productor: no hay navegación ni barra: solo su chat (no instala nada)", () => { assert.equal($("#side").textContent.trim(), ""); assert.equal($("#top").textContent.trim(), ""); assert.ok($(".pwa")); });
  sel('[data-a="ppl:chatp"]', "p1");
  t("Productor: el mensaje es de usted, corto, con idea principal primero y opción 1/2", () => { const m = $(".bub").textContent; assert.match(m, /Buenos días, Don Mario/); assert.match(m, /Responda 1 si puede o 2 si no puede/); assert.ok(m.split(".").length <= 4); });
  t("Productor: recibe recibo con cifras grandes y estado de cuenta con fecha de pago", () => { const s = $(".pwa").textContent; assert.match(s, /Recibo de hoy/); assert.match(s, /Estado de cuenta/); assert.match(s, /Se paga el viernes/); assert.match(s, /Falta:/); });
  sel('[data-a="ppl:chatp"]', "p7");
  t("Productor sin WhatsApp: el mensaje llega por su enlace de zona", () => assert.match($(".pwa").textContent, /Don Beto no usa WhatsApp/));

  // ── Modos y tema ──
  await asRole("owner");
  click("#fieldbtn"); t("Modo campo: texto grande y alto contraste", () => assert.ok(d.body.classList.contains("field")));
  click('#devbar [data-t="light"]'); t("Tema claro", () => assert.equal(d.documentElement.dataset.theme, "light"));
  click('#devbar [data-t="dark"]'); t("Tema oscuro", () => assert.equal(d.documentElement.dataset.theme, "dark"));
};
