/* Cosecha · operación (prototipo). Sin servidor: todo en memoria. Datos y nombres FICTICIOS. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const CRC = (n) => "₡ " + n.toLocaleString("es-CR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\u00a0/g, " ");
  const KG = (n) => n.toLocaleString("es-CR", { maximumFractionDigits: 2 }) + " kg";
  const I = {
    home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>', truck: '<path d="M2 6h11v10H2zM13 9h4l4 4v3h-8"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    scale: '<path d="M4 20h16M12 4v16M5 8h14M5 8l-3 7a3 3 0 0 0 6 0zM19 8l-3 7a3 3 0 0 0 6 0z"/>', coins: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    phone: '<path d="M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>', chat: '<path d="M21 12a8 8 0 0 1-11.600 7.100L4 20l1-4.600A8 8 0 1 1 21 12z"/>',
    check: '<path d="M5 12l5 5L20 7"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  };
  const ic = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;
  const ST = { new: ["n", "clock", "Por solicitar"], ok: ["ok", "check", "Confirmó"], no: ["bad", "x", "No puede"], nc: ["warn", "clock", "No contestó · reintentar 3:00 p. m."] };
  const chip = (st) => `<span class="chip ${ST[st][0]}">${ic(ST[st][1])}${ST[st][2]}</span>`;

  const S = {
    v: "hoy", buffer: 0, equity: true, offline: false, queue: 0,
    orders: [{ id: "o1", buyer: "Frutería La Esquina (ej.)", kg: 120, on: true }, { id: "o2", buyer: "Hotel Playa Ejemplo", kg: 200, on: true }, { id: "o3", buyer: "Mayorista Central (ej.)", kg: 160, on: true }],
    producers: [
      ["p1", "Don Mario", "Corredores", 120, 0.2], ["p2", "Doña Lidia", "Osa", 90, 0.0], ["p3", "Don Efraín", "Pérez Zeledón", 150, -0.1], ["p4", "Doña Karla", "Pococí", 60, 0.3],
      ["p5", "Don Rafa", "Guácimo", 80, 0.0], ["p6", "Doña Nuria", "Siquirres", 45, 0.1], ["p7", "Don Beto", "Corredores", 100, -0.2], ["p8", "Doña Yamileth", "Osa", 35, 0.0],
    ].map(([id, name, zone, w, def], i) => ({ id, name, zone, w, def, cap: null, inc: true, st: "new", phone: "8888000" + (i + 1) })),
    rc: { p: "p1", recv: 90, rej: 10, why: ["golpeado"], hh: 3, price: 650, saved: false, rcpt: false },
    pay: 70000,
    weeks: [["3 nov", 0, 800000], ["10 nov", 650000, 300000], ["17 nov", 0, 1500000], ["24 nov", 1800000, 200000], ["1 dic", 0, 700000], ["8 dic", 900000, 500000], ["15 dic", 1200000, 0], ["22 dic", 0, 400000]],
  };
  const REASONS = ["golpeado", "inmaduro", "plaga u hongo", "calibre", "sucio"];

  const nextThu = () => { const d = new Date(); d.setDate(d.getDate() + ((4 - d.getDay() + 7) % 7 || 7)); return d; };
  const fdate = (d) => d.toLocaleDateString("es-CR", { weekday: "short", day: "numeric", month: "short" }).replace(",", "").replace(/\.$/, "");
  const calc = () => {
    const T = Math.round(S.orders.filter((o) => o.on).reduce((a, o) => a + o.kg, 0) * (1 + S.buffer / 100));
    const r = Alloc.allocate(T, S.producers.map((p) => ({ id: p.id, weight: p.w, cap: p.cap, include: p.inc, deficit: p.def })), { equityK: S.equity ? 0.5 : 0 });
    const by = Object.fromEntries(r.rows.map((x) => [x.id, x]));
    return { T, r, by };
  };
  const waLink = (phone, msg) => `https://wa.me/506${phone}?text=${encodeURIComponent(msg)}`;
  const cash = () => { let c = 900000; return S.weeks.map(([w, i, o]) => ((c += i - o), { w, i, o, c })); };

  const V = {
    hoy() {
      const { by } = calc(), m = new Date().getMonth() + 1;
      const ph = m <= 6 ? ["Pre-temporada", "Hora de conseguir compradores para la próxima cosecha (julio a noviembre)."] : m <= 9 ? ["Temporada", "Puntualidad y calidad: así se construye la reputación."] : m === 10 ? ["Final de temporada", "Liquide a productores y anote lo aprendido antes del cierre."] : ["Cierre de temporada", "Liquidaciones, balance y lecciones; y empiece a prospectar el próximo año."];
      const pend = S.producers.filter((p) => p.inc && by[p.id].kg > 0 && (p.st === "new" || p.st === "nc")).length;
      const neg = cash().find((x) => x.c < 0);
      return `<h1>Hoy</h1>
      <div class="card"><div class="mut">Fase del año</div><div class="big" style="font-size:1.4rem">${ph[0]}</div><p>${ph[1]}</p></div>
      <h2>Lo que necesita atención</h2>
      <div class="card row sp"><span class="chip ${pend ? "warn" : "ok"}">${ic(pend ? "clock" : "check")}${pend ? pend + " solicitudes sin confirmar" : "Todo confirmado"}</span><button class="btn sm" data-v="envio">Ver envío ${fdate(nextThu())}</button></div>
      <div class="card row sp"><span class="chip warn">${ic("clock")}1 recepción pendiente</span><button class="btn sm alt" data-v="recepcion">Registrar</button></div>
      <div class="card row sp"><span class="chip ${neg ? "bad" : "ok"}">${ic(neg ? "warn" : "check")}${neg ? `Caja negativa la semana del ${neg.w}` : "Caja proyectada sin faltantes"}</span><button class="btn sm alt" data-v="dinero">Ver caja</button></div>
      <p class="mut">Siguiente mejor acción: ${pend ? "terminar de convocar a los productores del próximo envío." : "revisar la caja proyectada."} Para conseguir compradores, vea el prototipo <a href="../prototype-mercado/index.html">Mercado</a>.</p>`;
    },
    envio() {
      const { T, r, by } = calc(), diff = T - r.assignedKg, pend = S.producers.some((p) => p.inc && by[p.id].kg > 0 && (p.st === "new" || p.st === "nc"));
      return `<h1>Envío del ${fdate(nextThu())}</h1>
      <h2>Pedidos que cubre</h2>
      ${S.orders.map((o) => `<label class="card row sp"><span class="row"><input type="checkbox" data-a="ord" data-id="${o.id}" ${o.on ? "checked" : ""} style="width:1.4rem;height:1.4rem"> ${esc(o.buyer)}</span><b>${KG(o.kg)}</b></label>`).join("")}
      <div class="row"><label class="f" style="flex:1">Margen sobre lo pedido (%)<input type="number" inputmode="decimal" min="0" max="30" value="${S.buffer}" data-k="buffer"></label>
      <label class="row" style="flex:1"><input type="checkbox" data-a="eq" ${S.equity ? "checked" : ""} style="width:1.4rem;height:1.4rem"> <span>Aplicar equidad <span class="mut">(compensa a quien quedó corto)</span></span></label></div>
      <h2>Reparto sugerido entre productores</h2>
      ${S.producers.map((p) => { const x = by[p.id]; return `<div class="card pc ${p.inc ? "" : "off"}">
        <div><b>${esc(p.name)}</b> <span class="mut">· ${esc(p.zone)} · capacidad ${KG(p.w)}</span><div>${p.inc ? chip(p.st) : '<span class="chip n">Excluido hoy</span>'}</div></div>
        <div class="kg" aria-label="Kilos asignados">${KG(x.kg)}</div>
        <div class="mut" style="grid-column:1/-1">${esc(x.why)}</div>
        <div class="row" style="grid-column:1/-1">
          <label class="row"><input type="checkbox" data-a="inc" data-id="${p.id}" ${p.inc ? "checked" : ""} style="width:1.3rem;height:1.3rem"> Participa</label>
          <label class="row">Tope <input type="number" inputmode="decimal" style="width:6rem;min-height:40px" value="${p.cap ?? ""}" placeholder="—" data-k="cap:${p.id}"></label>
          <a class="btn sm alt" href="tel:+506${p.phone}">${ic("phone")}Llamar</a>
          <a class="btn sm alt" target="_blank" rel="noopener noreferrer" href="${waLink(p.phone, `Hola ${p.name}, para el envío del ${fdate(nextThu())} le pedimos ${x.kg} kg de mamón chino. ¿Nos confirma por favor?`)}">${ic("chat")}WhatsApp</a>
        </div></div>`; }).join("")}
      <div class="sum ${r.shortfallKg ? "bad" : ""}" role="status"><span>Pedido: ${KG(T)}</span><span>Solicitado: ${KG(r.assignedKg)}</span><span>${r.shortfallKg ? `${ic("warn")} Faltan ${KG(r.shortfallKg)}` : diff === 0 ? "Diferencia: 0 kg" : ""}</span></div>
      <p><button class="btn" data-a="queue" ${pend ? "" : "disabled"}>${ic("chat")} Convocar a productores (1 toque cada uno)</button></p>`;
    },
    recepcion() {
      const c = S.rc, p = S.producers.find((x) => x.id === c.p), acc = Math.max(0, c.recv - c.rej), amt = Math.round(acc * c.price * 100) / 100;
      const fr = c.hh <= 6 ? ["ok", "check", "Fresca"] : c.hh <= 24 ? ["warn", "clock", "Atención: pasar a frío hoy"] : ["bad", "warn", "Vence pronto: priorizar entrega"];
      const lot = `RB-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${p.id.toUpperCase()}`;
      const rcpt = `RECIBO DE FRUTA · Asociación (ejemplo)\nProductor: ${p.name}\nFecha: ${fdate(new Date())}\nLote: ${lot}\nRecibido: ${KG(c.recv)} · Rechazado: ${KG(c.rej)}${c.why.length ? " (" + c.why.join(", ") + ")" : ""}\nAceptado: ${KG(acc)} × ${CRC(c.price)}\nMonto: ${CRC(amt)}\nEstado de pago: pendiente`;
      return `<h1>Recepción en el acopio</h1>
      <label class="f">Productor<select data-k="rc.p" style="min-height:48px;border:2px solid var(--line);border-radius:10px;background:var(--s)">${S.producers.map((x) => `<option value="${x.id}" ${x.id === c.p ? "selected" : ""}>${esc(x.name)} · ${esc(x.zone)}</option>`).join("")}</select></label>
      <div class="row" style="margin-top:.6rem"><label class="f" style="flex:1">Kilos recibidos<input class="huge" type="number" inputmode="decimal" value="${c.recv}" data-k="rc.recv"></label>
      <label class="f" style="flex:1">Rechazados (kg)<input class="huge" type="number" inputmode="decimal" value="${c.rej}" data-k="rc.rej"></label></div>
      <h2>Motivo del rechazo</h2><div class="chips">${REASONS.map((w) => `<button data-a="why" data-w="${w}" aria-pressed="${c.why.includes(w)}">${w}</button>`).join("")}</div>
      <div class="row" style="margin-top:.8rem"><label class="f" style="flex:1">Horas desde la cosecha<input type="number" inputmode="decimal" value="${c.hh}" data-k="rc.hh"></label>
      <label class="f" style="flex:1">Precio por kg (₡)<input type="number" inputmode="decimal" value="${c.price}" data-k="rc.price"></label></div>
      <div class="card"><div class="row sp"><span>Aceptado</span><span class="big">${KG(acc)}</span></div><div class="row sp"><span>Monto</span><b>${CRC(amt)}</b></div>
      <div class="row sp"><span>Reloj de frescura</span><span class="chip ${fr[0]}">${ic(fr[1])}${fr[2]}</span></div>
      <div class="mut">Lote ${lot} · Sin frío, la fruta empieza a oscurecerse en unos 3–4 días (valor configurable; validar con un técnico).</div></div>
      <div class="row"><button class="btn" data-a="save">${ic("check")} Guardar recepción</button><button class="btn alt" data-a="rcpt">Ver recibo</button></div>
      ${c.rcpt ? `<h2>Recibo para el productor</h2><div class="rcpt">${esc(rcpt)}</div><p><a class="btn alt" target="_blank" rel="noopener noreferrer" href="${waLink(p.phone, "Hola " + p.name + ", le comparto el recibo de hoy.\n\n" + rcpt + "\n\nMuchas gracias por su entrega.")}">${ic("chat")} Enviar por WhatsApp</a></p>` : ""}`;
    },
    dinero() {
      const dl = [["jue 15 oct", 90, 650], ["jue 22 oct", 50, 600]].map(([d, kg, pr]) => ({ d, amt: Math.round(kg * pr * 100) / 100 }));
      let left = S.pay; const rows = dl.map((x) => { const paid = Math.min(x.amt, left); left -= paid; return { ...x, paid, st: paid >= x.amt ? "ok" : paid > 0 ? "warn" : "n" }; });
      const bal = rows.reduce((a, x) => a + x.amt - x.paid, 0), cs = cash(), max = Math.max(...cs.map((x) => Math.abs(x.c)));
      const L = { ok: "Pagada", warn: "Parcial", n: "Pendiente" };
      return `<h1>Dinero</h1><h2>Liquidación · Don Mario</h2>
      <div class="card"><table><tr><th>Entrega</th><th class="r">Monto</th><th class="r">Abonado</th><th>Estado</th></tr>
      ${rows.map((x) => `<tr><td>${x.d}</td><td class="r">${CRC(x.amt)}</td><td class="r">${CRC(x.paid)}</td><td><span class="chip ${x.st}">${ic(x.st === "ok" ? "check" : "clock")}${L[x.st]}</span></td></tr>`).join("")}</table>
      <div class="row sp" style="margin-top:.6rem"><b>Saldo</b><b class="big" style="font-size:1.3rem">${CRC(bal)}</b></div></div>
      <label class="f">Registrar pago (₡)<input type="number" inputmode="decimal" value="${S.pay}" data-k="pay"></label>
      <p class="mut">Los pagos se aplican a la entrega más antigua primero. Método: efectivo, SINPE o transferencia, con referencia (en el sistema real).</p>
      <h2>Caja proyectada · 8 semanas</h2><p class="mut">Entradas por cobrar menos pagos a productores. Saldo inicial ₡ 900 000,00.</p>
      ${cs.map((x) => `<div class="card"><div class="row sp"><b>Semana del ${x.w}</b><span class="chip ${x.c < 0 ? "bad" : "ok"}">${ic(x.c < 0 ? "warn" : "check")}${x.c < 0 ? "Faltarían " + CRC(-x.c) : "Saldo " + CRC(x.c)}</span></div>
      <div class="bar ${x.c < 0 ? "neg" : ""}" aria-hidden="true"><i style="width:${Math.round((Math.abs(x.c) / max) * 100)}%"></i></div><div class="mut">Entra ${CRC(x.i)} · Sale ${CRC(x.o)}</div></div>`).join("")}`;
    },
  };

  const TABS = [["hoy", "home", "Hoy"], ["envio", "truck", "Envío"], ["recepcion", "scale", "Recepción"], ["dinero", "coins", "Dinero"]];
  const view = $("#view"), toast = (t) => { const n = $("#toast"); n.textContent = t; n.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (n.hidden = true), 2600); };
  const render = () => {
    const a = document.activeElement, key = a && a.dataset && a.dataset.k, pos = a && a.selectionStart;
    view.innerHTML = V[S.v]();
    $("#tabs").innerHTML = TABS.map(([v, i, t]) => `<button data-v="${v}" ${v === S.v ? 'aria-current="page"' : ""}>${ic(i)}${t}</button>`).join("");
    if (key) { const n = view.querySelector(`[data-k="${key}"]`); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* number */ } } }
    $("#offline").hidden = !S.offline; $("#q").textContent = S.queue;
  };
  const queue = () => {
    render(); // mantiene la vista de fondo al día mientras la cola está abierta
    const sh = $("#sheet"), { by } = calc(), p = S.producers.find((x) => x.inc && by[x.id].kg > 0 && (x.st === "new" || x.st === "nc"));
    if (!p) { sh.hidden = true; toast("Todos respondieron"); return render(); }
    const kg = by[p.id].kg, left = S.producers.filter((x) => x.inc && by[x.id].kg > 0 && (x.st === "new" || x.st === "nc")).length;
    const msg = `Hola ${p.name}, para el envío del ${fdate(nextThu())} le pedimos ${kg} kg de mamón chino. ¿Nos confirma por favor?`;
    sh.hidden = false;
    sh.innerHTML = `<div class="row sp"><b>Siguiente: ${esc(p.name)} · ${esc(p.zone)}</b><button class="btn sm alt" data-a="close">Cerrar</button></div><p class="mut">Quedan ${left} por convocar. El mensaje no se envía solo: usted lo revisa y pulsa enviar en su WhatsApp.</p>
    <div class="rcpt">${esc(msg)}</div>
    <p><a class="btn" target="_blank" rel="noopener noreferrer" href="${waLink(p.phone, msg)}">${ic("chat")} Abrir WhatsApp</a> <a class="btn alt" href="tel:+506${p.phone}">${ic("phone")} Llamar</a></p>
    <p class="mut">¿Qué respondió?</p><div class="row">
    <button class="btn sm" data-a="resp" data-st="ok" data-id="${p.id}">${ic("check")} Confirmó</button>
    <button class="btn sm alt" data-a="resp" data-st="no" data-id="${p.id}">${ic("x")} No puede</button>
    <button class="btn sm alt" data-a="resp" data-st="nc" data-id="${p.id}">${ic("clock")} No contestó</button></div>`;
  };

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-v],[data-a],#field,#off"); if (!t) return;
    if (t.dataset.v) { S.v = t.dataset.v; $("#sheet").hidden = true; render(); window.scrollTo(0, 0); return; }
    if (t.id === "field") { const on = t.getAttribute("aria-pressed") !== "true"; t.setAttribute("aria-pressed", on); document.documentElement.dataset.field = on ? "1" : "0"; return; }
    if (t.id === "off") { S.offline = t.getAttribute("aria-pressed") !== "true"; t.setAttribute("aria-pressed", S.offline); if (!S.offline && S.queue) { toast(`Señal recuperada: ${S.queue} registro(s) sincronizados`); S.queue = 0; } return render(); }
    const a = t.dataset.a, id = t.dataset.id;
    if (a === "queue") return queue();
    if (a === "close") { $("#sheet").hidden = true; return render(); }
    if (a === "resp") {
      const p = S.producers.find((x) => x.id === id), before = calc().by[id].kg; p.st = t.dataset.st;
      if (p.st === "no") { p.inc = false; toast(`${p.name} no puede: se redistribuyeron ${before} kg entre los demás`); }
      return queue();
    }
    if (a === "why") { const w = t.dataset.w, i = S.rc.why.indexOf(w); i < 0 ? S.rc.why.push(w) : S.rc.why.splice(i, 1); return render(); }
    if (a === "save") { if (S.offline) { S.queue++; toast("Guardado en el teléfono; se enviará al volver la señal"); } else toast("Recepción guardada"); return render(); }
    if (a === "rcpt") { S.rc.rcpt = true; return render(); }
  });
  document.addEventListener("change", (e) => {
    const t = e.target, a = t.dataset.a, id = t.dataset.id;
    if (a === "ord") S.orders.find((o) => o.id === id).on = t.checked;
    else if (a === "inc") S.producers.find((p) => p.id === id).inc = t.checked;
    else if (a === "eq") S.equity = t.checked;
    else return; render();
  });
  document.addEventListener("input", (e) => {
    const k = e.target.dataset && e.target.dataset.k; if (!k) return; const v = e.target.value;
    if (k === "buffer") S.buffer = Math.max(0, Math.min(30, +v || 0));
    else if (k.startsWith("cap:")) S.producers.find((p) => p.id === k.slice(4)).cap = v === "" ? null : Math.max(0, +v);
    else if (k === "pay") S.pay = Math.max(0, +v || 0);
    else if (k === "rc.p") S.rc.p = v;
    else if (k.startsWith("rc.")) S.rc[k.slice(3)] = Math.max(0, +v || 0);
    render();
  });
  render();
})();
