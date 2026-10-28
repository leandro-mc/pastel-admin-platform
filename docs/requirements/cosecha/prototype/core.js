/* Cosecha (prototipo) · shell: roles, módulos, navegación de escritorio y móvil, modo campo, sin conexión.
   Los módulos (ops.js, money.js, people.js, market.js) se registran en window.Cosecha.views / handlers. Datos FICTICIOS. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const I = {
    home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>', cols: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/>',
    truck: '<path d="M2 6h11v10H2zM13 9h4l4 4v3h-8"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>', scale: '<path d="M4 20h16M12 4v16M5 8h14M5 8l-3 7a3 3 0 0 0 6 0zM19 8l-3 7a3 3 0 0 0 6 0z"/>',
    route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7"/>', flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',
    coins: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.700 3.600 3 8 3s8-1.300 8-3V6M4 12v6c0 1.700 3.600 3 8 3s8-1.300 8-3v-6"/>', users: '<circle cx="9" cy="8" r="3.500"/><path d="M2 20c0-3.500 3-6 7-6s7 2.500 7 6M16 5a3.500 3.500 0 0 1 0 7M18 14c2.500.5 4 2.500 4 6"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6z"/><path d="M8.500 12l2.500 2.500 4.500-5"/>', store: '<path d="M4 9l1-5h14l1 5M4 9v11h16V9M4 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 4 0M9 20v-6h6v6"/>',
    map: '<path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14"/>', chat: '<path d="M21 12a8 8 0 0 1-11.600 7.100L4 20l1-4.600A8 8 0 1 1 21 12z"/>', check: '<path d="M5 12l5 5L20 7"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', phone: '<path d="M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>', cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.500"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', more: '<circle cx="5" cy="12" r="1.600"/><circle cx="12" cy="12" r="1.600"/><circle cx="19" cy="12" r="1.600"/>', plus: '<path d="M12 5v14M5 12h14"/>', snow: '<path d="M12 3v18M4 7.500l16 9M4 16.500l16-9"/>',
  };
  const ic = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${I[n] || I.more}</svg>`;
  const CRC = (n) => "₡ " + Math.round(n).toLocaleString("es-CR").replace(/\u00a0/g, " ");
  const KG = (n) => n.toLocaleString("es-CR", { maximumFractionDigits: 1 }) + " kg";
  const nextThu = () => { const d = new Date(); d.setDate(d.getDate() + ((4 - d.getDay() + 7) % 7 || 7)); return d; };
  const fdate = (d) => d.toLocaleDateString("es-CR", { weekday: "short", day: "numeric", month: "short" }).replace(",", "").replace(/\.$/, "");
  const chip = (cls, icon, t) => `<span class="chip ${cls}">${ic(icon)}${esc(t)}</span>`;

  // ── Roles y permisos por módulo (mínimo privilegio) ──
  const ROLES = [
    { id: "owner", short: "Propietario", label: "Propietario / superusuario", desc: "Ve y decide todo; concede y retira accesos; sus acciones también se auditan." },
    { id: "gestor", short: "Gestor", label: "Gestor operativo", desc: "Planifica envíos, convoca, recibe, paga y atiende reclamos. No administra accesos." },
    { id: "comercial", short: "Comercial", label: "Comercial (prospección)", desc: "Busca y atiende compradores. No ve pagos a productores ni precios internos." },
    { id: "acopio", short: "Acopio", label: "Acopio (recepción en finca o bodega)", desc: "Solo recibe fruta: kilos, rechazos y fotos. No ve precios ni montos. Funciona sin señal." },
    { id: "transportista", short: "Transportista", label: "Transportista", desc: "Solo su ruta: paradas, ventanas, prueba de entrega y su pago. Nada más." },
    { id: "contabilidad", short: "Contabilidad", label: "Contabilidad (lectura)", desc: "Ve pagos, cobros y exportes. No modifica operación ni accede a prospectos." },
    { id: "comprador", short: "Comprador", label: "Comprador (portal)", desc: "Sus pedidos, la oferta semanal prometible, la ficha de calidad y reclamos con ventana." },
    { id: "enlace", short: "Enlace de zona", label: "Enlace de zona (productor de confianza)", desc: "Ayuda a avisar a productores de su zona sin WhatsApp. Ve fechas y cantidades, no montos." },
    { id: "productor", short: "Productor", label: "Productor (lo que recibe por WhatsApp)", desc: "No usa la app: recibe mensajes cortos, recibos y estado de cuenta. Se muestra su chat." },
  ];
  const ALL = ["owner", "gestor", "comercial", "acopio", "transportista", "contabilidad"];
  const MODS = [
    { id: "hoy", t: "Hoy", i: "home", roles: ALL.concat(["enlace"]) },
    { id: "mercado", t: "Mercado", i: "cols", roles: ["owner", "gestor", "comercial"] },
    { id: "envios", t: "Envíos", i: "truck", roles: ["owner", "gestor"] },
    { id: "recepcion", t: "Recepción", i: "scale", roles: ["owner", "gestor", "acopio"] },
    { id: "entregas", t: "Entregas", i: "route", roles: ["owner", "gestor", "transportista"] },
    { id: "reclamos", t: "Reclamos", i: "flag", roles: ["owner", "gestor", "comercial"] },
    { id: "dinero", t: "Dinero", i: "coins", roles: ["owner", "gestor", "contabilidad"] },
    { id: "productores", t: "Productores", i: "users", roles: ["owner", "gestor"] },
    { id: "equipo", t: "Equipo y permisos", i: "shield", roles: ["owner"] },
    { id: "zona", t: "Mi zona", i: "map", roles: ["enlace"] },
    { id: "portal", t: "Mi portal", i: "store", roles: ["comprador"] },
    { id: "chat", t: "WhatsApp", i: "chat", roles: ["productor"] },
  ];
  const D = window.COSECHA_DATA;
  const C = { role: "owner", mod: "hoy", offline: false, field: false, queue: 0, listeners: [] };
  const Cosecha = { views: {}, handlers: [], $, $$, esc, ic, CRC, KG, chip, nextThu, fdate, D, C, ROLES, MODS, can: (m) => MODS.find((x) => x.id === m).roles.includes(C.role) };
  const roleInfo = () => ROLES.find((r) => r.id === C.role);
  const nameOf = (m) => (m.id === "entregas" && C.role === "transportista" ? "Mi ruta" : m.id === "recepcion" && C.role === "acopio" ? "Recibir fruta" : m.t);
  const TITLES = { hoy: "Hoy" };

  Cosecha.toast = (t) => { const n = $("#toast"); n.textContent = t; n.hidden = false; clearTimeout(Cosecha.toast.t); Cosecha.toast.t = setTimeout(() => (n.hidden = true), 3000); };
  Cosecha.go = (m, sub) => { C.mod = m; if (sub) C.sub = sub; $("#sheet").hidden = true; render(); window.scrollTo(0, 0); };
  const phase = () => { const m = new Date().getMonth() + 1; return m <= 6 ? ["Pre-temporada", "Hora de conseguir compradores para julio–noviembre"] : m <= 9 ? ["Temporada", "Puntualidad y calidad construyen reputación"] : m === 10 ? ["Final de temporada", "Liquide y anote lo aprendido"] : ["Cierre de temporada", "Liquidaciones, balance y prospección del próximo año"]; };
  Cosecha.phase = phase;

  function render() {
    const mods = MODS.filter((m) => m.roles.includes(C.role));
    if (!mods.find((m) => m.id === C.mod)) C.mod = mods[0].id;
    const r = roleInfo(), chrome = C.role !== "productor", a = document.activeElement, fkey = a && a.dataset && a.dataset.f, pos = a && a.selectionStart;
    document.body.classList.toggle("nochrome", !chrome); document.body.classList.toggle("field", C.field);
    const mod = MODS.find((m) => m.id === C.mod), body = (Cosecha.views[C.mod] || (() => "<p>Módulo no disponible.</p>"))();
    $("#side").innerHTML = chrome ? `<div class="brand"><span class="mark" aria-hidden="true"></span><b>Cosecha</b></div><div class="org">${esc(D.org)}</div><nav aria-label="Módulos">${mods.map((m) => `<button data-nav="${m.id}" ${m.id === C.mod ? 'aria-current="page"' : ""}>${ic(m.i)}<span>${esc(nameOf(m))}</span></button>`).join("")}</nav>
      <div class="who"><span class="av" aria-hidden="true">${esc(r.short[0])}</span><span><b>${esc(r.short)}</b><br><span class="mut">${esc(r.label.length > 34 ? "" : r.label)}</span></span></div>` : "";
    $("#top").innerHTML = chrome ? `<h1 class="ttl">${esc(nameOf(mod))}</h1><span class="pill" title="${esc(phase()[1])}">${esc(phase()[0])}</span><span class="grow"></span>
      <button class="tg" id="offbtn" aria-pressed="${C.offline}" title="Simula falta de señal en la finca">${ic("snow")}Sin conexión</button><button class="tg" id="fieldbtn" aria-pressed="${C.field}" title="Texto grande y alto contraste para trabajar a pleno sol">Modo campo</button><button class="tg" id="themebtn">Tema</button>` : "";
    $("#offline").hidden = !(chrome && C.offline); $("#offline").innerHTML = `${ic("warn")} Sin conexión: todo se guarda en el teléfono y se envía al volver la señal. Pendientes: <b>${C.queue}</b>`;
    $("#view").innerHTML = `<div class="page${["mercado", "envios", "dinero", "productores", "equipo"].includes(C.mod) ? " wide" : ""}">${body}</div>`;
    const tabs = mods.slice(0, mods.length > 5 ? 4 : 5), more = mods.length > 5;
    $("#tabs").innerHTML = chrome ? tabs.map((m) => `<button data-nav="${m.id}" ${m.id === C.mod ? 'aria-current="page"' : ""}>${ic(m.i)}<span>${esc(nameOf(m))}</span></button>`).join("") + (more ? `<button data-nav="__more" ${mods.slice(4).some((m) => m.id === C.mod) ? 'aria-current="page"' : ""}>${ic("more")}<span>Más</span></button>` : "") : "";
    if (fkey) { const n = $(`[data-f="${fkey}"]`); if (n && n.type !== "checkbox" && n.type !== "radio") { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* number/select */ } } }
  }
  Cosecha.render = render;
  Cosecha.views.__more = () => `<h2>Más módulos</h2><div class="stack">${MODS.filter((m) => m.roles.includes(C.role)).slice(4).map((m) => `<button class="card moreb" data-nav="${m.id}">${ic(m.i)} ${esc(nameOf(m))}</button>`).join("")}</div>`;

  document.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-nav]");
    if (nav) { const id = nav.dataset.nav; if (id === "__more") { C.mod = "__more"; return render(); } return Cosecha.go(id); }
    if (e.target.closest("#fieldbtn")) { C.field = !C.field; return render(); }
    if (e.target.closest("#offbtn")) { C.offline = !C.offline; if (!C.offline && C.queue) { Cosecha.toast(`Señal recuperada: ${C.queue} registro(s) sincronizados`); C.queue = 0; } return render(); }
    if (e.target.closest("#themebtn")) { const c = document.documentElement.dataset.theme; DevKit.applyTheme(c === "dark" ? "light" : c === "light" ? "auto" : "dark"); $$("#devbar [data-t]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.t === (document.documentElement.dataset.theme || "auto")))); return; }
    if (e.target.closest("[data-close]")) { $("#sheet").hidden = true; return; }
    for (const h of Cosecha.handlers) if (h("click", e)) return;
    if (C.mod === "mercado" && window.CosechaMarket && e.target.closest("#view, #sheet")) window.CosechaMarket.onClick(e);
  });
  ["change", "input"].forEach((ev) => document.addEventListener(ev, (e) => {
    for (const h of Cosecha.handlers) if (h(ev, e)) return;
    if (C.mod === "mercado" && window.CosechaMarket && e.target.closest("#view")) (ev === "change" ? window.CosechaMarket.onChange : window.CosechaMarket.onInput)(e);
  }));
  window.Cosecha = Cosecha;
  // Parámetros de URL (para manuales y capturas): ?role=acopio&view=recepcion&sub=caja&script=click:SELECTOR|type:SELECTOR=valor&dev=0&theme=light
  Cosecha.params = {};
  const runScript = (spec) => spec.split("|").forEach((a) => { const i = a.indexOf(":"), kind = a.slice(0, i), rest = a.slice(i + 1); if (kind === "click") { const n = $(rest); if (n) n.dispatchEvent(new MouseEvent("click", { bubbles: true })); } else if (kind === "type") { const j = rest.lastIndexOf("="), n = $(rest.slice(0, j)); if (n) { n.value = rest.slice(j + 1); n.dispatchEvent(new Event("input", { bubbles: true })); n.dispatchEvent(new Event("change", { bubbles: true })); } } });
  let first = true;
  Cosecha.start = () => DevKit.init({ app: "cosecha", roles: ROLES.map(({ id, label, desc }) => ({ id, label, desc })), role: "owner", onRole: (id) => {
    C.role = id; C.mod = MODS.find((m) => m.roles.includes(id)).id; $("#sheet").hidden = true;
    if (first) { first = false; const v = DevKit.param("view"), sub = DevKit.param("sub"); if (v && MODS.find((m) => m.id === v && m.roles.includes(id))) C.mod = v; if (sub) { if (C.mod === "mercado" && window.CosechaMarket) window.CosechaMarket.S.v = sub; else Cosecha.params.sub = sub; } if (DevKit.param("offline") === "1") C.offline = true; if (DevKit.param("field") === "1") C.field = true; render(); const sc = DevKit.param("script"); if (sc) runScript(sc); return; }
    render(); } });
})();
