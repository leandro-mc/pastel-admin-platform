const assert = require("node:assert/strict");
// Balance (prototipo v3). Esperado según docs/requirements/balance/INVENTARIO-BALANCE.md §12 y ROLES-Y-PERMISOS.md.
module.exports = async ({ w, d, $, $$, click, type, text, t, wait }) => {
  const asRole = async (id) => { const s = $("#dk-role"); s.value = id; s.dispatchEvent(new w.Event("change", { bubbles: true })); await wait(30); };
  const go = async (h) => { w.location.hash = h; await wait(40); };
  const main = () => $("#main").textContent.replace(/\s+/g, " ");
  const dlg = () => $("#dlg").textContent.replace(/\s+/g, " ");
  const tabs = () => $$(".tabsd a").map((a) => a.textContent.trim());
  const btn = (re, root = d) => [...root.querySelectorAll("button,a.btn")].find((b) => re.test(b.textContent));
  const creds = {}; const fill = (sel, v) => { const n = $(sel); n.value = v; n.dispatchEvent(new w.Event("input", { bubbles: true })); n.dispatchEvent(new w.Event("change", { bubbles: true })); };

  // ── Ana (administra el paseo) ──
  t("La barra de desarrollo lista 6 roles y arranca con Ana (administra el paseo)", () => { assert.ok($("#devbar")); assert.equal($("#dk-role").options.length, 6); assert.equal($("#dk-role").value, "admin"); assert.match($("#who").textContent, /Ana/); });
  t("Sus grupos: tres tarjetas con estado en texto (Abierto/Cerrado), moneda y su situación con palabras", () => { assert.equal($$(".gcard").length, 3); const m = main(); assert.match(m, /Paseo a Manuel Antonio/); assert.match(m, /Casa de Heredia/); assert.match(m, /Viaje a Japón/); assert.match(m, /Cerrado/); assert.match(m, /Le deben ₡136 404,10/); });
  await go("#/g/g1");
  t("Grupo del paseo: total ₡352 980,75 repartido en partes exactas de ₡70 596,15; Ana, que pagó ₡207 000,25, ve «Le deben ₡136 404,10»", () => { const m = main(); assert.match(m, /Total del grupo ?₡352 980,75/); assert.match(m, /Su parte ?₡70 596,15/); assert.match(m, /Usted pagó ?₡207 000,25/); assert.match(m, /Le deben ₡136 404,10/); });
  t("Ana (administradora) ve las pestañas Gastos, Saldos, Liquidar, Personas y Ajustes", () => { assert.deepEqual(tabs(), ["Gastos", "Saldos", "Liquidar", "Personas", "Ajustes"]); });
  t("Gastos: 5 filas, ordenadas de la fecha más reciente; Ana puede editar y eliminar todos", () => { assert.equal($$("#main .row").length, 5); assert.match($("#main .row").textContent, /Entradas al parque/); assert.equal($$('[data-act="edit-exp"]').length, 5); assert.equal($$('[data-act="del-exp"]').length, 5); });
  await go("#/g/g1/saldos");
  t("Saldos: cada persona con signo y palabras (Le deben / Debe), barra decorativa y orden de ingreso (#1…#5)", () => { const m = main(); assert.match(m, /Ana \(usted\)/); assert.match(m, /Le deben ₡136 404,10/); assert.match(m, /Debe ₡70 596,15/); assert.match(m, /#5 en el orden de ingreso/); assert.equal($$(".bar").length, 5); assert.ok($$(".bar").every((b) => b.getAttribute("aria-hidden") === "true")); assert.doesNotMatch(m, /sobran/); });
  await go("#/g/g1/liquidar");
  t("Liquidar (D2): 4 pagos a Ana, de mayor a menor; los pagos de Ana destacan; avisa que Balance no registra pagos", () => { const m = main(); assert.match(m, /Liquidación sugerida/); assert.match(m, /4 pagos/); const pays = $$(".pay").map((p) => p.textContent.replace(/\s+/g, " ")); assert.match(pays[0], /Elena paga a usted ₡70 596,15|Elena le paga a usted/); assert.match(pays[1], /Diego/); assert.match(pays[3], /Carla/); assert.match(m, /Balance no registra pagos/); });
  await go("#/g/g1/personas");
  t("Personas: orden de ingreso, roles, y el enlace con código de 4 dígitos siempre visibles para quien administra", () => { const m = main(); assert.match(m, /#1 · Administra el grupo/); assert.match(m, /#5 · Miembro/); assert.match(m, /Enlace y código de ingreso/); assert.match(m, /paseo-7k3m9xq2/); assert.equal($(".codebox .cd").textContent.trim(), "4821"); assert.ok(btn(/Regenerar/)); });
  // Registrar gasto: validación D4 y éxito
  await go("#/g/g1/gastos");
  t("Registrar gasto: descripción corta y monto con 3 decimales se rechazan con mensaje junto al campo (no solo color)", () => { click('[data-act="add-exp"]'); assert.ok($("#xAmt")); fill("#xDesc", "Hi"); fill("#xAmt", "12,505"); click("#dlg [data-x=save]"); assert.match($("#xDescE").textContent, /entre 4 y 500 caracteres/); assert.match($("#xAmtE").textContent, /admite hasta 2 decimales/); assert.equal($("#xAmt").getAttribute("aria-invalid"), "true"); assert.equal($("#xAmt").getAttribute("inputmode"), "decimal"); });
  t("Registrar gasto: monto vacío, cero y negativo se rechazan; «12,50» se acepta; Ana puede elegir a otra persona como pagadora", () => { fill("#xDesc", "Helados"); for (const [v, re] of [["", /Escriba el monto/], ["0", /mayor que cero/], ["-5", /mayor que cero/]]) { fill("#xAmt", v); click("#dlg [data-x=save]"); assert.match($("#xAmtE").textContent, re, v); } assert.ok($$("#xPay option").length === 5 && !$("#xPay").disabled); fill("#xAmt", "12,50"); $("#xPay").value = "beto"; click("#dlg [data-x=save]"); assert.ok(!$("#dlg .modal")); assert.match(main(), /Helados/); assert.match(main(), /Pagó Beto · /); assert.match(main(), /₡12,50/); });
  t("Saldos tras el gasto: ₡352 993,25 entre 5 sobran 0 unidades; el total se actualiza al instante", () => { assert.match(main(), /Total del grupo ?₡352 993,25/); });
  t("Eliminar un gasto pide confirmación y recalcula; el historial registra quién y qué", () => { click([...$$('[data-act="del-exp"]')].find((b) => /Helados/.test(b.getAttribute("aria-label")))); assert.match(dlg(), /¿Eliminar este gasto\?/); click("#dlg [data-x=ok]"); assert.doesNotMatch(main(), /Helados/); });
  // Grupo cerrado
  await go("#/g/g2/gastos");
  t("Grupo cerrado: se lee todo, no hay «Registrar gasto» ni editar; el administrador ve «Reabrir el grupo»", () => { const m = main(); assert.match(m, /Cerrado/); assert.match(m, /El grupo está cerrado: solo se puede leer/); assert.ok(!$('[data-act="add-exp"]')); assert.ok(!$('[data-act="edit-exp"]')); assert.ok(btn(/Reabrir el grupo/)); });
  await go("#/g/g2/liquidar");
  t("Liquidación (grupo cerrado) — título cambiado por el D7, con los centavos asignados (₡56 490,99 entre 2 → 28 245,50 y 28 245,49)", () => { const m = main(); assert.match(m, /Liquidación \(grupo cerrado\)/); assert.match(m, /1 pago/); assert.match(m, /Beto paga a usted|Beto le paga a usted/); });
  // Yenes
  await go("#/g/g3/liquidar");
  t("Grupo en yenes (sin decimales): Ana, miembro, ve «Usted paga a Beto ¥332» y puede copiar el monto; sin Ajustes ni enlace", () => { const m = main(); assert.match(m, /Usted paga a Beto ?¥332/); assert.equal($('[data-act="copy-amt"]').dataset.v, "332"); assert.deepEqual(tabs(), ["Gastos", "Saldos", "Liquidar", "Personas"]); });
  // Ajustes y reglas de administración
  await go("#/g/g1/ajustes");
  t("Ajustes: cambiar la moneda a yenes se rechaza porque hay montos con decimales (409, código propio) y no cambia nada", () => { fill("#sCur", "JPY"); click('[data-act="change-cur"]'); assert.match(dlg(), /más decimales de los que esa moneda admite/); assert.match(dlg(), /balance\.group\.currency_decimals_incompatible/); click("#dlg [data-x=cancel]"); assert.match($(".head").textContent, /CRC/); });
  t("Ajustes: cambiar a USD avisa que NO se convierte ningún monto y, al confirmar, reexpresa los gastos", () => { fill("#sCur", "USD"); click('[data-act="change-cur"]'); assert.match(dlg(), /No se convierte ningún monto/); click("#dlg [data-x=ok]"); assert.match($(".head").textContent, /USD/); assert.match(main(), /Total del grupo ?\$352 980,75/); });
  t("Borrar un grupo con gastos se rechaza explicando el porqué (D7); cerrar y reabrir piden confirmación", () => { click('[data-act="del-group"]'); assert.match(dlg(), /No se puede borrar un grupo con gastos/); click("#dlg [data-x=cancel]"); click('[data-act="close"]'); assert.match(dlg(), /¿Cerrar el grupo\?/); click("#dlg [data-x=ok]"); assert.match($(".head").textContent, /Cerrado/); click('[data-act="reopen"]'); click("#dlg [data-x=ok]"); assert.match($(".head").textContent, /Abierto/); });
  await go("#/g/g1/personas");
  t("Ana no puede salir (tiene gastos) ni quitar a Beto (pagó gastos): se explica el motivo; regenerar cambia el código", () => { click('[data-act="leave"]'); assert.match(dlg(), /No puede salir mientras tenga gastos registrados/); click("#dlg [data-x=cancel]"); click('[data-act="remove-p"][data-id="beto"]'); assert.match(dlg(), /No se puede quitar a una persona que pagó gastos/); click("#dlg [data-x=cancel]"); click('[data-act="regen"]'); click("#dlg [data-x=ok]"); assert.notEqual($(".codebox .cd").textContent.trim(), "4821"); assert.doesNotMatch(main(), /paseo-7k3m9xq2/); creds.token = /unirse\/(\S+)/.exec($("#jl").textContent)[1]; creds.code = $(".codebox .cd").textContent.trim(); });
  await go("#/g/g2/gastos"); click('[data-act="reopen"]'); click("#dlg [data-x=ok]"); await go("#/g/g2/personas");
  t("Último administrador: en la casa, Ana es la única; no puede dejar la administración (409) ni salir sin explicación", () => { click('[data-act="toggle-admin"][data-id="ana"]'); assert.match(dlg(), /al menos una persona administradora/); assert.match(dlg(), /balance\.group\.last_admin/); click("#dlg [data-x=cancel]"); });
  // ── Beto (miembro) ──
  await asRole("member"); await go("#/g/g1/gastos");
  t("Beto (miembro): ve todos los gastos pero edita y elimina solo el suyo; no ve Ajustes; su situación sale con palabras", () => { assert.equal($$('[data-act="edit-exp"]').length, 1); assert.match($('[data-act="edit-exp"]').getAttribute("aria-label"), /Supermercado/); assert.deepEqual(tabs(), ["Gastos", "Saldos", "Liquidar", "Personas"]); assert.match(main(), /Usted es miembro|Usted debe/); });
  t("Beto registra solo con él como pagador: el selector está bloqueado y lo explica", () => { click('[data-act="add-exp"]'); assert.equal($$("#xPay option").length, 1); assert.ok($("#xPay").disabled); assert.match(dlg(), /solo puede registrar gastos pagados por usted/); click("#dlg [data-x=cancel]"); });
  await go("#/g/g1/personas");
  t("Beto no ve el enlace ni el código, ni las acciones de administración; sí puede intentar salir (se le explica por qué no)", () => { const m = main(); assert.doesNotMatch(m, /Enlace y código de ingreso/); assert.doesNotMatch(m, /paseo-7k3m9xq2|4821/); assert.ok(!$('[data-act="toggle-admin"]')); assert.ok(!$('[data-act="remove-p"]')); click('[data-act="leave"]'); assert.match(dlg(), /No puede salir mientras tenga gastos/); click("#dlg [data-x=cancel]"); });
  await go("#/g/g1/ajustes");
  t("Beto en la dirección de Ajustes: «Sin permiso», con el motivo y a quién pedirlo (nunca una pantalla vacía)", () => { const m = main(); assert.match(m, /Sin permiso/); assert.match(m, /quien lo administra/); assert.match(m, /Ana, Diego/); assert.match(m, /403/); });
  // ── Marcos (con acceso, sin grupos) ──
  await asRole("nueva"); await go("#/");
  t("Marcos: estado vacío con dos caminos (crear grupo o abrir un enlace); no ve grupos ajenos ni por URL (404 «no existe»)", () => { assert.match(main(), /Todavía no está en ningún grupo/); assert.match(main(), /Crear mi primer grupo/); assert.doesNotMatch(main() + $("#side").textContent, /Paseo a Manuel Antonio/); });
  await go("#/g/g1");
  t("Marcos abre por URL un grupo ajeno: «No encontramos ese grupo» (el grupo no existe para él), sin revelar nada", () => { assert.match(main(), /No encontramos ese grupo/); assert.doesNotMatch(main(), /Ana|Beto|₡/); });
  await go("#/unirse/paseo-7k3m9xq2");
  t("Ingreso con enlace: pide el código de 4 dígitos con teclado numérico; un código incorrecto da el error genérico", () => { assert.equal($("#jCode").getAttribute("inputmode"), "numeric"); fill("#jCode", "0000"); click('[data-act="join-go"]'); assert.match($("#jErr").textContent, /El enlace o el código no son válidos/); assert.equal($("#jErr").getAttribute("role"), "alert"); });
  await go("#/unirse/casa-q4w8e5r1");
  t("5 fallos seguidos bloquean 15 minutos (el 6.º intento, aunque sea correcto, responde «Demasiados intentos»)", () => { for (let i = 0; i < 5; i++) { fill("#jCode", "9999"); click('[data-act="join-go"]'); assert.match($("#jErr").textContent, /no son válidos/); } fill("#jCode", "7730"); click('[data-act="join-go"]'); assert.match($("#jErr").textContent, /Demasiados intentos/); assert.match($("#jErr").textContent, /15 minutos/); });
  await go("#/unirse/paseo-7k3m9xq2");
  t("Enlace regenerado: el enlace y el código anteriores dejan de servir (mismo error genérico)", () => { fill("#jCode", "4821"); click('[data-act="join-go"]'); assert.match($("#jErr").textContent, /El enlace o el código no son válidos/); });
  await go("#/unirse/" + creds.token);
  fill("#jCode", creds.code); click('[data-act="join-go"]'); await wait(60);
  t("Código correcto con el enlace nuevo: Marcos entra como miembro, queda en la posición #6 y el reparto se recalcula (retroactivo)", () => { assert.match(w.location.hash, /#\/g\/g1/); assert.match($(".head").textContent, /6 personas/); assert.match($(".head").textContent, /Usted es miembro/); assert.match(main(), /Su parte ?\$58 830,12/); });
  await go("#/nuevo");
  t("Crear grupo: el nombre es obligatorio; la lista de monedas trae las 40 del catálogo (15 destacadas) con código y símbolo", () => { click('[data-act="create-group"]'); assert.match($("#nNameE").textContent, /Escriba un nombre/); assert.equal($$("#nCur option").length, 40); assert.equal($$("#nCur optgroup")[0].querySelectorAll("option").length, 15); assert.match($("#nCur option").textContent, /CRC · ₡ · Colón costarricense/); });
  fill("#nName", "Cumpleaños de Sofía"); fill("#nCur", "USD"); click('[data-act="create-group"]'); await wait(60);
  t("Crear grupo: queda como administrador, abre en Personas con su enlace y código, y en la moneda elegida", () => { assert.match($(".head").textContent, /Cumpleaños de Sofía/); assert.match($(".head").textContent, /USD · \$/); assert.match($(".head").textContent, /Usted administra/); assert.match(main(), /Enlace y código de ingreso/); assert.match($(".codebox .cd").textContent.trim(), /^\d{4}$/); });
  // ── Sin cuenta, sin acceso, sin sesión ──
  await asRole("invitada");
  t("Invitada sin cuenta: página informativa (registrarse y marcar Balance) con «Ya tengo cuenta»; no revela datos de ningún grupo", () => { const m = main(); assert.match(m, /Para entrar a un grupo necesita una cuenta/); assert.match(m, /Marque la aplicación Balance/); assert.ok(btn(/Crear mi cuenta/)); assert.ok(btn(/Ya tengo cuenta/)); assert.doesNotMatch(main() + $("#side").textContent, /Paseo a Manuel Antonio|Ana|Beto/); });
  await go("#/unirse/enlace-que-no-existe");
  t("La página es idéntica para un enlace inválido (no revela si el grupo existe)", () => { assert.match(main(), /Para entrar a un grupo necesita una cuenta/); });
  click('[data-act="login-join"]'); await wait(30);
  t("«Ya tengo cuenta» inicia sesión y regresa al ingreso para escribir el código", () => { assert.equal($("#dk-role").value, "nueva"); assert.ok($("#jCode")); });
  await asRole("noaccess"); await go("#/");
  t("Con sesión sin acceso a Balance (403): explica por qué y a quién pedirlo; no muestra grupos", () => { const m = main(); assert.match(m, /todavía no tiene acceso a Balance/); assert.match(m, /A quién pedirlo/); assert.match(m, /403/); assert.doesNotMatch(d.body.textContent, /Paseo a Manuel Antonio/); });
  await asRole("anon");
  t("Sin sesión (401): pide iniciar sesión; al iniciar entra a sus grupos", () => { assert.match(main(), /Inicie sesión para ver sus grupos/); assert.match(main(), /401/); });
  click('[data-act="login"]'); await wait(30);
  t("Tras iniciar sesión se ven los grupos de la persona", () => { assert.equal($("#dk-role").value, "admin"); assert.ok($$(".gcard").length >= 3); });
  t("Texto ampliable (A / A+ / A++) y trato de usted en toda la interfaz", () => { click('[data-sz="2"]'); assert.equal(d.documentElement.style.getPropertyValue("--fs"), "20.8px"); assert.doesNotMatch(d.body.textContent, /\b(tenés|querés|agregá|vos)\b/i); });
};
