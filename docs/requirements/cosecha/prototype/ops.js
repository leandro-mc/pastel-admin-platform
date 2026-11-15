/* Cosecha · operación: Hoy (por rol), Envíos, Recepción, Entregas, Reclamos. Datos FICTICIOS. */
(() => {
  const { $, $$, esc, ic, CRC, KG, chip, nextThu, fdate, D, C } = window.Cosecha;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const POLICY = { windowH: 8, tol: { decay: 5, serious: 8, total: 15 }, minPhotos: 3, fundPct: 3 };
  const S = window.Cosecha.S = { prod: clone(D.producers), orders: clone(D.orders), buffer: 0, equity: true, claims: clone(D.claims), stops: clone(D.stops), fee: 45000, waitRate: 6000, rc: { p: "p1", recv: 90, rej: 10, why: ["golpeado"], hh: 3, temp: "", photo: false, rcpt: false }, cl: null, q: null };
  window.Cosecha.POLICY = POLICY;
  const CH = { wa: "WhatsApp", call: "Llamada", voice: "Nota de voz", link: "Enlace de zona" };
  const ST = { new: ["n", "clock", "Por solicitar"], ok: ["ok", "check", "Confirmó"], no: ["bad", "x", "No puede"], nc: ["warn", "clock", "No contestó · reintentar 3:00 p. m."] };
  const stChip = (s) => chip(ST[s][0], ST[s][1], ST[s][2]);
  const calc = () => { const T = Math.round(S.orders.filter((o) => o.on).reduce((a, o) => a + o.kg, 0) * (1 + S.buffer / 100)); const r = Alloc.allocate(T, S.prod.map((p) => ({ id: p.id, weight: p.w, cap: p.cap, include: p.inc, deficit: p.def })), { equityK: S.equity ? 0.5 : 0 }); return { T, r, by: Object.fromEntries(r.rows.map((x) => [x.id, x])) }; };
  const waLink = (phone, msg) => `https://wa.me/506${phone}?text=${encodeURIComponent(msg)}`;
  const msgFor = (p, kg) => `Buenos días, ${p.name}. Para el ${fdate(nextThu())} le pedimos ${kg} kg de mamón chino. ¿Nos confirma? Responda 1 si puede o 2 si no puede.`;
  const cash = () => { let c = 900000; return D.weeks.map(([w, i, o]) => ((c += i - o), { w, i, o, c })); };
  const pend = (by) => S.prod.filter((p) => p.inc && by[p.id].kg > 0 && (p.st === "new" || p.st === "nc"));
  const goBtn = (m, t, cls = "") => `<button class="btn ${cls}" data-nav="${m}">${t}</button>`;
  const deny = (t) => `<div class="card denied"><b>${t}</b><p class="mut">Esta pantalla no forma parte de su rol. Si la necesita, pídala a quien administra los accesos.</p></div>`;

  const V = window.Cosecha.views;
  // ── HOY ──
  V.hoy = () => {
    const role = C.role, { T, by } = calc(), pe = pend(by), neg = cash().find((x) => x.c < 0), ph = window.Cosecha.phase(), prom = Math.round(S.prod.filter((p) => p.inc).reduce((a, p) => a + p.w, 0) * 0.8), stale = S.prod.filter((p) => p.upd > 7).length, open = S.claims.filter((c) => c.st === "nuevo");
    if (role === "owner" || role === "gestor") return `<div class="kpis"><div class="kpi"><div class="l">Pedidos del próximo envío</div><div class="n">${KG(T)}</div><div class="mut">${chip(prom >= T ? "ok" : "bad", prom >= T ? "check" : "warn", `Prometible ${KG(prom)}`)}</div></div>
      <div class="kpi"><div class="l">Productores sin confirmar</div><div class="n">${pe.length}</div><div class="mut">${pe.length ? "Convocar hoy" : "Todo confirmado"}</div></div>
      <div class="kpi"><div class="l">Caja mínima en 8 semanas</div><div class="n" style="color:${neg ? "var(--bad)" : "inherit"}">${CRC(Math.min(...cash().map((x) => x.c)))}</div><div class="mut">${neg ? `Faltante la semana del ${neg.w}` : "Sin faltantes"}</div></div>
      <div class="kpi"><div class="l">Reclamos abiertos</div><div class="n">${open.length}</div><div class="mut">${open.some((c) => c.hours <= POLICY.windowH) ? "Uno dentro de ventana" : "Ninguno dentro de ventana"}</div></div></div>
      <div class="cols2"><div><h2>Siguiente mejor acción</h2><div class="card" style="border-left:5px solid var(--go)"><b style="font-size:1.1rem">${pe.length ? `Convocar a ${pe.length} productores para el envío del ${fdate(nextThu())}` : neg ? `Resolver el faltante de caja de la semana del ${neg.w}` : "Revisar la ruta de arranque"}</b><p class="mut">${pe.length ? "Sin demanda confirmada no se pide fruta: la fruta se oscurece en 3–4 días sin frío." : "Adelante el cobro a compradores o mueva un pago para evitar quedar en negativo."}</p>${pe.length ? goBtn("envios", "Ir a Envíos") : goBtn("dinero", "Ver caja")}</div>
      <h2>Agenda de hoy</h2><ul class="agenda card"><li><span class="t">06:30</span><span>Convocar a productores (cola de 1 toque)</span>${pe.length ? chip("warn", "clock", "Pendiente") : chip("ok", "check", "Hecho")}</li><li><span class="t">09:00</span><span>Recepción en el acopio (Iván)</span>${chip("n", "clock", "Programada")}</li><li><span class="t">13:00</span><span>Sale el camión con 3 paradas (Jorge)</span>${chip("n", "clock", "Programada")}</li><li><span class="t">Vie</span><span>Pago de anticipos de la semana</span>${chip("n", "coins", "Calendario fijo")}</li></ul></div>
      <div><h2>Atención</h2><div class="stack">${neg ? `<div class="card">${chip("bad", "warn", `Caja negativa la semana del ${neg.w}`)}<p class="mut">Mueva un pago o adelante un cobro.</p></div>` : ""}${open.map((c) => `<div class="card">${chip(c.hours <= POLICY.windowH ? "warn" : "n", "flag", `Reclamo de ${c.buyer.split(" (")[0]}`)}<p class="mut">${c.hours <= POLICY.windowH ? `Ventana abierta: ${POLICY.windowH - c.hours} h restantes` : "Fuera de ventana"}</p></div>`).join("")}${stale ? `<div class="card">${chip("warn", "clock", `${stale} estimaciones de cosecha desactualizadas`)}<p class="mut">Más de 7 días sin actualizar.</p></div>` : ""}</div>
      <h2>Año de la asociación</h2><div class="card"><div class="tl">${["Pre-temporada · prospectar", "Temporada · operar", "Cierre · liquidar"].map((t, i) => `<div class="${(i === 2 && ph[0].startsWith("Cierre")) || (i === 1 && /Temporada|Final/.test(ph[0])) || (i === 0 && ph[0].startsWith("Pre")) ? "on" : ""}">${t}</div>`).join("")}</div><p class="mut">${esc(ph[1])}</p></div></div></div>`;
    if (role === "comercial") { const M = window.CosechaMarket, ls = M.S.leads.filter((l) => l.stage !== "client").slice(0, 5), a = M.TASKS.filter((t) => t.p === "A"); return `<h2>Sus acciones de hoy</h2><div class="stack">${ls.map((l) => `<div class="card row sp"><span><b>${esc(l.org)}</b><br><span class="mut">${l.country} · ${l.type} · encaje ${M.fit(l).total}/100</span></span><button class="btn alt sm" data-nav="mercado">Abrir</button></div>`).join("")}</div><h2>Ruta de arranque</h2><div class="card"><b>Fase A: ${a.filter((t) => t.done).length}/${a.length}</b><div class="bar"><i style="width:${(a.filter((t) => t.done).length / a.length) * 100}%"></i></div><p class="mut">Usted no ve pagos ni precios a productores.</p></div>`; }
    if (role === "acopio") return `<h2>Hoy recibe</h2><p class="mut">${pe.length ? `${pe.length} productores aún sin confirmar.` : "Todos confirmaron."} Funciona sin señal.</p><div class="stack">${S.prod.filter((p) => p.inc && by[p.id].kg > 0).map((p) => `<div class="card row sp"><span><b>${esc(p.name)}</b> <span class="mut">· ${esc(p.zone)}</span><br>Esperado: <b>${KG(by[p.id].kg)}</b></span>${stChip(p.st)}</div>`).join("")}</div><p>${goBtn("recepcion", "Empezar a recibir")}</p>`;
    if (role === "transportista") return `<h2>Su ruta de hoy</h2><div class="stack">${S.stops.map((s) => `<div class="card row sp"><span><b>${esc(s.buyer)}</b><br><span class="mut">${s.win} · ${KG(s.kg)}</span></span>${chip(s.st === "done" ? "ok" : s.st === "arr" ? "warn" : "n", s.st === "done" ? "check" : "clock", s.st === "done" ? "Entregada" : s.st === "arr" ? "En espera" : "Pendiente")}</div>`).join("")}</div><div class="card" style="margin-top:.8rem"><b>Su pago por esta ruta: ${CRC(S.fee)}</b><p class="mut">Se paga el viernes ${fdate(new Date(Date.now()))}. Las esperas de más de 1 hora se pagan aparte.</p></div><p>${goBtn("entregas", "Empezar la ruta")}</p>`;
    if (role === "contabilidad") { const saldo = window.Cosecha.pool ? window.Cosecha.pool().rows.reduce((a, r) => a + r.saldo, 0) : 0; return `<div class="kpis"><div class="kpi"><div class="l">Por cobrar a compradores</div><div class="n">${CRC(S.orders.reduce((a, o) => a + o.kg * o.price, 0))}</div></div><div class="kpi"><div class="l">Saldo por pagar a productores</div><div class="n">${CRC(saldo)}</div></div><div class="kpi"><div class="l">Fondo de reclamos y mermas</div><div class="n">${CRC(S.orders.reduce((a, o) => a + o.kg * o.price, 0) * POLICY.fundPct / 100)}</div></div></div><p>${goBtn("dinero", "Ver pagos y exportar")}</p><p class="mut">Solo lectura: no modifica operación ni accede a prospectos.</p>`; }
    if (role === "enlace") return `<h2>Su zona esta semana</h2><p class="mut">Usted ayuda a que lleguen los avisos a quienes no usan WhatsApp. Ve fechas y cantidades, no montos.</p><p>${goBtn("zona", "Ver mi zona")}</p>`;
    return deny("Sin vista");
  };

  // ── ENVÍOS ──
  V.envios = () => {
    const { T, r, by } = calc(), diff = T - r.assignedKg, pe = pend(by);
    return `<div class="cols2"><div><h2 style="margin-top:0">Reparto del envío del ${fdate(nextThu())}</h2><table class="tbl"><thead><tr><th>Participa</th><th>Productor</th><th class="r">Capacidad</th><th>Tope</th><th class="r">Asignado</th><th>Equidad</th><th>Estado</th><th>Contacto</th></tr></thead><tbody>
      ${S.prod.map((p) => { const x = by[p.id], adj = S.equity && p.def ? Math.round(Math.max(-0.3, Math.min(0.3, p.def)) * 100 * 0.5) : 0; return `<tr class="${p.inc ? "" : "off"}"><td><label class="sw" title="Participa en este envío"><input type="checkbox" data-a="ops:inc" data-id="${p.id}" ${p.inc ? "checked" : ""} aria-label="Participa ${esc(p.name)}"><i></i></label></td>
        <td><b>${esc(p.name)}</b><br><span class="mut">${esc(p.zone)} · ${CH[p.ch]}</span><details><summary class="mut">¿Por qué esta cantidad?</summary><span class="mut">${esc(x.why)}</span></details></td><td class="r">${KG(p.w)}</td>
        <td><input type="number" inputmode="decimal" min="0" placeholder="—" value="${p.cap ?? ""}" data-a="ops:cap" data-f="cap-${p.id}" data-id="${p.id}" aria-label="Tope de ${esc(p.name)}"></td><td class="r kgc">${KG(x.kg)}</td>
        <td>${adj ? chip(adj > 0 ? "ok" : "n", adj > 0 ? "plus" : "check", `${adj > 0 ? "+" : ""}${adj} %`) : '<span class="mut">—</span>'}</td><td>${p.inc ? stChip(p.st) : chip("n", "x", "Excluido")}</td>
        <td><a class="btn alt sm" href="tel:+506${p.phone}">${ic("phone")}</a> <a class="btn alt sm" target="_blank" rel="noopener noreferrer" href="${waLink(p.phone, msgFor(p, x.kg))}" aria-label="WhatsApp a ${esc(p.name)}">${ic("chat")}</a></td></tr>`; }).join("")}</tbody></table></div>
      <aside class="summ"><div class="card"><h2 style="margin-top:0">Resumen</h2><dl class="kv"><dt>Pedido</dt><dd>${KG(T)}</dd><dt>Solicitado</dt><dd>${KG(r.assignedKg)}</dd><dt>Diferencia</dt><dd>${r.shortfallKg ? chip("bad", "warn", `Faltan ${KG(r.shortfallKg)}`) : diff === 0 ? "0 kg" : KG(diff)}</dd></dl>
        <h2>Pedidos que cubre</h2>${S.orders.map((o) => `<label class="row sp" style="padding:.3rem 0"><span class="row"><label class="sw"><input type="checkbox" data-a="ops:ord" data-id="${o.id}" ${o.on ? "checked" : ""} aria-label="${esc(o.buyer)}"><i></i></label> ${esc(o.buyer)}</span><b>${KG(o.kg)}</b></label>`).join("")}
        <label class="f" style="margin-top:.6rem">Margen sobre lo pedido (%)<input type="number" inputmode="decimal" min="0" max="30" value="${S.buffer}" data-a="ops:buf" data-f="buf"></label>
        <label class="row sp" style="margin:.6rem 0"><span>Aplicar equidad<br><span class="mut">Compensa a quien quedó corto antes</span></span><span class="sw"><input type="checkbox" data-a="ops:eq" ${S.equity ? "checked" : ""} aria-label="Aplicar equidad"><i></i></span></label>
        <button class="btn" data-a="ops:queue" ${pe.length ? "" : "disabled"} style="width:100%;justify-content:center">${ic("chat")} Convocar (${pe.length})</button><p class="mut">El mensaje no se envía solo: usted lo revisa y lo manda desde su teléfono.</p></div></aside></div>`;
  };
  const queue = () => {
    const { by } = calc(), p = pend(by)[0], sh = $("#sheet");
    if (!p) { sh.hidden = true; window.Cosecha.toast("Todos respondieron"); return window.Cosecha.render(); }
    window.Cosecha.render(); const kg = by[p.id].kg, msg = msgFor(p, kg), left = pend(by).length;
    const cta = { wa: `<a class="btn" target="_blank" rel="noopener noreferrer" href="${waLink(p.phone, msg)}">${ic("chat")} Abrir WhatsApp</a>`, call: `<a class="btn" href="tel:+506${p.phone}">${ic("phone")} Llamar</a><p class="mut">Guion: «Buenos días ${esc(p.name)}, le llamo de la Asociación. Para el jueves necesitamos ${kg} kg. ¿Puede?»</p>`, voice: `<button class="btn" data-a="ops:voice">${ic("mic")} Grabar nota de voz</button><p class="mut">Hable despacio, dos frases: qué, cuánto y cuándo.</p>`, link: `<button class="btn" data-a="ops:link">${ic("users")} Avisar al enlace de zona</button><p class="mut">${esc(p.name)} no usa WhatsApp: su enlace de zona le llevará el aviso.</p>` }[p.ch];
    sh.hidden = false; sh.innerHTML = `<div class="row sp"><b>Siguiente: ${esc(p.name)} · ${esc(p.zone)}</b><button class="btn alt sm" data-close>Cerrar</button></div><p class="mut">Canal preferido: <b>${CH[p.ch]}</b>. Quedan ${left} por convocar.</p><div class="rcpt">${esc(msg)}</div><p>${cta}</p><p class="mut">¿Qué respondió?</p><div class="row"><button class="btn sm" data-a="ops:resp" data-st="ok" data-id="${p.id}">${ic("check")} Confirmó</button><button class="btn alt sm" data-a="ops:resp" data-st="no" data-id="${p.id}">${ic("x")} No puede</button><button class="btn alt sm" data-a="ops:resp" data-st="nc" data-id="${p.id}">${ic("clock")} No contestó</button></div>`;
  };

  // ── RECEPCIÓN ──
  const REASONS = ["golpeado", "inmaduro", "plaga u hongo", "calibre", "sucio"];
  V.recepcion = () => {
    const c = S.rc, p = S.prod.find((x) => x.id === c.p), { by } = calc(), acc = Math.max(0, c.recv - c.rej), money = C.role !== "acopio", amt = acc * 650 * 0.6;
    const fr = c.hh <= 6 ? ["ok", "check", "Fresca"] : c.hh <= 24 ? ["warn", "clock", "Atención: pasar a frío hoy"] : ["bad", "warn", "Vence pronto: priorizar la entrega"];
    const lot = `RB-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${p.id.toUpperCase()}`, tkt = `TIQUETE DE PESO · Asociación (ejemplo)\nProductor: ${p.name}\nFecha: ${fdate(new Date())}\nLote: ${lot}\nRecibido: ${KG(c.recv)} · Rechazado: ${KG(c.rej)}${c.why.length ? " (" + c.why.join(", ") + ")" : ""}\nAceptado: ${KG(acc)}${money ? `\nAnticipo estimado: ${CRC(amt)} (se paga el viernes)` : ""}`;
    return `<div class="cols2"><div class="stack"><div class="card"><label class="f">Productor<select data-a="ops:rcp" data-f="rcp">${S.prod.map((x) => `<option value="${x.id}" ${x.id === c.p ? "selected" : ""}>${esc(x.name)} · ${esc(x.zone)}${by[x.id].kg ? ` · esperado ${KG(by[x.id].kg)}` : ""}</option>`).join("")}</select></label>
      <div class="grid2" style="margin-top:.6rem"><label class="f">Kilos recibidos<input class="huge" type="number" inputmode="decimal" value="${c.recv}" data-a="ops:rc" data-k="recv" data-f="rc-recv"></label><label class="f">Rechazados (kg)<input class="huge" type="number" inputmode="decimal" value="${c.rej}" data-a="ops:rc" data-k="rej" data-f="rc-rej"></label></div>
      <p class="mut" style="margin:.6rem 0 .3rem">Motivo del rechazo</p><div class="chips">${REASONS.map((w) => `<button data-a="ops:why" data-w="${w}" aria-pressed="${c.why.includes(w)}">${w}</button>`).join("")}</div>
      <div class="grid2" style="margin-top:.6rem"><label class="f">Horas desde la cosecha<input type="number" inputmode="decimal" value="${c.hh}" data-a="ops:rc" data-k="hh" data-f="rc-hh"></label><label class="f">Temperatura de llegada (°C, opcional)<input type="number" inputmode="decimal" value="${c.temp}" data-a="ops:rc" data-k="temp" data-f="rc-temp"></label></div>
      <p style="margin:.6rem 0"><button class="btn alt" data-a="ops:photo">${ic("cam")} ${c.photo ? "Foto adjunta ✓" : "Tomar foto del lote"}</button> <span class="mut">La foto evita disputas de calidad.</span></p></div>
      <div class="row"><button class="btn" data-a="ops:save">${ic("check")} Guardar recepción</button><button class="btn alt" data-a="ops:rcpt">${money ? "Ver recibo" : "Ver tiquete de peso"}</button></div>
      ${c.rcpt ? `<div class="rcpt">${esc(tkt)}</div>${money ? `<p><a class="btn alt" target="_blank" rel="noopener noreferrer" href="${waLink(p.phone, "Buenos días, " + p.name + ". Le comparto el recibo de hoy.\n\n" + tkt + "\n\nMuchas gracias por su entrega.")}">${ic("chat")} Enviar por WhatsApp</a></p>` : '<p class="mut">El recibo con montos lo envía el gestor.</p>'}` : ""}</div>
      <aside class="summ"><div class="card"><div class="row sp"><span>Aceptado</span><span class="big">${KG(acc)}</span></div><div class="row sp" style="margin-top:.4rem"><span>Reloj de frescura</span>${chip(fr[0], fr[1], fr[2])}</div>${c.temp !== "" && +c.temp > 15 ? `<p>${chip("warn", "snow", "Llegó a más de 15 °C")}</p>` : ""}<p class="mut">Lote ${lot}. Sin frío, la fruta empieza a oscurecerse en unos 3–4 días (valor configurable; validar con un técnico).</p>${money ? `<hr><div class="row sp"><span>Anticipo estimado</span><b>${CRC(amt)}</b></div>` : '<p class="mut">Usted no ve precios ni montos.</p>'}</div></aside></div>`;
  };

  // ── ENTREGAS (transportista) ──
  V.entregas = () => {
    const mine = C.role === "transportista", waitPay = S.stops.reduce((a, s) => a + (s.wait > 60 ? Math.ceil((s.wait - 60) / 60) * S.waitRate : 0), 0);
    return `<div class="cols2"><div class="stack">${S.stops.map((s, i) => `<div class="card stop ${s.st}"><div class="row sp"><b style="font-size:1.1rem">${i + 1}. ${esc(s.buyer)}</b><span>${chip(s.st === "done" ? "ok" : s.st === "arr" ? "warn" : "n", s.st === "done" ? "check" : "clock", s.st === "done" ? "Entregada" : s.st === "arr" ? "Esperando" : "Pendiente")}</span></div>
      <p class="mut" style="margin:.2rem 0">${esc(s.addr)} · Ventana ${s.win} · <b>${KG(s.kg)}</b></p><div class="tl"><div class="on">Pendiente</div><div class="${s.st !== "pend" ? "on" : ""}">Llegué</div><div class="${s.st === "done" ? "on" : ""}">Entregado</div></div>
      ${mine || C.role === "owner" || C.role === "gestor" ? (s.st === "pend" ? `<button class="btn" data-a="ops:arr" data-id="${s.id}">Llegué</button> <a class="btn alt" href="tel:+506${s.phone}">${ic("phone")} Llamar al comprador</a>` : s.st === "arr" ? `<p>${chip("warn", "clock", `Espera: ${s.wait} min`)} ${s.wait > 60 ? chip("ok", "coins", "Espera pagable") : ""} <button class="btn alt sm" data-a="ops:wait" data-id="${s.id}">+15 min (simular)</button></p>
        <div class="grid2"><label class="f">Quién recibe<input type="text" data-a="ops:rcv" data-id="${s.id}" data-f="rcv-${s.id}" value="${esc(s.rcv || "")}" placeholder="Nombre"></label><label class="f">Temperatura (°C)<input type="number" data-a="ops:tmp" data-id="${s.id}" data-f="tmp-${s.id}" value="${s.tmp ?? ""}"></label></div>
        <p><button class="btn alt" data-a="ops:sphoto" data-id="${s.id}">${ic("cam")} ${s.photo ? "Foto adjunta ✓" : "Foto de la entrega"}</button> <button class="btn" data-a="ops:done" data-id="${s.id}" ${s.rcv && s.photo ? "" : "disabled"}>Marcar entregada</button></p><p class="mut">Con nombre, foto y hora, nadie puede discutir que llegó.</p>` : `<p>${chip("ok", "check", `Entregada · recibió ${esc(s.rcv || "—")}${s.tmp != null && s.tmp !== "" ? ` · ${s.tmp} °C` : ""}`)}</p>`) : ""}</div>`).join("")}</div>
      <aside class="summ"><div class="card"><h2 style="margin-top:0">${mine ? "Su pago" : "Pago del transportista"}</h2><dl class="kv"><dt>Por la ruta</dt><dd>${CRC(S.fee)}</dd><dt>Esperas pagables</dt><dd>${CRC(waitPay)}</dd><dt>Total</dt><dd><b>${CRC(S.fee + waitPay)}</b></dd><dt>Se paga</dt><dd>viernes</dd></dl><p class="mut">Tarifa de espera: ${CRC(S.waitRate)} por hora después de la primera (valor a validar con transportistas).</p></div></aside></div>`;
  };

  // ── RECLAMOS ──
  const evalClaim = (c) => {
    const pct = (c.aff / c.kg) * 100, inW = c.hours <= POLICY.windowH, ev = c.photos >= POLICY.minPhotos, serious = /hongo|podrid/.test(c.cause), price = 1350;
    let dec, cls, credit = 0;
    if (!inW) { dec = "Fuera de ventana: se considera aceptada. Solo se atiende como gesto comercial si hay defecto oculto probado."; cls = "n"; }
    else if (!ev) { dec = `Falta evidencia: pida ${POLICY.minPhotos} fotos (caja con etiqueta de lote, fruta afectada, balanza).`; cls = "warn"; }
    else if (pct <= POLICY.tol.decay) { dec = `Dentro de tolerancia (${pct.toFixed(1)} % ≤ ${POLICY.tol.decay} %): sin crédito; se registra.`; cls = "ok"; }
    else if (pct <= POLICY.tol.total) { const f = serious ? 1 : 0.5; credit = c.aff * price * f; dec = `Crédito del ${f * 100} % por ${KG(c.aff)} afectados (${serious ? "hongo/pudrición" : "oscurecimiento o daño que no afecta la pulpa"}).`; cls = "ok"; }
    else { dec = `Reclamo mayor (${pct.toFixed(1)} % > ${POLICY.tol.total} %): inspección y decisión de la junta.`; cls = "bad"; }
    const own = { oscurecimiento: "Frío / manejo", golpes: "Manejo o transporte", hongo: "Lote (productor) · verificar foto de recepción" }[c.cause] || "Por determinar";
    return { pct, inW, ev, dec, cls, credit, own };
  };
  V.reclamos = () => {
    const canDecide = C.role === "owner" || C.role === "gestor", sel = S.claims.find((c) => c.id === S.cl), fund = S.orders.reduce((a, o) => a + o.kg * o.price, 0) * POLICY.fundPct / 100;
    return `<div class="card"><b>Política de reclamos (resumen)</b><ul class="mut" style="margin:.3rem 0 0 1.1rem"><li>El comprador avisa <b>el mismo día, hasta ${POLICY.windowH} horas</b> después de recibir, con <b>${POLICY.minPhotos} fotos</b> y kilos afectados.</li><li>Tolerancia: hasta ${POLICY.tol.decay} % sin crédito; ${POLICY.tol.decay}–${POLICY.tol.total} % crédito proporcional; más, inspección.</li><li>Lo que se aceptó en el acopio <b>no se le cobra al productor</b>: el costo sale del <b>fondo de reclamos</b> (${POLICY.fundPct} % de ventas), y lo que sobra se reparte entre productores al cerrar la temporada.</li></ul><p class="mut">Fondo acumulado: <b>${CRC(fund)}</b> (valores iniciales a validar; ver documento de política).</p></div>
    <div class="cols2"><div class="stack">${S.claims.map((c) => { const e = evalClaim(c); return `<div class="card"><div class="row sp"><b>${esc(c.buyer)}</b>${chip(e.inW ? "warn" : "n", "flag", e.inW ? `Ventana: quedan ${POLICY.windowH - c.hours} h` : `Fuera de ventana (${c.hours} h)`)}</div><p class="mut" style="margin:.2rem 0">Lote ${c.lot} · ${KG(c.aff)} de ${KG(c.kg)} · ${esc(c.cause)} · ${c.photos} fotos</p><p style="margin:.2rem 0">«${esc(c.note)}»</p>${c.st !== "nuevo" ? chip("ok", "check", c.st) : `<button class="btn alt sm" data-a="ops:cl" data-id="${c.id}">Evaluar según la política</button>`}</div>`; }).join("")}</div>
      <aside class="summ">${sel ? (() => { const e = evalClaim(sel); return `<div class="card"><h2 style="margin-top:0">Evaluación · ${esc(sel.buyer.split(" (")[0])}</h2><dl class="kv"><dt>Afectado</dt><dd>${e.pct.toFixed(1)} %</dd><dt>Ventana (≤ ${POLICY.windowH} h)</dt><dd>${e.inW ? "✓ dentro" : "✕ fuera"}</dd><dt>Evidencia (≥ ${POLICY.minPhotos} fotos)</dt><dd>${e.ev ? "✓" : "✕ faltan"}</dd><dt>Causa probable</dt><dd>${esc(e.own)}</dd></dl><p>${chip(e.cls, e.cls === "ok" ? "check" : "warn", e.dec)}</p>${e.credit ? `<p><b>Crédito sugerido: ${CRC(e.credit)}</b><br><span class="mut">Sale del fondo de reclamos; no se descuenta al productor.</span></p>` : ""}${canDecide ? `<div class="row"><button class="btn sm" data-a="ops:clok" data-id="${sel.id}">Aplicar decisión</button><button class="btn alt sm" data-a="ops:clmore" data-id="${sel.id}">Pedir más evidencia</button></div>` : '<p class="mut">Decide el gestor. Usted puede ver el caso y acompañar al comprador.</p>'}</div>`; })() : '<div class="card mut">Elija un reclamo para ver cómo lo resolvería la política.</div>'}</aside></div>`;
  };

  // ── Eventos ──
  const R = () => window.Cosecha.render();
  window.Cosecha.handlers.push((type, e) => {
    const t = e.target.closest("[data-a]"); if (!t) return false; const a = t.dataset.a; if (!a.startsWith("ops:")) return false; const id = t.dataset.id;
    if (type === "click") {
      if (a === "ops:queue") { queue(); return true; } if (a === "ops:why") { const w = t.dataset.w, i = S.rc.why.indexOf(w); i < 0 ? S.rc.why.push(w) : S.rc.why.splice(i, 1); R(); return true; }
      if (a === "ops:photo") { S.rc.photo = !S.rc.photo; R(); return true; } if (a === "ops:rcpt") { S.rc.rcpt = true; R(); return true; }
      if (a === "ops:save") { if (C.offline) { C.queue++; window.Cosecha.toast("Guardado en el teléfono; se enviará al volver la señal"); } else window.Cosecha.toast("Recepción guardada"); R(); return true; }
      if (a === "ops:resp") { const p = S.prod.find((x) => x.id === id), before = calc().by[id].kg; p.st = t.dataset.st; if (p.st === "no") { p.inc = false; window.Cosecha.toast(`${p.name} no puede: se redistribuyeron ${before} kg entre los demás`); } queue(); return true; }
      if (a === "ops:voice" || a === "ops:link") { window.Cosecha.toast(a === "ops:voice" ? "Nota de voz grabada (simulado)" : "Aviso entregado al enlace de zona (simulado)"); return true; }
      const st = S.stops.find((x) => x.id === id);
      if (a === "ops:arr") { st.st = "arr"; st.wait = 0; R(); return true; } if (a === "ops:wait") { st.wait += 15; R(); return true; } if (a === "ops:sphoto") { st.photo = !st.photo; R(); return true; } if (a === "ops:done") { st.st = "done"; window.Cosecha.toast("Entrega registrada con nombre, foto y hora"); R(); return true; }
      if (a === "ops:cl") { S.cl = id; R(); return true; }
      if (a === "ops:clok") { const c = S.claims.find((x) => x.id === id); c.st = "resuelto"; window.Cosecha.toast("Decisión aplicada y aviso enviado al comprador"); S.cl = null; R(); return true; }
      if (a === "ops:clmore") { window.Cosecha.toast("Se pidió más evidencia al comprador"); return true; }
      return false;
    }
    const v = e.target.value;
    if (a === "ops:inc" && type === "change") { S.prod.find((p) => p.id === id).inc = e.target.checked; R(); return true; }
    if (a === "ops:ord" && type === "change") { S.orders.find((o) => o.id === id).on = e.target.checked; R(); return true; }
    if (a === "ops:eq" && type === "change") { S.equity = e.target.checked; R(); return true; }
    if (a === "ops:rcp" && type === "change") { S.rc.p = v; R(); return true; }
    if (type === "input") {
      if (a === "ops:cap") { S.prod.find((p) => p.id === id).cap = v === "" ? null : Math.max(0, +v); R(); return true; } if (a === "ops:buf") { S.buffer = Math.max(0, Math.min(30, +v || 0)); R(); return true; }
      if (a === "ops:rc") { S.rc[t.dataset.k] = v === "" ? "" : Math.max(0, +v); R(); return true; } if (a === "ops:rcv") { S.stops.find((x) => x.id === id).rcv = v; R(); return true; } if (a === "ops:tmp") { S.stops.find((x) => x.id === id).tmp = v; return true; }
    }
    return false;
  });
})();
