const assert = require("node:assert/strict");
module.exports = async ({ d, $, $$, click, type, text, t }) => {
  t("Hoy muestra la fase del año y accesos", () => { assert.match(text(), /Fase del año/); assert.ok($$(".tabs button").length === 4); });
  click('[data-v="envio"]');
  t("Envío: pedido 480 kg = solicitado 480 kg, diferencia 0", () => { const s = $(".sum").textContent.replace(/\s+/g, " "); assert.match(s, /Pedido: 480 kg/); assert.match(s, /Solicitado: 480 kg/); assert.match(s, /Diferencia: 0 kg/); });
  t("Envío: 8 productores y reparto suma 480", () => {
    const kgs = $$(".pc .kg").map((n) => parseInt(n.textContent.replace(/\D/g, ""), 10)); assert.equal(kgs.length, 8); assert.equal(kgs.reduce((a, b) => a + b, 0), 480);
  });
  type('[data-k="cap:p3"]', "20");
  t("Tope de 20 kg a Don Efraín se respeta y el total sigue en 480", () => {
    const rows = $$(".pc"); const ef = rows.find((r) => /Don Efraín/.test(r.textContent)); assert.match(ef.querySelector(".kg").textContent, /^20 kg/);
    assert.equal($$(".pc .kg").map((n) => parseInt(n.textContent, 10)).reduce((a, b) => a + b, 0), 480);
  });
  type('[data-k="cap:p3"]', "");
  click('[data-a="queue"]');
  t("Cola abre con el siguiente productor y el mensaje es de usted", () => { assert.ok(!$("#sheet").hidden); assert.match($("#sheet").textContent, /le pedimos/); assert.match($("#sheet").textContent, /¿Nos confirma por favor\?/); });
  const first = $("#sheet b").textContent;
  click('#sheet [data-a="resp"][data-st="no"]');
  t("'No puede' redistribuye: el siguiente es otro y el total sigue exacto", () => {
    assert.notEqual($("#sheet b").textContent, first);
    assert.match($("#toast").textContent, /se redistribuyeron \d+ kg/);
    assert.equal($$(".pc .kg").map((n) => parseInt(n.textContent, 10)).reduce((a, b) => a + b, 0), 480); // la vista de fondo ya se actualizó
  });
  click('#sheet [data-a="close"]');
  t("Tras excluir a uno, sigue sumando 480 kg", () => { const k = $$(".pc .kg").map((n) => parseInt(n.textContent, 10)); assert.equal(k.reduce((a, b) => a + b, 0), 480); assert.ok(k.includes(0)); });
  click('[data-v="recepcion"]');
  t("Recepción: 90 − 10 = 80 kg aceptados y monto ₡ 52 000,00", () => { assert.match(text(), /Aceptado\s*80 kg/); assert.match(text(), /₡ 52 000,00/); });
  type('[data-k="rc.hh"]', "30");
  t("Reloj de frescura >24 h marca 'Vence pronto' con icono y texto", () => assert.match(text(), /Vence pronto/));
  click('[data-a="rcpt"]');
  t("Recibo para el productor con enlace de WhatsApp", () => { assert.match($(".rcpt").textContent, /RECIBO DE FRUTA/); assert.ok($$("a[href^='https://wa.me/506']").length >= 1); });
  click("#off"); click('[data-a="save"]');
  t("Sin conexión: se encola localmente", () => { assert.ok(!$("#offline").hidden); assert.equal($("#q").textContent, "1"); });
  click("#off");
  t("Al volver la señal se sincroniza", () => { assert.ok($("#offline").hidden); assert.match($("#toast").textContent, /sincronizados/); });
  click('[data-v="dinero"]');
  t("Liquidación (caso 8 del plan): pago ₡70 000 → 1.ª Pagada, 2.ª Parcial, saldo ₡ 18 500,00", () => {
    const rows = $$("table tr").slice(1).map((r) => r.textContent.replace(/\s+/g, " "));
    assert.match(rows[0], /Pagada/); assert.match(rows[1], /Parcial/); assert.match(rows[1], /₡ 11 500,00/); assert.match(text(), /Saldo\s*₡ 18 500,00/);
  });
  t("Caja proyectada marca la semana con faltante con icono y texto", () => assert.match(text(), /Faltarían ₡ 1 050 000,00/));
};
