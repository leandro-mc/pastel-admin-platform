/* Cosecha · Dinero. Modelo de pago híbrido: anticipo con calendario fijo + liquidación final por pool (ver cosecha/MODELO-DE-PAGO.md). Datos FICTICIOS. */
(() => {
  const { $, $$, esc, ic, CRC, KG, chip, D, C } = window.Cosecha;
  const M = { sub: "pagos", adv: {}, cost: { pago: 950, emp: 100, flete: 125, frio: 60, merma: 6, gest: 8, fondo: 3, marg: 10 } };
  const pool = () => {
    const P = D.pool, S = window.Cosecha.S, ingresos = D.orders.reduce((a, o) => a + o.kg * o.price, 0), costos = Object.values(P.costs).reduce((a, b) => a + b, 0), fondo = ingresos * P.fundPct / 100, gestion = ingresos * P.mgmtPct / 100, neto = ingresos - costos - fondo - gestion;
    const rows = D.deliveries.map(([id, a, b]) => ({ id, p: S.prod.find((x) => x.id === id), a, b, eq: a + b * P.gradeB })), eqT = rows.reduce((s, r) => s + r.eq, 0), price = neto / eqT;
    rows.forEach((r) => { r.total = r.eq * price; r.adv = Math.round(r.eq * P.refPrice * P.advPct / 100); r.emer = M.adv[r.id] || 0; r.saldo = r.total - r.adv - r.emer; });
    return { P, ingresos, costos, fondo, gestion, neto, eqT, price, rows };
  };
  window.Cosecha.pool = pool;
  const cashRows = () => { let c = 900000; return D.weeks.map(([w, i, o]) => ((c += i - o), { w, i, o, c })); };
  const SUBS = [["pagos", "Pagos a productores"], ["caja", "Caja 8 semanas"], ["costos", "Costos y precio mínimo"], ["politica", "Política de pago"]];
  const can = () => C.role === "owner" || C.role === "gestor";

  window.Cosecha.views.dinero = () => {
    if (window.Cosecha.params.sub) { M.sub = window.Cosecha.params.sub; delete window.Cosecha.params.sub; }
    const tabs = `<div class="seg" role="tablist" aria-label="Dinero">${SUBS.map(([k, t]) => `<button class="btn ${M.sub === k ? "" : "alt"} sm" data-a="mny:sub" data-k="${k}" role="tab" aria-selected="${M.sub === k}">${t}</button>`).join("")}</div>`;
    return tabs + (C.role === "contabilidad" ? '<p class="mut" style="margin:.6rem 0 0">Solo lectura: usted ve y exporta; los pagos los registra el gestor.</p>' : "") + ({ pagos, caja, costos, politica }[M.sub])();
  };
  const pagos = () => {
    const p = pool(), cap = (r) => Math.round(Math.max(0, r.saldo) * 0.3);
    return `<h2>Pool de la semana del ${p.P.week}</h2>
    <div class="kpis"><div class="kpi"><div class="l">Ventas del pool</div><div class="n">${CRC(p.ingresos)}</div></div><div class="kpi"><div class="l">Costos (flete, empaque, frío)</div><div class="n">${CRC(p.costos)}</div></div><div class="kpi"><div class="l">Fondo de reclamos (${p.P.fundPct} %)</div><div class="n">${CRC(p.fondo)}</div></div><div class="kpi"><div class="l">Gestión de la asociación (${p.P.mgmtPct} %)</div><div class="n">${CRC(p.gestion)}</div></div><div class="kpi"><div class="l">Neto a repartir</div><div class="n">${CRC(p.neto)}</div></div><div class="kpi"><div class="l">Precio por kg (grado A)</div><div class="n">${CRC(p.price)}</div><div class="mut">Grado B = ${p.P.gradeB * 100} %</div></div></div>
    <div class="cols2"><div><h2>Liquidación por productor</h2><table class="tbl"><thead><tr><th>Productor</th><th class="r">Kg A</th><th class="r">Kg B</th><th class="r">Total a pagar</th><th class="r">Anticipo</th><th class="r">Adelantos</th><th class="r">Saldo</th><th>Estado</th></tr></thead><tbody>${p.rows.map((r) => `<tr><td><b>${esc(r.p.name)}</b><br><span class="mut">SINPE ${esc(r.p.sinpe)}</span></td><td class="r">${r.a}</td><td class="r">${r.b}</td><td class="r">${CRC(r.total)}</td><td class="r">${CRC(r.adv)}</td><td class="r">${r.emer ? CRC(r.emer) : "—"}</td><td class="r"><b>${CRC(r.saldo)}</b></td><td>${chip("ok", "check", "Anticipo pagado")}</td></tr>`).join("")}</tbody></table>
      <p class="mut">Cada productor recibe por WhatsApp su <b>estado de cuenta</b> con estas cifras. El anticipo es el ${p.P.advPct} % de un precio de referencia (${CRC(p.P.refPrice)}/kg) y se paga siempre el <b>viernes</b>; el saldo se paga al cerrar el pool.</p></div>
      <aside class="summ"><div class="card"><h2 style="margin-top:0">Calendario fijo</h2><ul class="mut" style="margin:0 0 0 1.1rem;padding:0"><li>Anticipo: <b>viernes</b> siguiente a la entrega</li><li>Saldo: al cerrar el pool, <b>viernes</b> de la semana siguiente</li><li>La fecha no cambia sin avisar</li></ul></div>
      ${can() ? `<div class="card"><h2 style="margin-top:0">Adelanto de emergencia</h2><p class="mut">Hasta el 30 % del saldo, para imprevistos (salud, familia). Se descuenta del saldo.</p><label class="f">Productor<select data-a="mny:ap" data-f="ap">${p.rows.map((r) => `<option value="${r.id}">${esc(r.p.name)} · máx. ${CRC(cap(r))}</option>`).join("")}</select></label><label class="f">Monto (₡)<input type="number" inputmode="decimal" data-a="mny:am" data-f="am" placeholder="20000"></label><button class="btn" data-a="mny:adv">Registrar adelanto</button></div>` : ""}
      <button class="btn alt" data-a="mny:csv" style="width:100%;justify-content:center">Exportar a Excel (CSV)</button></aside></div>`;
  };
  const caja = () => { const cs = cashRows(), max = Math.max(...cs.map((x) => Math.abs(x.c))); return `<h2>Caja proyectada · 8 semanas</h2><p class="mut">Entradas por cobrar menos pagos a productores. Saldo inicial ₡ 900 000. El mayor riesgo de una asociación que vende bien es <b>pagar antes de cobrar</b>.</p><div class="stack">${cs.map((x) => `<div class="card"><div class="row sp"><b>Semana del ${x.w}</b>${chip(x.c < 0 ? "bad" : "ok", x.c < 0 ? "warn" : "check", x.c < 0 ? `Faltarían ${CRC(-x.c)}` : `Saldo ${CRC(x.c)}`)}</div><div class="bar ${x.c < 0 ? "neg" : ""}" aria-hidden="true"><i style="width:${Math.round((Math.abs(x.c) / max) * 100)}%"></i></div><div class="mut">Entra ${CRC(x.i)} · Sale ${CRC(x.o)}</div></div>`).join("")}</div>`; };
  const costos = () => {
    const c = M.cost, base = c.pago + c.emp + c.flete + c.frio, conMerma = base / (1 - c.merma / 100), min = conMerma / (1 - (c.gest + c.fondo + c.marg) / 100);
    const f = (k, l) => `<label class="f">${l}<input type="number" inputmode="decimal" data-a="mny:c" data-k="${k}" data-f="c-${k}" value="${c[k]}"></label>`;
    return `<h2>Costo por kg y precio mínimo</h2><div class="cols2"><div class="card"><div class="grid2">${f("pago", "Pago al productor (₡/kg)")}${f("emp", "Empaque (₡/kg)")}${f("flete", "Flete (₡/kg)")}${f("frio", "Frío (₡/kg)")}${f("merma", "Merma esperada (%)")}${f("gest", "Gestión (%)")}${f("fondo", "Fondo de reclamos (%)")}${f("marg", "Margen objetivo (%)")}</div></div>
      <aside class="summ"><div class="card"><dl class="kv"><dt>Costo base</dt><dd>${CRC(base)}/kg</dd><dt>Con merma</dt><dd>${CRC(conMerma)}/kg</dd></dl><p class="mut" style="margin:.6rem 0 .2rem">Precio mínimo por kg</p><div class="big">${CRC(min)}</div><p class="mut">Por debajo de este precio la asociación pierde o no cubre su gestión y su fondo.</p></div></aside></div>`;
  };
  const politica = () => `<h2>Política de pago (resumen)</h2><div class="card"><ol style="margin:0 0 0 1.2rem;padding:0"><li><b>Anticipo con calendario fijo</b>: ${D.pool.advPct} % de un precio de referencia, el viernes siguiente a la entrega.</li><li><b>Liquidación final por pool semanal</b>: ventas − costos − fondo de reclamos − gestión, repartido por kilos ponderados por calidad (A = 100 %, B = ${D.pool.gradeB * 100} %).</li><li><b>Adelanto de emergencia</b> hasta 30 % del saldo, descontado.</li><li><b>Transparencia</b>: recibo por cada entrega y estado de cuenta por WhatsApp; las reglas están por escrito.</li><li><b>Tope de capital de trabajo</b>: no se paga anticipo si la caja proyectada queda en negativo; se avisa antes, no después.</li></ol><p class="mut">Basado en evidencia de cooperativas (pagos predecibles, anticipo + pagos de avance + pago final, venta por fuera por pago tardío). Los porcentajes son <b>valores iniciales a validar con productores reales</b>: ver <code>cosecha/MODELO-DE-PAGO.md</code>.</p></div>`;

  window.Cosecha.handlers.push((type, e) => {
    const t = e.target.closest("[data-a]"); if (!t || !t.dataset.a.startsWith("mny:")) return false; const a = t.dataset.a, R = window.Cosecha.render;
    if (type === "click") {
      if (a === "mny:sub") { M.sub = t.dataset.k; R(); return true; }
      if (a === "mny:csv") { window.Cosecha.toast("Exportado: pagos-semana.csv (simulado)"); return true; }
      if (a === "mny:adv") { const id = $('[data-a="mny:ap"]').value, amt = +$('[data-a="mny:am"]').value, r = pool().rows.find((x) => x.id === id), mx = Math.round(Math.max(0, r.saldo) * 0.3); if (!amt || amt <= 0) { window.Cosecha.toast("Escriba un monto"); return true; } if (amt > mx) { window.Cosecha.toast(`El máximo para ${r.p.name} es ${CRC(mx)} (30 % del saldo)`); return true; } M.adv[id] = (M.adv[id] || 0) + amt; window.Cosecha.toast(`Adelanto de ${CRC(amt)} registrado para ${r.p.name}`); R(); return true; }
      return false;
    }
    if (a === "mny:c" && type === "input") { M.cost[t.dataset.k] = Math.max(0, +e.target.value || 0); R(); return true; }
    return false;
  });
})();
