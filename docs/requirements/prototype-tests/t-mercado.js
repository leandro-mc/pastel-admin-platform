const assert = require("node:assert/strict");
module.exports = async ({ w, d, $, $$, click, type, text, t, wait }) => {
  { const sl = $("#dk-role"); sl.value = "comercial"; sl.dispatchEvent(new w.Event("change", { bubbles: true })); await wait(10); click('[data-nav="mercado"]'); }
  const check = (sel, v) => { const n = $(sel); n.checked = v; n.dispatchEvent(new w.Event("change", { bubbles: true })); };
  const setSel = (sel, v) => { const n = $(sel); n.value = v; n.dispatchEvent(new w.Event("change", { bubbles: true })); };
  const score = (id) => { click('[data-v="pipeline"]'); click(`[data-a="lead"][data-id="${id}"]`); return parseInt($("#sheet .big").textContent, 10); };

  t("Ruta: sin la fase A completa pide terminarla", () => assert.match(text(), /Termine la fase A para empezar/));
  t("Encaje inicial de Mayorista Central = 81 (26+20+15+0+10+10)", () => assert.equal(score(3), 81));
  click('[data-v="ruta"]');
  $$('[data-a="task"]').filter((n) => /^a/.test(n.dataset.id)).forEach((n) => check(`[data-id="${n.dataset.id}"]`, true));
  t("Completar la fase A marca el peldaño 0 como recomendado", () => assert.match($(".rung.on").textContent, /Cercano directo.*aquí/));
  t("Al cumplir ficha y constancia el encaje sube a 91", () => assert.equal(score(3), 91));
  click('[data-v="ruta"]'); check('[data-id="d2"]', true);
  t("Con factura electrónica resuelta sube a 96", () => assert.equal(score(3), 96));
  click('[data-a="close"]');

  click('[data-v="pipeline"]');
  t("Nordic Fresh (Canadá, sin consentimiento) aparece con 'Sin base legal'", () => assert.match(text(), /Nordic Fresh Imports \(ej\.\).*Sin base legal/));
  const before = $$(".col")[0].querySelectorAll(".lead").length;
  click('details.t summary'); click('[data-a="imp"]');
  t("Importación: 2 nuevos, 1 duplicado, 1 inválido", () => { assert.match($("#toast").textContent, /2 nuevos · 1 duplicado\(s\) · 1 inválido\(s\)/); });
  t("Los nuevos entran a la columna 'Nuevo'", () => assert.equal($$(".col")[0].querySelectorAll(".lead").length, before + 2));
  t("Correo gratuito se marca como personal", () => assert.match(text(), /Nuevo · personal/));
  click(`[data-a="lead"][data-id="1"]`); click('[data-a="mv"]');
  t("Mover un prospecto cambia su etapa y la siguiente acción", () => assert.match($("#sheet").textContent, /Siguiente acción:.*Seguimiento en el día 4/));
  click('[data-a="close"]');

  click('[data-v="secuencia"]');
  t("Por defecto (EE. UU., correo frío, dominio sin autenticar) el envío está BLOQUEADO", () => { assert.match(text(), /Envío BLOQUEADO/); assert.match(text(), /Dominio sin autenticar/); assert.ok($('[data-a="send"]').disabled); });
  setSel('[data-g="chan"]', "whatsapp");
  t("WhatsApp en frío: bloqueado con la razón de la política", () => assert.match(text(), /WhatsApp en frío no está permitido/));
  setSel('[data-g="cold"]', "false");
  t("WhatsApp con consentimiento: permitido", () => { assert.match(text(), /WhatsApp permitido/); assert.match(text(), /Envío habilitado/); });
  setSel('[data-g="chan"]', "email"); setSel('[data-g="cold"]', "true"); setSel('[data-g="country"]', "CA");
  t("Canadá en frío por correo: bloqueado (CASL)", () => assert.match(text(), /Canadá \(CASL\)/));
  setSel('[data-g="country"]', "US"); ["spf", "dkim", "dmarc"].forEach((k) => check(`[data-g="${k}"]`, true));
  t("EE. UU. con SPF+DKIM+DMARC: habilitado, con advertencia de dirección física y baja", () => { assert.match(text(), /Envío habilitado/); assert.match(text(), /CAN-SPAM/); });
  type('[data-g="bounce"]', "3.5");
  t("Rebotes > 2 %: pausa automática", () => { assert.match(text(), /Pausa automática: rebotes/); assert.match(text(), /Envío BLOQUEADO/); });
  type('[data-g="bounce"]', "1"); click('[data-a="send"]');
  t("Calentamiento: 10 · 20 · 30 · 40 · 20 para 120 contactos (5 días)", () => assert.match(text(), /10 · 20 · 30 · 40 · 20 envíos por día hábil → 5 días/));
  setSel('[data-g="country"]', "ES"); setSel('[data-g="mail"]', "personal");
  t("UE con correo personal: bloqueado", () => assert.match(text(), /solo correos de rol profesional/));
  t("El pie legal incluye identidad, dirección y baja en un clic", () => assert.match($(".email small").textContent, /Dirección física.*baja en un clic/));

  click('[data-v="kit"]');
  click('[data-a="req"]');
  t("Formulario del kit exige organización, correo válido y consentimiento", () => assert.match($("#toast").textContent, /Complete organización/));
  type('[data-f="org"]', "Fresh Imports Demo"); type('[data-f="mail"]', "buyer@freshimports.test"); check('[data-f="ok"]', true); click('[data-a="req"]');
  t("Solicitud entrante crea prospecto con base legal 'solicitud del interesado'", () => { assert.match($("#toast").textContent, /Prospecto entrante creado/); click('[data-v="pipeline"]'); assert.match(text(), /Fresh Imports Demo/); });
  click('[data-v="kit"]'); click('[data-a="lang"][data-l="en"]');
  t("Kit en inglés", () => assert.match(text(), /Costa Rican rambutan \(mamón chino\)/));
};
