const assert = require("node:assert/strict");
module.exports = async ({ dir, w, d, $, $$, click, type, text, t, wait }) => {
  const asRole = async (id) => { const sl = $("#dk-role"); sl.value = id; sl.dispatchEvent(new w.Event("change", { bubbles: true })); await wait(10); };
  t("Un solo h1 y secciones con aria-labelledby válido", () => {
    assert.equal($$("h1").filter((h) => !h.closest("[hidden]")).length, 1);
    $$("section[aria-labelledby]").forEach((s) => assert.ok(d.getElementById(s.getAttribute("aria-labelledby")), s.id));
  });
  t("Una sola huella generativa (sin duplicado en el riel): 21 curvas y código de 6 hex", () => { assert.equal($$("svg[aria-label^=\"Huella generativa\"]").length, 1); assert.equal($$("#fp svg path").length, 21); assert.match($("#fpcap").textContent, /Huella n\.º [0-9A-F]{6}\./); });
  t("Ficha de 7 segundos: nombre, titular, ahora/antes, dónde y disponibilidad", () => { const s = $("#ficha").textContent; ["Marta Solís Araya", "QA Automation Engineer", "Estudio Demo", "Heredia", "diciembre de 2026"].forEach((x) => assert.ok(s.includes(x), x)); });
  t("CV descargable enlazado al PDF generado por el pipeline", () => assert.match($('a[download]').getAttribute("href"), /mid-qa-fullstack\.pdf$/));
  type("#kw", "Playwright, CI/CD, API, k6, Kubernetes");
  t("Resaltador: 4 de 5 términos con evidencia (Kubernetes no figura)", () => assert.match($("#sum").textContent, /4 de 5 términos con evidencia/));
  t("El término sin evidencia queda desactivado y se dice sin adornos", () => { const li = $$("#hlres li").find((l) => /Kubernetes/.test(l.textContent)); assert.ok(li.classList.contains("no")); assert.ok(li.querySelector("button").disabled); assert.match(li.textContent, /sin evidencia/); });
  t("Sinónimos: CI/CD marca 'GitHub Actions'; API marca 'endpoints'", () => { const m = $$("mark.hl").map((x) => x.textContent.toLowerCase()); assert.ok(m.includes("github actions")); assert.ok(m.includes("endpoints")); });
  t("Límites de palabra: 'api' no marca fragmentos de otras palabras", () => assert.ok($$("mark.hl").every((x) => !/^(capital|rapido)/i.test(x.textContent))));
  t("Se marcan lugares en logros, proyecto y herramientas", () => { assert.ok($$("#trayectoria mark.hl").length >= 3); assert.ok($$("#evidencia mark.hl").length >= 1); assert.ok($$("#herramientas mark.hl").length >= 1); });
  type("#kw", "<img src=x onerror=alert(1)>, k6");
  t("Seguridad: el HTML escrito en el buscador no se inyecta", () => { assert.equal($$("#hlres img").length, 0); assert.equal($$("img").length, 0); });
  click('[data-s="Cypress"]');
  t("Tocar una herramienta rellena el resaltador y la marca", () => { assert.equal($("#kw").value, "Cypress"); assert.ok($$("mark.hl").some((m) => /cypress/i.test(m.textContent))); });
  click("#cl");
  t("Limpiar elimina las marcas sin alterar el texto", () => { assert.equal($$("mark.hl").length, 0); assert.match($("#trayectoria").textContent, /140.*pruebas end-to-end automatizadas con Playwright/s); });
  click("#reveal");
  t("Contacto: el correo se muestra solo tras pedirlo", () => { assert.ok(!$("#mail").hidden); assert.equal($("#reveal").hidden, true); });
  click("#theme"); click("#theme");
  t("Tema: auto → claro → oscuro", () => assert.equal(d.documentElement.dataset.theme, "dark"));
  t("Sin gradientes decorativos, sin botones 'Mi viaje' ni barras de nivel", () => {
    const css = require("fs").readFileSync(require("path").join(dir, "styles.css"), "utf8");
    assert.ok(!/linear-gradient\([^)]*#(6|7|8|9|a|b)[0-9a-f]{5}/i.test(css)); assert.ok(!/progress|meter|role="progressbar"/i.test(d.body.innerHTML));
  });

  // ── Vistas por rol ──
  t("Barra de desarrollo con 4 roles; arranca como reclutadora y sin controles de propietaria", () => { assert.equal($("#dk-role").options.length, 4); assert.ok($("#ownerbar").hidden); assert.ok($("#revoked").hidden); assert.ok($("#atsview").hidden); assert.ok(!$("#wrap").hidden); });
  await asRole("owner");
  t("Propietaria: ve controles del enlace y aperturas sin IP", () => { assert.ok(!$("#ownerbar").hidden); assert.match($("#ownerbar").textContent, /4 aperturas esta semana/); assert.match($("#ownerbar").textContent, /sin IP/); assert.ok(!$("#wrap").hidden); });
  click("#reveal"); chk("#showmail", false); function chk(sel, v) { const n = $(sel); n.checked = v; n.dispatchEvent(new w.Event("change", { bubbles: true })); }
  t("Propietaria: ocultar el correo quita la sección y su enlace de navegación", () => { assert.ok($("#contacto").hidden); assert.ok($$('.rail nav a').find((a) => a.getAttribute("href") === "#contacto").hidden); });
  chk("#showavail", false);
  t("Propietaria: ocultar disponibilidad quita esa fila", () => { const dt = $$(".fact dt").find((x) => x.textContent === "Disponible"); assert.ok(dt.hidden && dt.nextElementSibling.hidden); });
  click("#revoke"); await wait(10);
  t("Revocar el enlace cambia a la vista de enlace revocado", () => assert.equal($("#dk-role").value, "revocado"));
  t("Enlace revocado: no muestra ningún dato del perfil", () => { assert.ok(!$("#revoked").hidden); assert.ok($("#wrap").hidden); assert.match($("#revoked").textContent, /Este enlace ya no está disponible/); assert.ok(!/Marta|QA|Playwright/.test($("#revoked").textContent)); assert.match(d.title, /Enlace no disponible/); });
  await asRole("ats");
  t("Vista ATS: texto plano en orden de lectura con nombre, cargos, fechas y viñetas", () => { const p = $("#atspre").textContent, lines = p.split("\n"); assert.ok(!$("#atsview").hidden); assert.ok(lines.slice(0, 3).some((l) => l.includes("Marta Solís Araya"))); const i = (x) => p.indexOf(x); assert.ok(i("Trayectoria") > i("Marta Solís Araya") && i("Evidencia") > i("Trayectoria") && i("Formación") > i("Evidencia")); assert.match(p, /2022 – hoy/); assert.match(p, /140.*pruebas end-to-end automatizadas con Playwright/); });
  t("Vista ATS: no incluye la herramienta de resaltado ni el pie", () => { const p = $("#atspre").textContent; assert.ok(!/Encaja con su oferta/.test(p)); assert.ok(!/Imprimir/.test(p)); });
  await asRole("visitante");
  t("Volver a reclutadora restablece la página y oculta lo demás", () => { assert.ok(!$("#wrap").hidden); assert.ok($("#ownerbar").hidden && $("#revoked").hidden && $("#atsview").hidden); });
  click('#devbar [data-t="light"]'); t("Tema claro desde la barra de desarrollo", () => assert.equal(d.documentElement.dataset.theme, "light"));
  click('#devbar [data-t="dark"]'); t("Tema oscuro desde la barra de desarrollo", () => assert.equal(d.documentElement.dataset.theme, "dark"));
};
