/* Cosecha · módulo Mercado (ruta de arranque, seguimiento de compradores, contacto con guardas, kit). No envía nada. Datos FICTICIOS. Lo monta core.js. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const I = {
    flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>', cols: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    check: '<path d="M5 12l5 5L20 7"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  };
  const ic = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;

  // ── Conocimiento de la asociación (editable en el producto real) ──
  const P = { A: "A · Ordenar la casa", B: "B · Primeros compradores", C: "C · Cumplir y estabilizar", D: "D · Escalar a lo nacional", E: "E · Exportar con socio" };
  const TASKS = [
    ["a1", "A", "Definir producto y formatos de empaque", "Sin una ficha clara cada comprador recibe una historia distinta.", "Variedad, calibres, empaques (caja, malla), pedido mínimo y vida útil."],
    ["a2", "A", "Registrar productores y semanas de cosecha", "Solo se puede prometer lo que se sabe que existe.", "Capacidad por productor y semana de inicio, pico y fin."],
    ["a3", "A", "Calcular el costo por kg y el precio mínimo", "Vender bien y perder plata es la forma más común de quebrar.", "Pago al productor, empaque, flete, frío, merma y margen objetivo."],
    ["a4", "A", "Reunir documentos base de la asociación", "Todo comprador formal los pide. (Verificar con SFE qué registros exige cada mercado.)", "Personería, inscripción tributaria y registros de finca/acopio.", "constancia"],
    ["a5", "A", "Fotos y video estándar de la fruta", "Un comprador lejano decide por lo que ve.", "Fruta entera y abierta, con regla de tamaño, luz natural, fondo neutro."],
    ["a6", "A", "Publicar el kit comercial", "Es el vendedor que trabaja de noche y atrae solicitudes entrantes.", "Pestaña «Kit»: ficha, disponibilidad y formulario.", "ficha"],
    ["b1", "B", "Lista de 30 prospectos cercanos", "Los primeros clientes casi siempre están a menos de 3 horas.", "Fuentes guiadas: ferias, fruterías, hoteles, restaurantes, heladerías."],
    ["b2", "B", "Llamadas con guion", "Una llamada de 3 minutos vale más que 20 correos fríos.", "Guion: quién somos, qué ofrecemos, cuándo hay fruta, ¿le envío muestra?"],
    ["b3", "B", "Enviar muestras", "Quien prueba compra; quien lee, no.", "Registre kg, guía y fecha; pida opinión a los 3 días."],
    ["b4", "B", "Cerrar un primer pedido pequeño", "El primer pedido prueba toda la cadena con poco riesgo.", "Pago contra entrega o prepago."],
    ["b5", "B", "Pedir retroalimentación", "Es la información de mercado más barata.", "Tres preguntas: calidad, precio, puntualidad."],
    ["c1", "C", "Planificar con modelo pull", "No se pide fruta sin demanda confirmada: sin frío se oscurece en 3–4 días.", "Pedido confirmado → reparto → convocatoria."],
    ["c2", "C", "Recibir con lote y reloj de frescura", "Permite explicar y prevenir pérdidas.", "Hora de cosecha, peso, rechazo con foto."],
    ["c3", "C", "Pagar a los productores a tiempo", "La confianza de la asociación depende de esto.", "Recibo por entrega y estado de cuenta por WhatsApp."],
    ["d1", "D", "Preparar ficha de proveedor", "Mayoristas y supermercados la exigen.", "Datos legales, contactos, calidad, calendario."],
    ["d2", "D", "Resolver la facturación electrónica con el contador", "Sin factura formal no hay ventas nacionales formales. (Verificar obligaciones con el contador.)", "Proveedor autorizado y flujo de cobro.", "factura"],
    ["e1", "E", "Elegir un socio exportador o consolidador", "Exportar con socio evita asumir todos los registros y el riesgo a la vez.", "Compare 2–3 con referencias."],
    ["e2", "E", "Verificar la admisibilidad vigente del destino", "Cada país aprueba por producto y origen; no se asume. (Consultar SFE/PROCOMER.)", "Confirmar por escrito antes de enviar muestras.", "admisibilidad"],
    ["e3", "E", "Registros y certificado fitosanitario", "Es el pasaporte de la fruta.", "Trámites ante el SFE con el socio.", "fito"],
  ].map(([id, p, t, why, how, gives]) => ({ id, p, t, why, how, gives, done: false }));
  const NAMES = ["Cercano directo", "Nacional formal", "Regional", "Exportación con socio", "Exportación directa"];
  const STAGES = [["new", "Nuevo"], ["contacted", "Contactado"], ["replied", "Respondió"], ["sample", "Muestra"], ["quote", "Cotizado"], ["client", "Cliente"]];
  const NEXT = { new: "Investigar y elegir un canal permitido", contacted: "Seguimiento en el día 4 con el calendario de oferta", replied: "Ofrecer muestra y enviar el kit comercial", sample: "Pedir retroalimentación a los 3 días de recibida", quote: "Resolver dudas de precio y condiciones de pago", client: "Planificar el primer pedido en Envíos" };
  const TYPE_W = { importador: 30, exportador: 30, mayorista: 26, supermercado: 24, procesador: 22, hotel: 18, restaurante: 16, fruteria: 16, feria: 14 };
  const SEASON = [7, 8, 9, 10, 11];
  const L = (id, org, type, country, kg, win, reqs, chan, sig, stage, src, basis) => ({ id, org, type, country, kg, win, reqs, chan, sig, stage, src, basis, domain: org.toLowerCase().replace(/[^a-z]/g, "") + ".test" });
  const S = {
    v: "ruta", csv: "organizacion,correo,pais,tipo\nFrutas del Mundo (ej.),compras@frutasdelmundo.test,US,importador\nFrutas del Mundo (ej.),info@frutasdelmundo.test,US,importador\nVerduras Sol (ej.),juan.perez@gmail.com,CR,fruteria\nMercado Sur (ej.),sin-arroba.test,CR,mayorista", imp: null, lang: "es", sent: false,
    leads: [
      L(1, "Frutería La Esquina (ej.)", "fruteria", "CR", 80, [7, 8, 9, 10], [], "phone", "", "new", "Recomendación", "Interés legítimo / llamada"),
      L(2, "Hotel Playa Ejemplo", "hotel", "CR", 60, [7, 8, 9, 10, 11], ["factura"], "phone", "replied", "client", "Visita directa", "Relación comercial"),
      L(3, "Mayorista Central (ej.)", "mayorista", "CR", 800, [7, 8, 9, 10, 11], ["factura", "ficha", "constancia"], "email", "replied", "quote", "Feria local", "Solicitud del interesado"),
      L(4, "Importadora Atlántico (ej.)", "importador", "ES", 1500, [8, 9, 10], ["fito", "admisibilidad"], "email", "", "contacted", "Directorio sectorial", "Interés legítimo (correo de rol)"),
      L(5, "Exotic Fruits Co. (ej.)", "importador", "US", 1200, [7, 8, 9, 10, 11], ["fito", "admisibilidad"], "email", "", "new", "Lista de expositores", "CAN-SPAM (B2B)"),
      L(6, "Nordic Fresh Imports (ej.)", "importador", "CA", 600, [8, 9, 10], ["fito"], "blocked", "", "new", "Directorio sectorial", "Sin consentimiento (CASL)"),
      L(7, "Heladería Tropical (ej.)", "procesador", "CR", 150, [7, 8, 9, 10, 11], [], "phone", "kit", "sample", "Kit comercial", "Solicitud del interesado"),
      L(8, "Restaurante Mar y Tierra (ej.)", "restaurante", "CR", 40, [7, 8, 9, 10], [], "phone", "replied", "replied", "Llamada", "Interés legítimo / llamada"),
    ],
    g: { country: "US", chan: "email", cold: true, mail: "rol", spf: false, dkim: false, dmarc: false, n: 120, bounce: 1.2, spam: 0.1 },
    fc: [["3 nov", 0], ["10 nov", 0], ["17 nov", 0], ["24 nov", 0], ["1 dic", 0], ["8 dic", 0]],
  };
  const done = (p) => TASKS.filter((t) => t.p === p).every((t) => t.done);
  const have = () => new Set(TASKS.filter((t) => t.done && t.gives).map((t) => t.gives));
  const rung = () => { let n = 0; for (const k of Object.keys(P)) { if (done(k)) n++; else break; } return n === 0 ? -1 : [0, 0, 1, 2, 3][n - 1]; };

  // Puntuación de encaje 0–100, explicable (MERCADO §6.3)
  const fit = (l) => {
    const h = have(), ov = l.win.filter((m) => SEASON.includes(m)).length, ok = l.reqs.filter((r) => h.has(r)).length;
    const parts = [
      ["Tipo de comprador", 30, TYPE_W[l.type] || 10], ["Volumen que podemos atender", 20, l.kg < 50 ? 4 : l.kg <= 1500 ? 20 : 12], ["Ventana de temporada", 15, Math.round((15 * ov) / 5)],
      ["Requisitos que ya cumplimos", 15, l.reqs.length ? Math.round((15 * ok) / l.reqs.length) : 15], ["Canal permitido", 10, { email: 10, phone: 10, wa: 8, blocked: 3 }[l.chan] ?? 0], ["Señales de interés", 10, { replied: 10, kit: 6 }[l.sig] || 0],
    ];
    return { total: parts.reduce((a, p) => a + p[2], 0), parts, missing: l.reqs.filter((r) => !h.has(r)) };
  };

  // Guardas de cumplimiento (MERCADO §7.3): bloquean el envío si no se cumplen
  const guards = (g) => {
    const out = [], add = (lv, t) => out.push([lv, t]);
    if (g.chan === "whatsapp") g.cold ? add("block", "WhatsApp en frío no está permitido: exige consentimiento previo y plantillas aprobadas; el número puede ser bloqueado (y es el de los productores).") : add("ok", "WhatsApp permitido: contacto con consentimiento o que ya respondió (1 toque o plantilla aprobada).");
    if (g.chan === "llamada") add("ok", "Llamada asistida: la app crea la tarea con guion y registra el resultado.");
    if (g.chan === "email") {
      if (g.country === "CA" && g.cold) add("block", "Canadá (CASL): requiere consentimiento expreso o tácito. Registre la base antes de enviar.");
      if (g.country === "ES" && g.mail === "personal") add("block", "UE/Reino Unido: solo correos de rol profesional. Descarte este contacto.");
      else if (g.mail === "personal") add("warn", "Correo personal: prefiera uno de rol profesional (compras@, ventas@).");
      if (g.country === "ES" && g.mail === "rol") add("warn", "UE/RU: requiere interés legítimo documentado. El texto va incluido en el pie del correo.");
      if (g.country === "US") add("warn", "EE. UU. (CAN-SPAM): identidad real, dirección física y baja efectiva. Ya incluidos en el pie.");
      if (g.country === "CR") add("warn", "Costa Rica: respetar la protección de datos personales (verificar con asesoría).");
      if (!(g.spf && g.dkim && g.dmarc)) add("block", "Dominio sin autenticar: active SPF, DKIM y DMARC antes de enviar (los buzones rechazan o mandan a spam).");
      if (g.bounce > 2) add("block", "Pausa automática: rebotes sobre 2 %. Depure la lista.");
      if (g.spam > 0.3) add("block", "Pausa automática: quejas sobre 0,3 %. Revise el mensaje y a quién se envía.");
    }
    return { list: out, can: !out.some((x) => x[0] === "block") };
  };
  const ramp = (n) => { const r = [10, 20, 30, 40], a = []; let left = n, d = 0; while (left > 0) { const s = Math.min(r[Math.min(d, 3)], left); a.push(s); left -= s; d++; } return a; };

  const T = {
    es: { h: "Mamón chino de Costa Rica", sub: "Asociación de pequeños productores (ejemplo)", avail: "Disponibilidad semanal estimada", min: "Pedido mínimo", minv: "50 kg", pack: "Empaque", packv: "Cajas de 2 kg · malla 500 g", docs: "Documentos vigentes", form: "Pedir muestra o cotización", name: "Nombre", org: "Organización", mail: "Correo", ok: "Acepto que me contacten por esta solicitud.", send: "Enviar solicitud", thanks: "Gracias. Su solicitud llegó al equipo." },
    en: { h: "Costa Rican rambutan (mamón chino)", sub: "Small producers' association (example)", avail: "Estimated weekly availability", min: "Minimum order", minv: "50 kg", pack: "Packaging", packv: "2 kg boxes · 500 g mesh", docs: "Current documents", form: "Request a sample or quote", name: "Name", org: "Company", mail: "Email", ok: "I agree to be contacted about this request.", send: "Send request", thanks: "Thank you. Your request reached the team." },
  };

  const V = {
    ruta() {
      const r = rung();
      return `<h1>Ruta de arranque</h1><p class="mut">Conocimiento de mercado convertido en pasos. Marque lo que ya hizo: los requisitos cumplidos suben el encaje de los prospectos.</p>
      <h2>Peldaño recomendado ahora</h2><div class="ladder">${NAMES.map((n, i) => `<div class="rung ${i === r ? "on" : ""}"><b>${i}</b><span>${n}${i === r ? " · <b>aquí</b>" : ""}</span></div>`).join("")}</div>
      ${r < 0 ? `<p><span class="chip warn">${ic("clock")}Termine la fase A para empezar</span></p>` : ""}
      ${Object.entries(P).map(([k, name]) => { const ts = TASKS.filter((t) => t.p === k), d = ts.filter((t) => t.done).length;
        return `<h2>${name} <span class="mut">(${d}/${ts.length})</span></h2><div class="bar" aria-hidden="true"><i style="width:${(d / ts.length) * 100}%"></i></div>
        ${ts.map((t) => `<details class="t ${t.done ? "done" : ""}"><summary><input type="checkbox" data-a="task" data-id="${t.id}" ${t.done ? "checked" : ""} style="width:1.3rem;height:1.3rem" aria-label="Hecho"><span class="tx">${esc(t.t)}</span></summary>
        <p><b>Por qué importa:</b> ${esc(t.why)}</p><p><b>Cómo se hace:</b> ${esc(t.how)}</p></details>`).join("")}`; }).join("")}`;
    },
    pipeline() {
      const im = S.imp;
      return `<h1>Pipeline de compradores</h1>
      <details class="t"><summary>${ic("mail")}<span class="tx">Importar lista (CSV pegado)</span></summary>
        <p class="mut" style="margin-left:0">Deduplica por organización y dominio, valida el correo y marca los de rol vs. personales.</p>
        <textarea data-k="csv" aria-label="CSV">${esc(S.csv)}</textarea><p><button class="btn sm" data-a="imp">Importar</button></p>
        ${im ? `<div class="mut">${im.rows.map((r) => `<div class="row"><span class="chip ${r.cls}">${r.txt}</span> ${esc(r.org)} <span>${esc(r.mail)}</span></div>`).join("")}</div>` : ""}</details>
      <div class="cols">${STAGES.map(([k, n]) => { const ls = S.leads.filter((l) => l.stage === k);
        return `<div class="col"><h3><span>${n}</span><span>${ls.length}</span></h3>${ls.map((l) => { const f = fit(l);
          return `<button class="lead" data-a="lead" data-id="${l.id}"><b>${esc(l.org)}</b><span class="mut">${l.country} · ${l.type} · ${l.kg} kg/mes</span><span class="score">Encaje ${f.total}/100</span>${l.chan === "blocked" ? `<span class="chip bad">${ic("warn")}Sin base legal</span>` : ""}</button>`; }).join("") || '<span class="mut">—</span>'}</div>`; }).join("")}</div>`;
    },
    secuencia() {
      const g = S.g, gr = guards(g), en = !["CR", "ES"].includes(g.country), pl = ramp(g.n);
      const foot = `Asociación de productores (ejemplo) · [Dirección física completa] · Para no recibir más correos: {{enlace de baja en un clic}}${g.country === "ES" ? "\nLe contactamos por interés legítimo: su empresa importa fruta tropical y este es su correo profesional publicado." : ""}`;
      const body = en ? `Subject: Costa Rican rambutan for {{company}}: sheet and sample\n\nHello {{name}},\n\nWe are a small producers' association in Costa Rica. Our rambutan (mamón chino) is harvested from July to early November. Here is our one-page sheet and weekly availability: {{kit link}}\n\nIf useful, we can send a sample. Would a short call help?\n\nBest regards,\n{{sender}}` : `Asunto: Mamón chino de Costa Rica para {{organización}}: ficha y muestra\n\nHola {{nombre}},\n\nSomos una asociación de pequeños productores. Nuestro mamón chino se cosecha de julio a inicios de noviembre. Le comparto la ficha de una página y la disponibilidad semanal: {{enlace al kit}}\n\nSi le sirve, le enviamos una muestra. ¿Coordinamos una llamada corta?\n\nSaludos,\n{{remitente}}`;
      const sel = (k, opts) => `<select data-g="${k}">${opts.map(([v, t]) => `<option value="${v}" ${String(g[k]) === v ? "selected" : ""}>${t}</option>`).join("")}</select>`;
      return `<h1>Secuencia de contacto</h1><p class="mut">Las guardas <b>bloquean</b> el envío si no se cumplen. La app prepara; la persona aprueba.</p>
      <div class="grid2"><label class="f">País del prospecto${sel("country", [["CR", "Costa Rica"], ["US", "Estados Unidos"], ["CA", "Canadá"], ["ES", "España / UE"]])}</label>
      <label class="f">Canal${sel("chan", [["email", "Correo B2B"], ["whatsapp", "WhatsApp"], ["llamada", "Llamada"]])}</label>
      <label class="f">Relación${sel("cold", [["true", "Sin relación previa (frío)"], ["false", "Ya respondió / dio consentimiento"]])}</label>
      <label class="f">Tipo de correo${sel("mail", [["rol", "De rol profesional (compras@)"], ["personal", "Personal / gratuito"]])}</label></div>
      <h2>Autenticación del dominio</h2><div class="row">${["spf", "dkim", "dmarc"].map((k) => `<label class="row"><input type="checkbox" data-g="${k}" ${g[k] ? "checked" : ""} style="width:1.3rem;height:1.3rem"> ${k.toUpperCase()}</label>`).join("")}
      <label class="f">Rebotes %<input type="number" step="0.1" data-g="bounce" value="${g.bounce}"></label><label class="f">Quejas %<input type="number" step="0.1" data-g="spam" value="${g.spam}"></label></div>
      <h2>Resultado de las guardas</h2>${gr.list.map(([lv, t]) => `<div class="guard ${lv}">${ic(lv === "ok" ? "check" : lv === "warn" ? "warn" : "x")}<span>${t}</span></div>`).join("")}
      <div class="sum ${gr.can ? "" : "bad"}" style="position:static" role="status"><span>${gr.can ? "Envío habilitado (con aprobación)" : "Envío BLOQUEADO"}</span><button class="btn sm ${gr.can ? "" : "alt"}" data-a="send" ${gr.can ? "" : "disabled"}>Simular programación</button></div>
      ${S.sent ? `<div class="card"><b>Calentamiento del buzón:</b> ${pl.join(" · ")} envíos por día hábil → ${pl.length} días para ${g.n} contactos. El cierre de la secuencia (día 16) llega unos ${pl.length + 15} días después de empezar. Se detiene sola si hay respuesta, rebote, baja o queja.</div>` : ""}
      <label class="f" style="margin-top:.6rem">Contactos en la lista<input type="number" data-g="n" value="${g.n}"></label>
      <h2>Vista previa (${en ? "EN" : "ES"})</h2><div class="email">${esc(body)}<small>${esc(foot)}</small></div>
      <p class="mut">Pasos: día 0 presentación · día 4 calendario de oferta · día 9 oferta de muestra · día 16 cierre cortés. Cabecera de baja en un clic y lista de supresión global incluidas.</p>`;
    },
    kit() {
      const t = T[S.lang], max = 800;
      return `<h1>Kit comercial público</h1><div class="seg"><button class="btn sm ${S.lang === "es" ? "" : "alt"}" data-a="lang" data-l="es">ES</button><button class="btn sm ${S.lang === "en" ? "" : "alt"}" data-a="lang" data-l="en">EN</button></div>
      <div class="phone" style="margin-top:.8rem"><div class="row"><span class="dot" aria-hidden="true"></span><b>${t.h}</b></div><div class="mut">${t.sub}</div>
        <h2>${t.avail}</h2>${[["3 nov", 240], ["10 nov", 120], ["17 nov", 0], ["24 nov", 0], ["1 dic", 0], ["8 dic", 0]].map(([w, kg]) => `<div class="wk"><span>${w}</span><div class="bar" aria-hidden="true"><i style="width:${(kg / max) * 100}%"></i></div><b>~${Math.round(kg * 0.8 / 10) * 10} kg</b></div>`).join("")}
        <p class="mut">Oferta prometible = estimación × 0,8. Nunca muestra nombres de productores.</p>
        <div class="row sp"><span>${t.min}</span><b>${t.minv}</b></div><div class="row sp"><span>${t.pack}</span><b>${t.packv}</b></div>
        <h2>${t.docs}</h2><div class="row">${have().has("ficha") ? `<span class="chip ok">${ic("check")}Ficha</span>` : `<span class="chip warn">${ic("clock")}Ficha pendiente (Ruta · A6)</span>`}${have().has("fito") ? `<span class="chip ok">${ic("check")}Fitosanitario</span>` : `<span class="chip n">Fitosanitario: por verificar</span>`}</div>
        <h2>${t.form}</h2>${S.sent2 ? `<div class="chip ok">${ic("check")}${t.thanks}</div>` : `<label class="f">${t.name}<input type="text" data-f="name"></label><label class="f">${t.org}<input type="text" data-f="org"></label><label class="f">${t.mail}<input type="text" data-f="mail"></label>
        <label class="row" style="margin:.5rem 0"><input type="checkbox" data-f="ok" style="width:1.3rem;height:1.3rem"> <span>${t.ok}</span></label><button class="btn" data-a="req">${t.send}</button>`}</div>
      <p class="mut">Al enviar, se crea un prospecto entrante en «Pipeline» con base legal «solicitud del interesado».</p>`;
    },
  };

  const TABS = [["ruta", "flag", "Ruta"], ["pipeline", "cols", "Pipeline"], ["secuencia", "mail", "Secuencia"], ["kit", "globe", "Kit"]];
  const toast = (t) => window.Cosecha.toast(t);
  const render = () => window.Cosecha.render();
  const sheet = (l) => {
    const f = fit(l), nx = STAGES[Math.min(STAGES.findIndex((s) => s[0] === l.stage) + 1, STAGES.length - 1)], sh = $("#sheet");
    sh.hidden = false;
    sh.innerHTML = `<div class="row sp"><b>${esc(l.org)}</b><button class="btn sm alt" data-a="close">Cerrar</button></div><div class="mut">${l.country} · ${l.type} · fuente: ${esc(l.src)}</div>
    <div class="big">${f.total}<span class="mut" style="font-size:1rem">/100 de encaje</span></div>
    ${f.parts.map(([n, max, v]) => `<div class="wk" style="grid-template-columns:1fr 6rem 3rem"><span>${n}</span><div class="bar" aria-hidden="true"><i style="width:${(v / max) * 100}%"></i></div><b>${v}/${max}</b></div>`).join("")}
    ${f.missing.length ? `<p class="chip warn">${ic("warn")}Faltan requisitos: ${f.missing.join(", ")} (complételos en la Ruta)</p>` : ""}
    <p><b>Base legal:</b> ${esc(l.basis)}<br><b>Siguiente acción:</b> ${NEXT[l.stage]}</p>
    ${l.stage !== "client" ? `<button class="btn" data-a="mv" data-id="${l.id}">Mover a «${nx[1]}»</button>` : ""}`;
  };

  const onClick = (e) => {
    const t = e.target.closest("[data-v],[data-a]"); if (!t) return;
    if (t.dataset.v) { S.v = t.dataset.v; $("#sheet").hidden = true; render(); window.scrollTo(0, 0); return; }
    const a = t.dataset.a, id = +t.dataset.id;
    if (a === "lead") return sheet(S.leads.find((l) => l.id === id));
    if (a === "close") { $("#sheet").hidden = true; return; }
    if (a === "mv") { const l = S.leads.find((x) => x.id === id), i = STAGES.findIndex((s) => s[0] === l.stage); l.stage = STAGES[Math.min(i + 1, STAGES.length - 1)][0]; render(); return sheet(l); }
    if (a === "send") { S.sent = true; return render(); }
    if (a === "lang") { S.lang = t.dataset.l; return render(); }
    if (a === "imp") {
      const lines = S.csv.split(/\n/).map((s) => s.trim()).filter(Boolean).slice(1), seen = new Set(S.leads.map((l) => l.domain + "|" + l.org.toLowerCase())), rows = [];
      for (const ln of lines) {
        const [org = "", mail = "", pais = "CR", tipo = "fruteria"] = ln.split(",").map((s) => s.trim()), dom = (mail.split("@")[1] || "").toLowerCase(), key = dom + "|" + org.toLowerCase();
        const free = /^(gmail|hotmail|yahoo|outlook)\./.test(dom), role = /^(info|ventas|compras|contacto|sales|purchasing)@/i.test(mail);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) rows.push({ org, mail, cls: "bad", txt: "Correo inválido" });
        else if (seen.has(key)) rows.push({ org, mail, cls: "n", txt: "Duplicado" });
        else { seen.add(key); S.leads.push({ ...L(100 + S.leads.length, org, tipo, pais, 200, [7, 8, 9, 10, 11], pais === "CR" ? [] : ["fito", "admisibilidad"], free && pais === "ES" ? "blocked" : "email", "", "new", "Importación CSV", role ? "Correo de rol · interés legítimo" : "Correo personal: revisar base legal"), domain: dom }); rows.push({ org, mail, cls: free ? "warn" : "ok", txt: free ? "Nuevo · personal" : role ? "Nuevo · de rol" : "Nuevo" }); }
      }
      S.imp = { rows }; toast(`${rows.filter((r) => r.txt.startsWith("Nuevo")).length} nuevos · ${rows.filter((r) => r.txt === "Duplicado").length} duplicado(s) · ${rows.filter((r) => r.cls === "bad").length} inválido(s)`); return render();
    }
    if (a === "req") {
      const q = (k) => view.querySelector(`[data-f="${k}"]`), org = q("org").value.trim(), mail = q("mail").value.trim();
      if (!org || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail) || !q("ok").checked) return toast("Complete organización, un correo válido y acepte el contacto");
      S.leads.push({ ...L(200 + S.leads.length, org, "importador", "US", 300, [7, 8, 9, 10, 11], ["fito", "admisibilidad"], "email", "kit", "new", "Kit comercial (entrante)", "Solicitud del interesado"), domain: mail.split("@")[1] });
      S.sent2 = true; toast("Prospecto entrante creado en Pipeline"); return render();
    }
  };
  const onChange = (e) => {
    const t = e.target;
    if (t.dataset.a === "task") { TASKS.find((x) => x.id === t.dataset.id).done = t.checked; return render(); }
    if (t.dataset.g) { const k = t.dataset.g; S.g[k] = t.type === "checkbox" ? t.checked : k === "cold" ? t.value === "true" : ["n", "bounce", "spam"].includes(k) ? +t.value || 0 : t.value; S.sent = false; render(); }
  };
  const onInput = (e) => { const t = e.target; if (t.dataset.k === "csv") S.csv = t.value; if (t.dataset.g && t.type === "number") { S.g[t.dataset.g] = +t.value || 0; S.sent = false; render(); } };
  window.CosechaMarket = { V, S, sheet, onClick, onChange, onInput, TASKS, fit, have, rung, STAGES };
})();
