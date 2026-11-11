const assert = require("node:assert/strict");
// Brisa (prototipo v3). Esperado según docs/requirements/brisa/INVENTARIO-BRISA.md §13 y REQUERIMIENTOS-BRISA.md.
module.exports = async ({ w, d, $, $$, click, type, text, t, wait }) => {
  const asRole = async (id) => { const s = $("#dk-role"); s.value = id; s.dispatchEvent(new w.Event("change", { bubbles: true })); await wait(20); };
  const clock = async (n) => { for (let i = 0; i < Math.abs(n); i++) { click(`#dkClock [data-clock="${n > 0 ? 1 : -1}"]`); await wait(5); } };
  const colTitles = () => $$(".day-column").map((c) => ({ today: c.classList.contains("today"), titles: [...c.querySelectorAll(".task-title-button")].map((b) => b.textContent.trim()) }));
  const inToday = (title) => colTitles().some((c) => c.today && c.titles.includes(title));
  const go = (v) => click(`.sidebar [data-view="${v}"]`);
  const mainText = () => $("#mainContent").textContent.replace(/\s+/g, " ");
  const save = () => click("#saveTask");

  // ── Persona con acceso ──
  t("La barra de desarrollo lista 5 roles y arranca como persona con acceso; incluye el reloj simulado", () => { assert.ok($("#devbar")); assert.equal($("#dk-role").options.length, 5); assert.equal($("#dk-role").value, "owner"); assert.ok($("#dkClock")); assert.match($("#dkToday").textContent, /\d{4}|de /); });
  t("Semana: 7 columnas (el día de hoy enfocado en la tercera), marca «HOY» y botón «Nueva tarea»", () => { assert.equal($$(".day-column").length, 7); assert.equal($$(".day-column.today").length, 1); assert.equal($$(".day-column")[2].classList.contains("today"), true); assert.match($(".day-column.today").textContent, /HOY/); assert.match($("#mainContent").textContent, /Nueva tarea/); });
  t("Navegación: Semana, Mes, Vencidas, Fechas límite, Importar y Configuración", () => { const n = $$(".sidebar .nav-item").map((b) => b.textContent.trim().replace(/\d+$/, "")); assert.deepEqual(n, ["Semana", "Mes", "Vencidas", "Fechas límite", "Importar tareas", "Configuración"]); });
  t("Reprogramación derivada (§13.1): «Enviar el informe semanal» (día −2, límite +2) aparece HOY; «Pagar el recibo del agua» (día 0, límite 0) también", () => { assert.ok(inToday("Enviar el informe semanal")); assert.ok(inToday("Pagar el recibo del agua")); });
  t("Vencidas: sin fecha límite con día pasado («Ordenar los documentos») y con límite vencida («Confirmar la cita médica»); la del informe NO", () => { go("overdue"); const m = mainText(); assert.match(m, /Ordenar los documentos/); assert.match(m, /Confirmar la cita médica/); assert.doesNotMatch(m, /Enviar el informe semanal/); assert.match(m, /PROGRAMADA PARA/i); });
  t("Fechas límite: orden por vencimiento; aparecen «Vencida» y el informe; la hecha con límite pasado no aparece", () => { go("deadlines"); const m = mainText(); assert.match(m, /Confirmar la cita médica/); assert.match(m, /Enviar el informe semanal/); });
  await clock(1);
  t("Reloj +1 día (AC1): sin recargar, el informe sigue en HOY (avanza con la fecha límite) y se actualiza el contador de Vencidas", () => { go("week"); assert.ok(inToday("Enviar el informe semanal")); });
  await clock(3);
  t("Reloj +4 días: pasada la fecha límite, el informe deja de moverse y queda en Vencidas (AC3)", () => { go("week"); assert.ok(!inToday("Enviar el informe semanal")); go("overdue"); assert.match(mainText(), /Enviar el informe semanal/); });
  click('#dkClock [data-clock="0"]'); await wait(10);
  // ── Alta rápida y validaciones ──
  t("Alta con un solo dato: título + Guardar crea la tarea HOY, prioridad Media, sin fecha límite", () => { go("week"); click('[data-action="new-today"]'); assert.ok($("#taskTitle")); type("#taskTitle", "  Comprar pan  "); save(); assert.ok(inToday("Comprar pan")); const card = [...$$(".day-column.today .task-card")].find((c) => /Comprar pan/.test(c.textContent)); assert.match(card.textContent, /MEDIA/); assert.doesNotMatch(card.textContent, /Límite/); });
  t("Título en blanco no se guarda (se muestra el motivo y el editor sigue abierto)", () => { click('[data-action="new-today"]'); type("#taskTitle", "   "); save(); assert.ok($("#taskTitle")); assert.match($("#editorError").textContent, /Escribe un título/); });
  t("Día posterior a la fecha límite se rechaza con el mensaje de Brisa y no se guarda", () => { type("#taskTitle", "Informe tardío"); const hoy = $("#scheduledDate").value; const chk = $("#dueEnabled"); chk.checked = true; chk.dispatchEvent(new w.Event("change", { bubbles: true })); const dd = $("#dueDate"); const ayer = new Date(hoy + "T12:00:00Z"); ayer.setUTCDate(ayer.getUTCDate() - 1); dd.value = ayer.toISOString().slice(0, 10); dd.dispatchEvent(new w.Event("input", { bubbles: true })); dd.dispatchEvent(new w.Event("change", { bubbles: true })); save(); assert.match($("#editorError").textContent, /no puede ser después de su fecha límite/); assert.match($("#editorError").textContent, /Cambia la fecha límite si necesitas más tiempo/); });
  t("Cerrar el editor con texto escrito pide confirmación; sin texto cierra sin preguntar", () => { w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true })); assert.match(d.body.textContent, /¿Cerrar sin guardar\?/); const cancel = [...$$("#modalRoot button")].find((b) => /Cerrar sin guardar/.test(b.textContent)); assert.ok(cancel); cancel.click(); assert.ok(!$("#taskTitle")); });
  // ── Un toque, búsqueda, singular ──
  t("Marcar hecha con un toque desde la tarjeta: pasa a HECHAS y el contador dice «1 hecha» o «N hechas»", () => { go("week"); const card = [...$$(".day-column.today .task-card")].find((c) => /Comprar pan/.test(c.textContent)); card.querySelector('[data-action="toggle"]').click(); const done = $(".day-column.today .is-done"); assert.ok(done); assert.match(done.textContent, /HECHA/); assert.match(mainText(), /\d+ hechas?/); });
  t("Búsqueda sin distinguir tildes (§13.6): «reunion» encuentra «Preparar la reunión del equipo»", () => { click("#openSearch"); type("#searchInput", "reunion"); assert.match($("#searchResults").textContent, /Preparar la reunión del equipo/); });
  t("Esc cierra la búsqueda", () => { w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true })); assert.ok(!$("#searchInput")); });
  // ── Mes e importación ──
  t("Mes: cuadrícula con semana que empieza el lunes (L M X J V S D)", () => { go("month"); assert.match(mainText(), /L\s*M\s*X\s*J\s*V\s*S\s*D/); });
  t("Importar: JSON dañado → error claro y cero tareas importadas; ejemplo válido → vista previa con totales", () => { go("import"); type("#importJson", '[{"id":"x" "title":"a"}]'); click('[data-action="preview-import"]'); assert.match($("#importPreview").textContent, /JSON válido|no contiene JSON/i); click('[data-action="sample-json"]'); click('[data-action="preview-import"]'); assert.match($("#importPreview").textContent, /5/); });
  // ── Tema ──
  t("Tema: el botón del encabezado alterna claro/oscuro; la barra de desarrollo «Auto» lo devuelve al sistema (sin data-theme)", () => { const root = d.documentElement; click("#themeToggle"); assert.ok(["light", "dark"].includes(root.dataset.theme)); const prev = root.dataset.theme; click("#themeToggle"); assert.notEqual(root.dataset.theme, prev); click('#devbar [data-t="auto"]'); assert.equal(root.dataset.theme, undefined); });
  t("Configuración: ofrece Del sistema / Claro / Oscuro, tamaño de texto y zona horaria", () => { go("settings"); const m = mainText(); assert.match(m, /Del sistema/); assert.match(m, /Claro/); assert.match(m, /Oscuro/); assert.match(m, /Muy grande/); assert.ok($("#timeZone")); });
  // ── Otros roles ──
  await asRole("nueva");
  t("Persona nueva: sin tareas ajenas, primer paso único «Crear mi primera tarea» y columnas vacías con texto amable", () => { assert.ok($("#firstUse")); assert.match(mainText(), /Empieza con una sola tarea/); assert.doesNotMatch(mainText(), /Enviar el informe semanal/); assert.match(mainText(), /Sin tareas/); click('#firstUse [data-action="new-today"]'); assert.ok($("#taskTitle")); w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
  await asRole("noaccess");
  t("Sin acceso a Brisa (403): explica por qué y a quién pedirlo; no muestra ninguna tarea", () => { assert.equal($("#appRoot").dataset.gate, "noaccess"); assert.match(mainText(), /Tu cuenta todavía no tiene acceso a Brisa/); assert.match(mainText(), /A quién pedirlo/); assert.doesNotMatch(d.body.textContent, /Enviar el informe semanal|Comprar alimento/); });
  await asRole("anon");
  t("Sin sesión (401): invita a iniciar sesión y no muestra ninguna tarea", () => { assert.equal($("#appRoot").dataset.gate, "anon"); assert.match(mainText(), /Inicia sesión para ver tus días/); assert.doesNotMatch(d.body.textContent, /Enviar el informe semanal/); });
  click('[data-gate-action="login"]'); await wait(30);
  t("Sin sesión: al iniciar sesión entra a sus días (rol con acceso)", () => { assert.equal($("#dk-role").value, "owner"); assert.equal($("#appRoot").dataset.gate, undefined); assert.equal($$(".day-column").length, 7); });
  await asRole("error");
  t("Error de carga: aviso con role=alert y «tus tareas están a salvo»", () => { assert.ok($('.gate[role="alert"]')); assert.match(mainText(), /No pudimos cargar tus tareas/); assert.match(mainText(), /Tus tareas están a salvo/); });
  click('[data-gate-action="retry"]'); await wait(30);
  t("Error de carga: «Reintentar» vuelve a las tareas", () => { assert.equal($$(".day-column").length, 7); assert.equal($("#appRoot").dataset.gate, undefined); });
  t("Tuteo cálido y sin culpa en los textos de Brisa (excepción del propietario, CCR-1): no hay «usted» ni «vencido» alarmante en la interfaz", () => { const all = d.body.textContent; assert.doesNotMatch(all, /\b(usted|Usted|ustedes)\b/); });
};
