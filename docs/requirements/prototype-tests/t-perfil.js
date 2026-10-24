const assert = require("node:assert/strict");
module.exports = async ({ dir, w, d, $, $$, click, type, text, t }) => {
  t("Un solo h1 y secciones con aria-labelledby válido", () => {
    assert.equal($$("h1").length, 1);
    $$("section[aria-labelledby]").forEach((s) => assert.ok(d.getElementById(s.getAttribute("aria-labelledby")), s.id));
  });
  t("Huella generativa: 21 curvas y código de 6 hex en el pie de figura", () => { assert.equal($$("#fp svg path").length, 21); assert.match($("#fpcap").textContent, /Huella n\.º [0-9A-F]{6}\./); });
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
};
