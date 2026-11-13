/* Balance · prototipo v3 (diseño nuevo). Datos FICTICIOS en memoria (recargar los restablece). Dinero: money.js (D1, D2, D4, D8). Acceso: rules.js (D3, D7).
   Lo que la persona no puede hacer NO se muestra; lo que se ve pero se deniega explica el porqué y a quién pedirlo. Textos de usted (regla de Pastel). */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const M = window.BalanceMoney, R = window.BalanceRules, D = window.BALANCE_DATA;
  const I = { groups: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>', coins: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>', scale: '<path d="M12 3v18M5 21h14M4 7h16M7 7l-3 7a3 3 0 0 0 6 0zM17 7l-3 7a3 3 0 0 0 6 0z"/>', receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6M16 5a3.5 3.5 0 0 1 0 7M18 14c2.5.5 4 2.5 4 6"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>', plus: '<path d="M12 5v14M5 12h14"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/>', check: '<path d="M5 12l5 5L20 7"/>', lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', alert: '<path d="M12 3l10 18H2zM12 10v5M12 18h.01"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', pencil: '<path d="M4 20l1-4L16 5l3 3L8 19z"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 0 1 4.8.8c0 1.7-2.4 2.1-2.4 3.8M12 17h.01"/>', door: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h8M10 12h11M18 8l4 4-4 4"/>', open: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>' };
  const ic = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;
  const nm = (id) => D.people[id] || id;
  const dateFmt = new Intl.DateTimeFormat("es-CR", { day: "numeric", month: "short", timeZone: "UTC" });
  const fdate = (d) => dateFmt.format(new Date(d + "T12:00:00Z")).replace(".", "");

  let groups = D.make(), roleId = "admin", nextId = 10, guard = R.createJoinGuard(), lastFocus = null;
  const sess = () => D.ROLES[roleId], me = () => sess().me;
  const ctx = (g, x) => Object.assign({ session: sess().session, hasAccess: sess().access, group: g, actorId: me() }, x || {});
  const byId = (id) => groups.find((g) => g.id === id);
  const myGroups = () => groups.filter((g) => g.members.some((m) => m.id === me()));
  const roleIn = (g) => (g.members.find((m) => m.id === me()) || {}).role;
  const calc = (g) => { const ids = g.members.map((m) => m.id); const r = M.computeShares(ids, g.expenses.map((e) => ({ payerId: e.payerId, units: M.toUnits(e.amount, g.currency) }))); return { ids, r, transfers: M.settle(r.balances, ids) }; };
  const money = (u, g, o) => M.format(u, g.currency, o);
  const dec = (s) => String(s).replace(".", ",");
  const now = () => new Date().toISOString().slice(0, 16).replace("T", " ");
  const audit = (g, what) => g.audit.unshift({ at: now(), who: nm(me()), what });
  const route = () => { const h = location.hash.replace(/^#\/?/, "").split("/"); if (h[0] === "g") return { k: "g", id: h[1], tab: h[2] || "resumen" }; if (h[0] === "ayuda") return { k: "help" }; if (h[0] === "nuevo") return { k: "new" }; if (h[0] === "unirse") return { k: "join", token: h[1] || "" }; return { k: "home" }; };
  const go = (h) => { if (location.hash === h) render(); else location.hash = h; };

  // ── Infraestructura: toast, diálogos ──
  let tt, toastFn = null; const toast = (m, a) => { const t = $("#toast"); t.innerHTML = `<span>${esc(m)}</span>` + (a ? ` <button class="btn small" data-act="toast-undo">${esc(a.label)}</button>` : ""); toastFn = a ? a.fn : null; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => { t.hidden = true; toastFn = null; }, a ? 9000 : 3200); };
  const closeDlg = () => { $("#dlg").innerHTML = ""; if (lastFocus && lastFocus.focus) lastFocus.focus(); };
  const dlg = (html) => { lastFocus = document.activeElement; $("#dlg").innerHTML = `<div class="back" id="back"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="mt">${html}</section></div>`; const f = $("#dlg input,#dlg select,#dlg textarea,#dlg button"); if (f) f.focus(); };
  const confirmDlg = ({ title, body, ok, danger, onOk }) => { dlg(`<h2 id="mt">${esc(title)}</h2><div>${body}</div><div class="btns"><button class="btn" data-x="cancel">Cancelar</button><button class="btn ${danger ? "danger" : "primary"}" data-x="ok">${esc(ok)}</button></div>`); $("#dlg [data-x=ok]").onclick = () => { closeDlg(); onOk(); }; $("#dlg [data-x=cancel]").onclick = closeDlg; };
  const denyDlg = (r) => { dlg(`<h2 id="mt">${r.status === 403 ? "Sin permiso" : r.status === 404 ? "No encontrado" : "No se puede hacer todavía"}</h2><p>${esc(r.reason)}</p>${r.who ? `<p class="mut"><b>Qué hacer:</b> ${esc(r.who)}</p>` : ""}<p class="mut small">Código: ${esc(r.code)} · estado ${r.status}</p><div class="btns"><button class="btn primary" data-x="cancel">Entendido</button></div>`); $("#dlg [data-x=cancel]").onclick = closeDlg; };
  document.addEventListener("keydown", (e) => {
    const back = $("#dlg .back"); if (!back) return; if (e.key === "Escape") { closeDlg(); return; }
    if (e.key === "Tab") { const f = [...back.querySelectorAll("a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])")].filter((x) => !x.hidden); if (!f.length) return; const first = f[0], last = f[f.length - 1]; if (!back.contains(document.activeElement)) { e.preventDefault(); first.focus(); } else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
  });
  document.addEventListener("click", (e) => { if (e.target.id === "back") closeDlg(); });
  const copy = (text, what) => { try { navigator.clipboard.writeText(text).then(() => toast(what + " copiado"), () => toast("No se pudo copiar; seleccione el texto")); } catch (e) { toast("No se pudo copiar; seleccione el texto"); } };

  // ── Vistas ──
  function gate(kind, title, body, steps, btns, code) { $("#main").innerHTML = `<section class="card gate" ${kind === "bad" ? 'role="alert"' : ""}><h1>${title}</h1><p>${body}</p>${steps || ""}<div class="btns">${btns}</div><span class="code">${code}</span></section>`; }
  const LOGIN = '<button class="btn primary" data-act="login">Iniciar sesión con Google</button>';

  function renderSide() {
    const gs = myGroups(), r = route();
    $("#side").innerHTML = !sess().session || !sess().access ? "" : `<h2>Sus grupos</h2>${gs.map((g) => `<a href="#/g/${g.id}" ${r.k === "g" && r.id === g.id ? 'aria-current="page"' : ""}>${ic("coins")}<span>${esc(g.name)}<span class="sub">${g.closed ? "Cerrado" : "Abierto"} · ${g.members.length} personas</span></span></a>`).join("") || '<p class="small mut" style="padding:0 .8rem">Todavía ninguno.</p>'}<hr><a href="#/nuevo" ${r.k === "new" ? 'aria-current="page"' : ""}>${ic("plus")}Nuevo grupo</a><a href="#" data-act="have-link">${ic("link")}Tengo un enlace</a><a href="#/ayuda" ${r.k === "help" ? 'aria-current="page"' : ""}>${ic("help")}Cómo funciona</a>`;
    $("#who").textContent = me() && sess().session ? "Sesión de " + nm(me()) : "Sin sesión";
  }
  function setTabs(g, tab) {
    const el = $("#tabs"); if (!g) { el.hidden = true; $("#fab") && $("#fab").remove(); return; }
    const T = [["resumen", "Resumen", "groups"], ["gastos", "Gastos", "receipt"], ["saldos", "Saldos", "scale"], ["liquidar", "Liquidar", "coins"], ["personas", "Personas", "users"]];
    el.style.gridTemplateColumns = `repeat(${T.length},1fr)`; el.hidden = false; el.innerHTML = T.map(([k, l, i]) => `<a href="#/g/${g.id}/${k}" ${tab === k ? 'aria-current="page"' : ""}>${ic(i)}${l}</a>`).join("");
    return T;
  }
  const HOME = { q: "", st: "all" };
  const visibleGroups = () => { const q = normT(HOME.q); return myGroups().filter((g) => (HOME.st === "all" || (HOME.st === "open" ? !g.closed : g.closed)) && (!q || normT(g.name + " " + g.description).includes(q))); };
  const memStack = (g) => `<span class="avs">${g.members.slice(0, 4).map((m) => `<span class="av sm" title="${esc(nm(m.id))}">${esc(nm(m.id)[0])}</span>`).join("")}${g.members.length > 4 ? `<span class="av sm">+${g.members.length - 4}</span>` : ""}</span>`;
  const nPl = (k, a, b) => `${k} ${k === 1 ? a : b}`;
  function homeSummary() { const all = myGroups(), o = all.filter((g) => !g.closed).length; return HOME.st === "all" && !normT(HOME.q) ? `<b>${nPl(all.length, "grupo", "grupos")}</b> · ${nPl(o, "abierto", "abiertos")} · ${nPl(all.length - o, "cerrado", "cerrados")}` : `<b>${nPl(visibleGroups().length, "grupo", "grupos")}</b> con estos filtros`; }
  function homeCards() {
    const list = visibleGroups();
    if (!list.length) return `<div class="card empty"><b>No encontramos grupos</b>Pruebe otra búsqueda o quite los filtros para ver más resultados.<div><button class="btn" data-act="clear-home">Mostrar todos los grupos</button></div></div>`;
    return `<div class="gcards">${list.map((g) => { const { r } = calc(g), b = r.balances[me()]; const st = b > 0n ? `<span class="st pos">Le deben ${money(b, g)}</span>` : b < 0n ? `<span class="st neg">Usted debe ${money(-b, g)}</span>` : '<span class="st zero">Está al día</span>'; return `<a class="card gcard" href="#/g/${g.id}"><div class="gtop"><h2>${esc(g.name)}</h2><span class="chip ${g.closed ? "closed" : "open"}">${ic(g.closed ? "lock" : "open")}${g.closed ? "Cerrado" : "Abierto"}</span></div><p class="mut small">${esc(g.description)}</p><div class="gtot"><span class="mut small">Total de gastos</span><b class="num">${money(r.total, g)}</b><span class="mut small">${nPl(g.expenses.length, "gasto", "gastos")} · ${g.currency}</span></div><div class="gbot">${memStack(g)}${st}</div></a>`; }).join("")}</div>`;
  }
  function home() {
    const gs = myGroups();
    const head = `<div class="head"><div><h1>Sus grupos</h1><p class="mut">Cuentas claras con quienes comparte gastos.</p></div><div class="acts"><a class="btn" href="#/ayuda">${ic("help")}Cómo funciona</a><a class="btn" href="#" data-act="have-link">${ic("link")}Tengo un enlace</a><a class="btn primary" href="#/nuevo">${ic("plus")}Nuevo grupo</a></div></div>`;
    if (!gs.length) { $("#main").innerHTML = head + `<div class="card empty"><b>Todavía no está en ningún grupo</b>Cree uno para registrar gastos con su gente, o abra el enlace que le enviaron.<div><a class="btn primary" href="#/nuevo">${ic("plus")}Crear mi primer grupo</a> <a class="btn" href="#" data-act="have-link">${ic("link")}Tengo un enlace</a></div></div>`; return; }
    const o = gs.filter((g) => !g.closed).length, chip = (v, l, n) => `<button data-hf="${v}" aria-pressed="${HOME.st === v}">${l} <span>${n}</span></button>`;
    $("#main").innerHTML = head + `<div class="htool"><p class="small" id="hsum" aria-live="polite">${homeSummary()}</p><div class="chips" role="group" aria-label="Filtrar grupos">${chip("all", "Todos", gs.length)}${chip("open", "Abiertos", o)}${chip("closed", "Cerrados", gs.length - o)}</div><div><label class="sr" for="hq">Buscar grupo</label><input id="hq" data-hq placeholder="Buscar grupo" value="${esc(HOME.q)}" autocomplete="off"></div></div><div id="groupCards">${homeCards()}</div>`;
  }
  function noGroup() { gate("", "No encontramos ese grupo", "Puede que el enlace ya no sirva o que usted no forme parte de ese grupo.", "", '<a class="btn primary" href="#/">Ver mis grupos</a>', "Para una persona que no es miembro, el grupo «no existe» (404)"); }

  function heroHtml(g) {
    const { r } = calc(g), mineB = r.balances[me()] || 0n;
    return `<div class="hero ${mineB < 0n ? "owe" : mineB === 0n ? "even" : ""}"><div><div class="lbl">Su situación en este grupo</div><div class="big num ${mineB > 0n ? "pos" : mineB < 0n ? "neg" : "zero"}">${mineB > 0n ? "Le deben " + money(mineB, g) : mineB < 0n ? "Usted debe " + money(-mineB, g) : "Está al día"}</div></div><div class="tot"><div><div class="lbl">Total del grupo</div><b class="num">${money(r.total, g)}</b></div><div><div class="lbl">Su parte</div><b class="num">${money(r.shares[me()] || 0n, g)}</b></div><div><div class="lbl">Usted pagó</div><b class="num">${money(r.paid[me()] || 0n, g)}</b></div></div></div>`;
  }
  function group(g, tab) {
    const rl = roleIn(g), admin = rl === "admin"; const { r, transfers } = calc(g);
    const canAdd = R.can("add_expense", ctx(g, { payerId: me() })).allowed;
    const tabs = [["resumen", "Resumen"], ["gastos", "Gastos"], ["saldos", "Saldos"], ["liquidar", g.closed ? "Liquidación" : "Liquidar"], ["personas", "Personas"]]; if (admin) tabs.push(["gestion", "Gestión de gastos"], ["ajustes", "Ajustes"]);
    if (tab !== "gestion") uiOf(g).dr = null;
    let body = "";
    if (tab === "resumen") body = tabResumen(g, r, transfers); else if (tab === "gastos") body = tabGastos(g, canAdd); else if (tab === "saldos") body = tabSaldos(g, r); else if (tab === "liquidar") body = tabLiquidar(g, transfers, r); else if (tab === "personas") body = tabPersonas(g, admin); else if (tab === "gestion") body = admin ? tabGestion(g) : noPerm(g, "La gestión de todos los gastos la hace quien administra el grupo."); else if (tab === "ajustes") body = admin ? tabAjustes(g) : noPerm(g);
    const zone = (D.ZONES.find((z) => z[0] === g.tz) || [0, g.tz])[1];
    $("#main").innerHTML = `<div class="head"><div><h1>${esc(g.name)}</h1><div class="meta"><span class="chip ${g.closed ? "closed" : "open"}">${ic(g.closed ? "lock" : "open")}${g.closed ? "Cerrado" : "Abierto"}</span><span class="chip" title="${esc(M.currency(g.currency).name)}">${g.currency} · ${esc(M.currency(g.currency).symbol)}</span><span class="chip" title="Zona horaria del grupo">${esc(zone)}</span><span class="chip">${g.members.length} personas</span><span class="chip">${admin ? "Usted administra" : "Usted es miembro"}</span></div>${g.description ? `<p class="mut small" style="margin:.5rem 0 0">${esc(g.description)}</p>` : ""}${admin ? `<div class="adminlinks"><a class="btn small" href="#/g/${g.id}/gestion">Gestión de gastos</a><a class="btn small" href="#/g/${g.id}/ajustes">Ajustes</a></div>` : ""}</div>${canAdd ? `<div class="acts add-acts"><button class="btn primary" data-act="add-exp">${ic("plus")}Registrar gasto</button></div>` : ""}</div>${heroHtml(g)}<nav class="tabsd" aria-label="Secciones del grupo">${tabs.map(([k, l]) => `<a href="#/g/${g.id}/${k}" ${tab === k ? 'aria-current="page"' : ""}>${l}</a>`).join("")}</nav>${body}`;
    setTabs(g, tab); if (canAdd && tab !== "gestion") { const f = document.createElement("button"); f.id = "fab"; f.className = "btn primary fab"; f.dataset.act = "add-exp"; f.innerHTML = ic("plus") + "Registrar gasto"; document.body.appendChild(f); }
  }
  function noPerm(g, msg) { return `<div class="card gate"><h2>Sin permiso</h2><p>${esc(msg || "Los ajustes del grupo los cambia quien lo administra.")}</p><p class="mut"><b>Qué hacer:</b> pídale a alguien que administre el grupo (${g.members.filter((m) => m.role === "admin").map((m) => esc(nm(m.id))).join(", ")}) que haga el cambio.</p><span class="code mut small">El servidor responde 403 · balance.forbidden</span></div>`; }

  // ── Gastos (lista con filtros), Resumen por participante y Gestión de gastos (hoja con borrador) ──
  const UI = {}; const uiOf = (g) => UI[g.id] || (UI[g.id] = { q: "", who: "", from: "", to: "", sort: "date-desc", open: new Set(), dr: null });
  const normT = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const idn = (e) => parseInt(String(e.id).slice(1), 10) || 0;
  const SORTS = { "date-desc": (a, b) => b.date.localeCompare(a.date) || idn(b) - idn(a), "date-asc": (a, b) => a.date.localeCompare(b.date) || idn(a) - idn(b) };
  const SORT_LABEL = { "date-desc": "Fecha: más reciente", "date-asc": "Fecha: más antigua", "amt-desc": "Mayor monto", "amt-asc": "Menor monto", "alpha-asc": "Descripción: A–Z", "alpha-desc": "Descripción: Z–A" };
  const curG = () => byId(route().id);
  const units = (e, g) => M.toUnits(e.amount, g.currency);
  const cmpU = (a, b, g) => (units(b, g) > units(a, g) ? 1 : units(b, g) < units(a, g) ? -1 : 0);
  function sorterFor(g, k) {
    const d = SORTS["date-desc"];
    if (k === "amt-desc") return (a, b) => cmpU(a, b, g) || d(a, b); if (k === "amt-asc") return (a, b) => -cmpU(a, b, g) || d(a, b);
    if (k === "alpha-asc") return (a, b) => a.description.localeCompare(b.description, "es", { sensitivity: "base" }) || d(a, b); if (k === "alpha-desc") return (a, b) => b.description.localeCompare(a.description, "es", { sensitivity: "base" }) || d(a, b);
    return SORTS[k] || d;
  }
  function filtered(g) {
    const F = uiOf(g), q = normT(F.q);
    return g.expenses.filter((e) => (!F.who || (F.who === "me" ? e.payerId === me() : F.who === "others" ? e.payerId !== me() : e.payerId === F.who)) && (!F.from || e.date >= F.from) && (!F.to || e.date <= F.to) && (!q || normT(e.description).includes(q))).sort(sorterFor(g, F.sort));
  }
  const sumU = (ex, g) => ex.reduce((a, e) => a + units(e, g), 0n);
  const filtersActive = (F) => !!(F.q || F.who || F.from || F.to);
  const clearBtn = (F) => (filtersActive(F) ? '<button class="btn small" data-act="clear-filters">Limpiar filtros</button>' : "");
  function summaryText(g, ex) {
    const F = uiOf(g), total = sumU(g.expenses, g), shown = sumU(ex, g);
    let t = `Mostrando ${ex.length} de ${g.expenses.length} gastos · suma ${money(shown, g)}`;
    if (F.who && F.who !== "me" && F.who !== "others") t += ` · ${nm(F.who)} pagó ${money(sumU(g.expenses.filter((e) => e.payerId === F.who), g), g)} de ${money(total, g)} en total`;
    return t;
  }
  function filtersBar(g) {
    const F = uiOf(g);
    return `<div class="filters" role="search" aria-label="Filtrar gastos"><div class="field"><label for="fQ">Buscar</label><input id="fQ" data-f="q" value="${esc(F.q)}" placeholder="Descripción…" autocomplete="off"></div><div class="field"><label for="fWho">Pagó</label><select id="fWho" data-f="who"><option value="">Todas</option><option value="me" ${F.who === "me" ? "selected" : ""}>Pagados por mí</option><option value="others" ${F.who === "others" ? "selected" : ""}>Pagados por otras personas</option>${g.members.map((m) => `<option value="${m.id}" ${F.who === m.id ? "selected" : ""}>${esc(nm(m.id))}${m.id === me() ? " (usted)" : ""}</option>`).join("")}</select></div><div class="field"><label for="fFrom">Desde</label><input id="fFrom" type="date" data-f="from" value="${F.from}"></div><div class="field"><label for="fTo">Hasta</label><input id="fTo" type="date" data-f="to" value="${F.to}"></div><div class="field"><label for="fSort">Ordenar</label><select id="fSort" data-f="sort">${Object.entries(SORT_LABEL).map(([k, l]) => `<option value="${k}" ${F.sort === k ? "selected" : ""}>${l}</option>`).join("")}</select></div><span id="fClear" style="align-self:end;margin-bottom:.9rem">${clearBtn(F)}</span></div><p class="small mut" id="fSummary" aria-live="polite">${esc(summaryText(g, filtered(g)))}</p>`;
  }
  function expRow(g, e) {
    const can = (a) => R.can(a, ctx(g, { expense: e })).allowed;
    return `<li class="row"><div class="main"><b>${esc(e.description)}</b><span class="small mut">Pagó ${esc(nm(e.payerId))}${e.payerId === me() ? " (usted)" : ""} · ${fdate(e.date)}</span></div><span class="amt num">${money(units(e, g), g)}</span><span class="acts">${can("edit_expense") ? `<button class="btn small" data-act="edit-exp" data-id="${e.id}" aria-label="Editar ${esc(e.description)}">${ic("pencil")}Editar</button>` : ""}${can("delete_expense") ? `<button class="btn small danger" data-act="del-exp" data-id="${e.id}" aria-label="Eliminar ${esc(e.description)}">${ic("trash")}</button>` : ""}</span></li>`;
  }
  function expArea(g) {
    const ex = filtered(g); const sum = $("#fSummary"); if (sum) sum.textContent = summaryText(g, ex);
    if (!ex.length) return `<div class="card empty"><b>Ningún gasto coincide con los filtros</b>Pruebe con otra persona, otro rango de fechas o menos texto.<div><button class="btn" data-act="clear-filters">Limpiar filtros</button></div></div>`;
    return `<div class="card"><ul class="list">${ex.map((e) => expRow(g, e)).join("")}</ul></div>`;
  }
  const closedNote = (g) => (g.closed ? `<div class="notice warn">${ic("lock")}<div>El grupo está cerrado: solo se puede leer.${roleIn(g) === "admin" ? ' <button class="btn small" data-act="reopen">Reabrir el grupo</button>' : " Pida a quien lo administra que lo reabra."}</div></div>` : "");
  function tabGastos(g, canAdd) {
    const admin = roleIn(g) === "admin", h = closedNote(g);
    if (!g.expenses.length) return h + `<div class="card empty"><b>Aún no hay gastos</b>Registre el primero: quién pagó y cuánto. Balance reparte en partes iguales entre todas las personas del grupo.${canAdd ? `<div><button class="btn primary" data-act="add-exp">${ic("plus")}Registrar el primer gasto</button> ${admin ? `<a class="btn" href="#/g/${g.id}/gestion">Abrir la gestión de gastos</a>` : ""}</div>` : ""}</div>`;
    return h + (admin && !g.closed ? `<p class="small mut">¿Va a cargar o corregir muchos gastos? Use la <a href="#/g/${g.id}/gestion">Gestión de gastos</a>, una hoja editable.</p>` : "") + filtersBar(g) + `<div id="expArea">${expArea(g)}</div>`;
  }
  // Resumen: cada participante se abre para ver sus gastos y su saldo (el «Detalles» del original)
  function tabResumen(g, r, transfers) {
    const F = uiOf(g);
    const rows = g.members.map((m, i) => {
      const b = r.balances[m.id], ex = g.expenses.filter((e) => e.payerId === m.id).sort(SORTS["date-desc"]), lab = b > 0n ? "Recibe" : b < 0n ? "Debe" : "Al día", cls = b > 0n ? "pos" : b < 0n ? "neg" : "zero";
      return `<details class="acc" data-who="${m.id}" ${F.open.has(m.id) ? "open" : ""}><summary class="accrow"><span class="pwho"><span class="av" aria-hidden="true">${esc(nm(m.id)[0])}</span><span><b>${esc(nm(m.id))}${m.id === me() ? " (usted)" : ""}</b><small>${nPl(ex.length, "gasto", "gastos")} · ${m.role === "admin" ? "Administra" : "Miembro"} · #${i + 1}</small></span></span><span class="mt"><small>Total pagado</small><b class="num">${money(r.paid[m.id], g)}</b></span><span class="mt"><small>Parte asignada</small><b class="num">${money(r.shares[m.id], g)}</b></span><span class="mt"><small>Saldo</small><b class="num ${cls}">${money(b, g, { sign: true })}</b><small class="${cls}">${lab}</small></span></summary><div class="accbody"><div class="acchead"><b>Gastos pagados por ${esc(nm(m.id))}</b><button class="btn small" data-act="who-filter" data-id="${m.id}">Ver en Gastos</button></div>${ex.length ? `<ul class="list">${ex.map((e) => expRow(g, e)).join("")}</ul>` : `<p class="small mut">${esc(nm(m.id))} todavía no pagó ningún gasto.</p>`}</div></details>`;
    }).join("");
    const prev = transfers.slice(0, 3).map((t) => `<div class="pay ${t.from === me() || t.to === me() ? "mine" : ""}"><span>${t.from === me() ? "Usted paga a" : t.to === me() ? `${esc(nm(t.from))} le paga a` : `${esc(nm(t.from))} paga a`} <b>${t.to === me() ? "usted" : esc(nm(t.to))}</b></span><span class="amt num">${money(t.units, g)}</span></div>`).join("");
    return closedNote(g) + `<div class="resgrid"><section class="card"><div class="phead"><div><h2>Gastos y saldos por participante</h2><p class="small mut">Abra una persona para consultar sus gastos y su saldo.</p></div><span class="chip">${nPl(g.expenses.length, "gasto", "gastos")}</span></div>${rows || '<p class="mut">Aún no hay personas.</p>'}<div class="plinks"><a href="#/g/${g.id}/gastos">Ver todos los gastos →</a> <a href="#/g/${g.id}/saldos">Ver la tabla de saldos →</a></div></section><section class="card"><div class="phead"><div><h2>${g.closed ? "Liquidación (grupo cerrado)" : "Liquidación sugerida"}</h2><p class="small mut">Transferencias para equilibrar los saldos.</p></div><span class="chip">${nPl(transfers.length, "transferencia", "transferencias")}</span></div>${prev || `<p class="mut">${g.expenses.length ? "Las cuentas están claras." : "Todavía no hay gastos."}</p>`}${transfers.length > 3 ? `<p class="small mut">y ${transfers.length - 3} más.</p>` : ""}<div class="plinks"><a href="#/g/${g.id}/liquidar">Ver la liquidación completa →</a></div></section></div>`;
  }

  // ── Gestión de gastos: hoja con BORRADOR y guardado atómico (modelo del prototipo original) ──
  // Nada afecta a los saldos hasta «Guardar cambios»; si una celda es inválida no se guarda NADA; se avisa de cambios sin guardar al salir.
  function beginDraft(g) {
    const rows = [...g.expenses].sort(SORTS["date-desc"]).map((e) => ({ key: String(e.id), id: e.id, payer: e.payerId, description: e.description, amount: dec(e.amount), date: e.date, isNew: false }));
    rows.forEach((x) => (x.orig = { payer: x.payer, description: x.description, amount: x.amount, date: x.date }));
    uiOf(g).dr = { rows, dirty: false, errors: null, sel: new Set(), n: 1 };
  }
  const payerSel = (g, sel) => `<option value="">Seleccione persona</option>` + g.members.map((m) => `<option value="${m.id}" ${sel === m.id ? "selected" : ""}>${esc(nm(m.id))}${m.id === me() ? " (usted)" : ""}</option>`).join("");
  function draftTotal(g) { return uiOf(g).dr.rows.reduce((a, r) => { const p = M.parseInput(r.amount, g.currency); return p.ok ? a + M.toUnits(p.value, g.currency) : a; }, 0n); }
  function gestionBody(g) {
    const F = uiOf(g), d = F.dr, ro = g.closed, errs = d.errors || {}, mode = M.currency(g.currency).decimals ? "decimal" : "numeric", inv = (e, f) => (e && e[f] ? ' aria-invalid="true"' : "");
    const nInv = Object.values(errs).reduce((a, e) => a + Object.keys(e).length, 0);
    const rows = d.rows.map((row, i) => {
      const e = errs[row.key] || {}, cell = (f, ctl) => `<td class="${e[f] ? "bad" : ""}">${ctl}${e[f] ? `<small class="cellerr">${esc(e[f])}</small>` : ""}</td>`, dis = ro ? " disabled" : "";
      return `<tr class="${row.isNew ? "newrow" : ""} ${Object.keys(e).length ? "badrow" : ""} ${d.sel.has(row.key) ? "sel" : ""}" data-key="${row.key}"><td class="c"><input type="checkbox" data-gsel="${row.key}" ${d.sel.has(row.key) ? "checked" : ""}${dis} aria-label="Seleccionar la fila ${i + 1}"></td>${cell("payer", `<select data-gf="payer" data-k="${row.key}"${inv(e, "payer")}${dis} aria-label="Quién pagó, fila ${i + 1}">${payerSel(g, row.payer)}</select>`)}${cell("description", `<input data-gf="description" data-k="${row.key}" maxlength="500" autocomplete="off" placeholder="¿En qué se gastó?"${inv(e, "description")}${dis} aria-label="Descripción del gasto, fila ${i + 1}" value="${esc(row.description)}">`)}${cell("amount", `<input class="r" data-gf="amount" data-k="${row.key}" inputmode="${mode}" autocomplete="off" placeholder="${mode === "decimal" ? "0,00" : "0"}"${inv(e, "amount")}${dis} aria-label="Monto del gasto en ${g.currency}, fila ${i + 1}" value="${esc(row.amount)}">`)}${cell("date", `<input type="date" data-gf="date" data-k="${row.key}"${inv(e, "date")}${dis} aria-label="Fecha del gasto, fila ${i + 1}" value="${esc(row.date)}">`)}<td class="c"><button class="btn small danger" data-act="g-rm" data-k="${row.key}"${dis} aria-label="Quitar la fila ${i + 1}">${ic("trash")}</button></td></tr>`;
    }).join("");
    const saveDis = !d.dirty || ro ? "disabled" : "";
    return `<section class="gest" aria-labelledby="gTitle"><div class="gintro"><div><div class="eyebrow small mut">Edición rápida</div><h2 id="gTitle">Gestión de gastos</h2><p class="small mut">Edite las celdas como en una hoja de cálculo. Los saldos y la liquidación se recalculan <b>al guardar</b>.</p></div><div class="gcount"><b id="gCount">${d.rows.length}</b><span>${d.rows.length === 1 ? "fila" : "filas"}</span></div></div>${ro ? `<div class="notice warn">${ic("lock")}<div><b>Grupo cerrado.</b> Los gastos se pueden consultar, pero hay que reabrir el grupo para agregar o modificar. <button class="btn small" data-act="reopen">Reabrir el grupo</button></div></div>` : ""}<div class="gtool"><span class="small mut"><b>Todos los gastos</b> · ${nPl(g.expenses.length, "guardado", "guardados")} · ${g.currency}</span><span class="gacts"><span id="gClean" class="small mut" ${d.dirty ? "hidden" : ""}>${ic("check")} Sin cambios pendientes</span><button class="btn small danger" data-act="g-rm-sel" id="gRmSel" ${d.sel.size ? "" : "hidden"}>Quitar seleccionadas (${d.sel.size})</button><button class="btn primary" data-act="g-add" ${ro ? "disabled" : ""}>${ic("plus")}Agregar fila</button></span></div><div id="gDirty" class="dirtybar" role="status" aria-live="polite" ${d.dirty ? "" : "hidden"}><span><b>Hay cambios sin guardar.</b> Guarde para aplicarlos y recalcular los saldos.</span><span class="gacts"><button class="btn small" data-act="g-discard">Descartar</button><button class="btn small primary gsave" data-act="g-save" ${saveDis}>${ic("check")}Guardar cambios</button></span></div><div id="gVal" class="valbar" role="alert" ${nInv ? "" : "hidden"}>${ic("alert")}Revise los campos señalados. La tabla no se guardará hasta corregirlos.</div><div class="sheetscroll" role="region" aria-label="Tabla editable de todos los gastos. Desplácese horizontalmente para ver todas las columnas." tabindex="0"><table class="sheet" id="gtable"><thead><tr><th class="c"><input type="checkbox" id="gSelAll" ${d.rows.length && d.rows.every((x) => d.sel.has(x.key)) ? "checked" : ""}${ro ? " disabled" : ""} aria-label="Seleccionar todas las filas"></th><th>Quién pagó</th><th>Gasto</th><th class="r">Monto (${g.currency})</th><th>Fecha</th><th><span class="sr">Acciones</span></th></tr></thead><tbody>${rows || `<tr><td colspan="6" class="gempty"><b>Este grupo todavía no tiene gastos.</b> Agregue una fila para comenzar.</td></tr>`}</tbody></table></div><div class="gfoot"><div><b>Total de la tabla: <span class="num" id="gTot">${money(draftTotal(g), g)}</span></b><span class="small mut" id="gCounts"> · ${d.rows.filter((x) => x.isNew).length} nuevas · ${g.expenses.length} guardadas</span></div><button class="btn primary gsave" data-act="g-save" ${saveDis}>${ic("check")}Guardar cambios</button></div><p class="small mut">La fecha se completa al crear una fila y se puede cambiar. <b>Enter</b> pasa a la fila de abajo (en el monto de una fila nueva agrega otra), <b>↑ ↓</b> se mueven entre filas, <b>Esc</b> deshace la celda y puede <b>pegar filas desde Excel</b> (fecha, descripción, pagó, monto).</p></section>`;
  }
  function tabGestion(g) { const F = uiOf(g); if (!F.dr) beginDraft(g); return `<div id="gestArea">${gestionBody(g)}</div>`; }
  const rerenderG = (g) => { const a = $("#gestArea"); if (a) a.innerHTML = gestionBody(g); };
  function updateGUi(g) {
    const d = uiOf(g).dr; if (!d) return; const ro = g.closed;
    const $s = (id) => $("#" + id); if ($s("gDirty")) $s("gDirty").hidden = !d.dirty; if ($s("gClean")) $s("gClean").hidden = d.dirty;
    $$(".gsave").forEach((b) => (b.disabled = !d.dirty || ro)); if ($s("gTot")) $s("gTot").textContent = money(draftTotal(g), g);
    if ($s("gCounts")) $s("gCounts").textContent = ` · ${d.rows.filter((x) => x.isNew).length} nuevas · ${g.expenses.length} guardadas`; if ($s("gCount")) $s("gCount").textContent = d.rows.length;
    const rm = $s("gRmSel"); if (rm) { rm.hidden = !d.sel.size; rm.textContent = `Quitar seleccionadas (${d.sel.size})`; }
  }
  function clearValidation(g) { const d = uiOf(g).dr; d.errors = null; const v = $("#gVal"); if (v) v.hidden = true; $$("#gtable .cellerr").forEach((n) => n.remove()); $$("#gtable .bad").forEach((n) => n.classList.remove("bad")); $$("#gtable .badrow").forEach((n) => n.classList.remove("badrow")); $$("#gtable [aria-invalid]").forEach((n) => n.removeAttribute("aria-invalid")); }
  function gField(el) { const g = curG(), d = g && uiOf(g).dr; const row = d && d.rows.find((x) => x.key === el.dataset.k); if (!row) return; row[el.dataset.gf] = el.value; d.dirty = true; if (d.errors) clearValidation(g); updateGUi(g); }
  function gAdd() {
    const g = curG(); if (!g || roleIn(g) !== "admin") return; if (g.closed) return toast("Reabra el grupo antes de modificar gastos.");
    const F = uiOf(g); if (!F.dr) beginDraft(g); const d = F.dr, last = d.rows.find((x) => x.isNew);
    const row = { key: "n" + d.n++, id: null, payer: last ? last.payer : g.members.some((m) => m.id === me()) ? me() : g.members[0].id, description: "", amount: "", date: last ? last.date : M.todayInZone(g.tz), isNew: true, orig: null };
    d.rows.unshift(row); d.dirty = true; if (d.errors) d.errors = null; rerenderG(g); const f = $(`#gtable [data-gf="description"][data-k="${row.key}"]`); if (f) f.focus();
  }
  function gRemove(keys) {
    const g = curG(), d = uiOf(g).dr, removed = []; if (!d || g.closed) return;
    d.rows = d.rows.filter((r, i) => { if (keys.includes(r.key)) { removed.push({ r, i }); return false; } return true; }); keys.forEach((k) => d.sel.delete(k)); if (!removed.length) return;
    d.dirty = true; d.errors = null; rerenderG(g);
    toast(`${nPl(removed.length, "fila quitada", "filas quitadas")} de la hoja. Guarde para aplicarlo o descarte los cambios para recuperarla.`, { label: "Deshacer", fn: () => { const dd = uiOf(g).dr; if (!dd) return; removed.sort((a, b) => a.i - b.i).forEach((x) => dd.rows.splice(Math.min(x.i, dd.rows.length), 0, x.r)); rerenderG(g); } });
  }
  function validateDraft(g) {
    const errors = {}, prepared = [];
    for (const row of uiOf(g).dr.rows) {
      const e = {}, d = String(row.description || "").trim(), a = M.parseInput(row.amount, g.currency);
      if (!g.members.some((m) => m.id === row.payer)) e.payer = "Seleccione una persona.";
      if (d.length < 4 || d.length > 500) e.description = "Debe tener entre 4 y 500 caracteres.";
      if (!a.ok) e.amount = a.message;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date) || Number.isNaN(Date.parse(row.date))) e.date = "Seleccione una fecha válida.";
      if (Object.keys(e).length) errors[row.key] = e; else prepared.push({ id: row.id, description: d, payerId: row.payer, amount: a.value, date: row.date });
    }
    return { errors, prepared };
  }
  function gSave(then) {
    const g = curG(), F = g && uiOf(g); if (!g || !F.dr) return false;
    const res = R.can("change_payer", ctx(g)); if (!res.allowed) { closeDlg(); denyDlg(res); return false; }
    const { errors, prepared } = validateDraft(g);
    if (Object.keys(errors).length) { F.dr.errors = errors; closeDlg(); rerenderG(g); const k = Object.keys(errors)[0], f = Object.keys(errors[k])[0], el = $(`#gtable [data-gf="${f}"][data-k="${k}"]`); if (el) el.focus(); toast("Hay campos pendientes. Corríjalos antes de guardar."); return false; }
    const before = new Map(g.expenses.map((e) => [e.id, e])), snap = g.expenses.map((e) => ({ ...e }));
    const added = prepared.filter((p) => p.id == null).length, removedN = g.expenses.filter((e) => !prepared.some((p) => p.id === e.id)).length;
    const modified = prepared.filter((p) => p.id != null).filter((p) => { const o = before.get(p.id); return o.description !== p.description || o.amount !== p.amount || o.date !== p.date || o.payerId !== p.payerId; }).length;
    g.expenses = prepared.map((p) => ({ id: p.id != null ? p.id : "e" + nextId++, description: p.description, payerId: p.payerId, amount: p.amount, date: p.date }));
    audit(g, `Guardó la gestión de gastos: ${nPl(added, "nuevo", "nuevos")}, ${nPl(modified, "modificado", "modificados")}, ${nPl(removedN, "eliminado", "eliminados")}`);
    F.dr = null; closeDlg(); render();
    toast(`Cambios guardados. ${nPl(g.expenses.length, "gasto", "gastos")} en total y saldos recalculados.`, { label: "Deshacer", fn: () => { g.expenses = snap; audit(g, "Deshizo el último guardado de la gestión de gastos"); F.dr = null; if (curG() === g) render(); toast("Cambios deshechos"); } });
    if (then) then(); return true;
  }
  // Aviso de cambios sin guardar (clic, atrás del navegador y cierre de la página)
  let lastHash = location.hash, ignoreHash = false, pendingNav = null;
  const dirtyGroup = () => Object.keys(UI).map((k) => ({ k, d: UI[k].dr })).find((x) => x.d && x.d.dirty);
  function openUnsaved(nav) {
    pendingNav = nav;
    dlg(`<h2 id="mt">Hay cambios sin guardar</h2><p>Si sale de la gestión de gastos, perderá las modificaciones que todavía no ha guardado.</p><div class="notice">${ic("alert")}<div>Los cambios de la tabla todavía no se aplicaron al grupo. Puede guardarlos antes de continuar o descartarlos y recuperar los datos guardados.</div></div><div class="btns"><button class="btn" data-x="stay">Seguir editando</button><button class="btn danger" data-x="drop">Descartar y salir</button><button class="btn primary" data-x="save">Guardar y continuar</button></div>`);
    const go2 = () => { const n = pendingNav; pendingNav = null; if (typeof n === "function") n(); else go(n); };
    $("#dlg [data-x=stay]").onclick = () => { pendingNav = null; closeDlg(); };
    $("#dlg [data-x=drop]").onclick = () => { const x = dirtyGroup(); if (x) UI[x.k].dr = null; closeDlg(); go2(); };
    $("#dlg [data-x=save]").onclick = () => { gSave(go2); };
  }
  document.addEventListener("click", (e) => {
    const x = dirtyGroup(); if (!x || $("#dlg .back")) return; const a = e.target.closest("a[href^='#/']"), b = e.target.closest("[data-act='who-filter']");
    if (a) { const h = a.getAttribute("href"); if (h === "#/g/" + x.k + "/gestion") return; e.preventDefault(); e.stopImmediatePropagation(); openUnsaved(h); }
    else if (b) { e.preventDefault(); e.stopImmediatePropagation(); openUnsaved(() => act("who-filter", b)); }
  }, true);
  addEventListener("beforeunload", (e) => { if (dirtyGroup()) { e.preventDefault(); e.returnValue = ""; } });
  // Pegar desde Excel: se revisan TODAS las filas; si una falla no se agrega ninguna
  function parseRows(g, text, defDate) {
    const rows = [], errs = [], lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
    lines.forEach((line, i) => {
      const c = line.split(/\t|;/).map((x) => x.trim()), last = c[c.length - 1];
      if (i === 0 && !M.parseInput(last, g.currency).ok && /monto|importe|descripci/i.test(line)) return;
      let date = defDate, desc, who, amt; if (c.length >= 4) [date, desc, who, amt] = c; else if (c.length === 3) [desc, who, amt] = c; else { errs.push(`Fila ${i + 1}: use fecha, descripción, pagó y monto separados por tabulador.`); return; }
      const dm = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(date); if (dm) date = `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
      const m = g.members.find((x) => normT(nm(x.id)) === normT(who)); if (!m) { errs.push(`Fila ${i + 1}: «${who}» no está en el grupo.`); return; }
      const d = String(desc).trim(), a = M.parseInput(amt, g.currency);
      if (d.length < 4 || d.length > 500) { errs.push(`Fila ${i + 1}: la descripción debe tener entre 4 y 500 caracteres.`); return; } if (!a.ok) { errs.push(`Fila ${i + 1}: ${a.message}`); return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) { errs.push(`Fila ${i + 1}: fecha no válida.`); return; }
      rows.push({ date, description: d, payer: m.id, amount: dec(a.value) });
    });
    return { rows, errs };
  }
  function gPaste(text) {
    const g = curG(), F = uiOf(g), d = F.dr; if (!d || g.closed) return; const last = d.rows.find((x) => x.isNew); const { rows, errs } = parseRows(g, text, last ? last.date : M.todayInZone(g.tz)); if (!rows.length && !errs.length) return;
    if (errs.length) { dlg(`<h2 id="mt">No se pegó ninguna fila</h2><p>Se revisan todas las filas y no se agrega nada si alguna tiene un error (así no queda a medias).</p><ul>${errs.slice(0, 8).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>${errs.length > 8 ? `<p class="mut small">…y ${errs.length - 8} más.</p>` : ""}<div class="btns"><button class="btn primary" data-x="cancel">Entendido</button></div>`); $("#dlg [data-x=cancel]").onclick = closeDlg; return; }
    rows.reverse().forEach((r) => d.rows.unshift({ key: "n" + d.n++, id: null, payer: r.payer, description: r.description, amount: r.amount, date: r.date, isNew: true, orig: null })); d.dirty = true; rerenderG(g);
    toast(`${nPl(rows.length, "fila pegada", "filas pegadas")} en la hoja. Revíselas y guarde para aplicarlas.`);
  }
  // Eventos delegados: filtros de grupos y de gastos, resumen, hoja
  document.addEventListener("input", (e) => {
    const t = e.target; if (!t.closest) return;
    if (t.matches("[data-hq]")) { HOME.q = t.value; $("#groupCards").innerHTML = homeCards(); $("#hsum").innerHTML = homeSummary(); return; }
    if (t.matches("[data-gf]")) return gField(t);
    const f = t.closest("[data-f]"); if (f) { const g = curG(); if (!g) return; uiOf(g)[f.dataset.f] = f.value; const a = $("#expArea"); if (a) a.innerHTML = expArea(g); const c = $("#fClear"); if (c) c.innerHTML = clearBtn(uiOf(g)); }
  });
  document.addEventListener("change", (e) => {
    const t = e.target, g = curG(); if (!t.closest) return;
    if (t.matches("[data-gf]")) return gField(t);
    if (!g) return; const f = t.closest("[data-f]"); if (f) { uiOf(g)[f.dataset.f] = f.value; const a = $("#expArea"); if (a) a.innerHTML = expArea(g); const c = $("#fClear"); if (c) c.innerHTML = clearBtn(uiOf(g)); return; }
    const d = uiOf(g).dr;
    if (t.id === "gSelAll" && d) { if (t.checked) d.rows.forEach((x) => d.sel.add(x.key)); else d.sel.clear(); $$("#gtable [data-gsel]").forEach((c) => { c.checked = t.checked; c.closest("tr").classList.toggle("sel", t.checked); }); updateGUi(g); return; }
    if (t.dataset && t.dataset.gsel && d) { if (t.checked) d.sel.add(t.dataset.gsel); else d.sel.delete(t.dataset.gsel); t.closest("tr").classList.toggle("sel", t.checked); const all = $("#gSelAll"); if (all) all.checked = d.rows.every((x) => d.sel.has(x.key)); updateGUi(g); }
  });
  document.addEventListener("click", (e) => { const h = e.target.closest && e.target.closest("[data-hf]"); if (h) { HOME.st = h.dataset.hf; render(); } });
  document.addEventListener("toggle", (e) => { const d = e.target; if (!d.matches || !d.matches("details.acc")) return; const g = curG(); if (!g) return; const F = uiOf(g); if (d.open) F.open.add(d.dataset.who); else F.open.delete(d.dataset.who); }, true);
  document.addEventListener("keydown", (e) => {
    const t = e.target; if (!t.closest || !t.closest("#gtable")) return; const g = curG(); if (!g || !uiOf(g).dr) return; const d = uiOf(g).dr, tr = t.closest("tr"), col = t.dataset.gf; if (!col) return;
    const row = d.rows.find((x) => x.key === tr.dataset.key);
    if (e.key === "Enter" && t.tagName === "INPUT" && t.type !== "checkbox") { e.preventDefault(); if (col === "amount" && row && row.isNew && String(row.amount).trim()) return gAdd(); const nx = tr.nextElementSibling, f = nx && nx.querySelector(`[data-gf="${col}"]`); if (f) f.focus(); return; }
    if (e.key === "Escape" && row && row.orig) { row[col] = row.orig[col]; t.value = row[col]; return; }
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && t.tagName === "INPUT" && t.type === "text") { const sib = e.key === "ArrowDown" ? tr.nextElementSibling : tr.previousElementSibling, f = sib && sib.querySelector(`[data-gf="${col}"]`); if (f) { e.preventDefault(); f.focus(); } }
  });
  document.addEventListener("keydown", (e) => { const t = e.target; if (!t.closest || !t.closest(".tabsd") || !["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return; const l = [...$$(".tabsd a")], i = l.indexOf(t); if (i < 0) return; e.preventDefault(); l[e.key === "Home" ? 0 : e.key === "End" ? l.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + l.length) % l.length].focus(); });
  document.addEventListener("paste", (e) => { const t = e.target; if (!t.closest || !t.closest("#gtable")) return; const text = (e.clipboardData && e.clipboardData.getData("text")) || ""; if (!/[\n\t;]/.test(text.trim())) return; e.preventDefault(); gPaste(text); });

  function tabSaldos(g, r) {
    const mx = g.members.reduce((a, m) => { const b = r.balances[m.id]; const v = b < 0n ? -b : b; return v > a ? v : a; }, 0n);
    const pos = g.members.reduce((a, m) => (r.balances[m.id] > 0n ? a + r.balances[m.id] : a), 0n), neg = g.members.reduce((a, m) => (r.balances[m.id] < 0n ? a - r.balances[m.id] : a), 0n);
    const rows = g.members.map((m, i) => { const b = r.balances[m.id], v = b < 0n ? -b : b, w = mx ? Number((v * 100n) / mx) : 0; const txt = b > 0n ? `Le deben ${money(b, g)}` : b < 0n ? `Debe ${money(-b, g)}` : "Al día"; return `<div class="bal"><span class="av" aria-hidden="true">${esc(nm(m.id)[0])}</span><div><div class="t">${esc(nm(m.id))}${m.id === me() ? " (usted)" : ""}</div><div class="sub">#${i + 1} en el orden de ingreso · pagó ${money(r.paid[m.id], g)} · su parte ${money(r.shares[m.id], g)}</div><button class="btn small" data-act="who-filter" data-id="${m.id}" style="margin-top:.3rem">Ver sus gastos</button></div><div class="bw"><div class="t num ${b > 0n ? "pos" : b < 0n ? "neg" : "zero"}">${txt}</div><div class="bar" aria-hidden="true"><span class="l" style="width:${b < 0n ? w : 0}%"></span><span class="r" style="width:${b > 0n ? w : 0}%"></span></div></div></div>`; }).join("");
    const rest = r.extraUnits > 0n ? `<div class="notice">${ic("scale")}<div>Al repartir ${money(r.total, g)} entre ${g.members.length} personas sobran ${r.extraUnits} ${r.extraUnits === 1n ? "unidad mínima" : "unidades mínimas"} (${M.currency(g.currency).decimals ? "centavos" : "unidades"}). Se asignan de una en una a las primeras personas por orden de ingreso, así las partes suman <b>exactamente</b> el total y los saldos suman cero.</div></div>` : "";
    const sumB = g.members.reduce((a, m) => a + r.balances[m.id], 0n), sumShare = g.members.reduce((a, m) => a + r.shares[m.id], 0n);
    return `<div class="strip"><div><span class="small mut">Total de gastos</span><b class="num">${money(r.total, g)}</b></div><div><span class="small mut">Por recibir</span><b class="num pos">${money(pos, g)}</b></div><div><span class="small mut">Por pagar</span><b class="num neg">${money(neg, g)}</b></div></div><div class="card">${rows || '<div class="empty">Aún no hay personas.</div>'}<div class="totrow"><b>Totales</b><span>Total pagado <b class="num">${money(r.total, g)}</b></span><span>Parte asignada <b class="num">${money(sumShare, g)}</b></span><span>Saldo neto <b class="num">${money(sumB, g)}</b> ${sumB === 0n && sumShare === r.total ? `<span class="okchip">${ic("check")}Cuadra</span>` : '<span class="okchip bad">Revisar diferencia</span>'}</span></div><p class="small mut" style="margin:.6rem 0 0">El saldo es lo que pagó menos su parte; lo que unos deben es lo que otros reciben, por eso la suma es siempre cero.</p></div>${rest}`;
  }
  function explain(g, r, transfers, id) {
    const b = r.balances[id], inc = transfers.filter((t) => t.to === id), out = transfers.filter((t) => t.from === id);
    const head = `<span class="pwho"><span class="av" aria-hidden="true">${esc(nm(id)[0])}</span><span><b>${esc(nm(id))}${id === me() ? " (usted)" : ""}</b><small>${b > 0n ? "Por recibir" : b < 0n ? "Por aportar" : "Al día"}</small></span></span>`;
    const ok = `<span class="okchip">${ic("check")}${b === 0n ? "Sin diferencia" : "Cubierto"}</span>`;
    if (b === 0n) return `<details class="exp"><summary>${head}<span class="num">${money(0n, g)}</span>${ok}</summary><div class="expbody"><p>Pagó exactamente su parte asignada. No necesita transferir ni recibir dinero.</p></div></details>`;
    const list = b > 0n ? inc.map((t) => `<div><span>${esc(nm(t.from))} le transferiría</span><b class="num">${money(t.units, g)}</b></div>`) : out.map((t) => `<div><span>Transferiría a ${esc(nm(t.to))}</span><b class="num">${money(t.units, g)}</b></div>`);
    const tot = (b > 0n ? inc : out).reduce((a, t) => a + t.units, 0n);
    return `<details class="exp"><summary>${head}<span class="num ${b > 0n ? "pos" : "neg"}">${money(b < 0n ? -b : b, g)}</span>${ok}</summary><div class="expbody"><p>Pagó ${money(r.paid[id], g)} y su parte era ${money(r.shares[id], g)}. ${b > 0n ? "Debe recibir" : "Le falta aportar"} <b class="num">${money(b < 0n ? -b : b, g)}</b>.</p><div class="explist">${list.join("")}</div><div class="exptot"><span>${b > 0n ? "Total que recibiría" : "Total que aportaría"}</span><b class="num">${money(tot, g)}</b></div></div></details>`;
  }
  function tabLiquidar(g, transfers, r) {
    const title = g.closed ? "Liquidación (grupo cerrado)" : "Liquidación sugerida";
    if (!g.expenses.length) return `<div class="card empty"><b>Todavía no hay nada que liquidar</b>Cuando se registren gastos, aquí aparecerá quién le paga a quién.</div>`;
    if (!transfers.length) return `<div class="card empty"><b>Las cuentas están claras</b>Nadie le debe nada a nadie en este momento.</div>`;
    const tot = transfers.reduce((a, t) => a + t.units, 0n);
    return `<div class="liqgrid"><div><div class="tape"><h2><span>${title}</span><span class="num">${transfers.length} ${transfers.length === 1 ? "pago" : "pagos"}</span></h2>${transfers.map((t) => { const mine = t.from === me() || t.to === me(); const who = t.from === me() ? "Usted paga a" : t.to === me() ? `${esc(nm(t.from))} le paga a` : `${esc(nm(t.from))} paga a`; const to = t.to === me() ? "usted" : esc(nm(t.to)); return `<div class="pay ${mine ? "mine" : ""}"><span>${who} <b>${to}</b></span><span class="amt num">${money(t.units, g)}</span>${t.from === me() ? `<button class="btn small" data-act="copy-amt" data-v="${esc(dec(M.fromUnits(t.units, g.currency)))}">${ic("copy")}Copiar monto</button>` : ""}</div>`; }).join("")}<div class="sum"><span>Total que se mueve</span><span class="num">${money(tot, g, { code: true })}</span></div></div><p class="mut small" style="max-width:34rem">Balance no registra pagos: esta lista se recalcula con cada cambio y es la misma para todas las personas del grupo. Haga la transferencia por su banco o SINPE Móvil y avise al grupo.</p></div><section class="card"><h2>Por qué queda saldado</h2><p class="small mut">Comprobación persona por persona.</p>${g.members.map((m) => explain(g, r, transfers, m.id)).join("")}<p class="small mut" style="margin:.6rem 0 0">La suma que se propone aportar coincide con la que se propone recibir. Nadie aparece como pagado: son instrucciones sugeridas.</p></section></div>`;
  }
  function tabPersonas(g, admin) {
    const rows = g.members.map((m, i) => { const mine = m.id === me(); return `<li class="row"><span class="av" aria-hidden="true">${esc(nm(m.id)[0])}</span><div class="main"><b>${esc(nm(m.id))}${mine ? " (usted)" : ""}</b><span class="small mut">#${i + 1} · ${m.role === "admin" ? "Administra el grupo" : "Miembro"}${i === 0 ? " · se unió primero" : ""}</span></div><span class="acts"><button class="btn small" data-act="who-filter" data-id="${m.id}">Ver gastos</button>${admin && !mine ? `<button class="btn small" data-act="toggle-admin" data-id="${m.id}">${m.role === "admin" ? "Quitar administración" : "Nombrar administrador"}</button><button class="btn small danger" data-act="remove-p" data-id="${m.id}">Quitar</button>` : ""}${mine ? `<button class="btn small" data-act="leave">${ic("door")}Salir del grupo</button>` : ""}${admin && mine && m.role === "admin" ? `<button class="btn small" data-act="toggle-admin" data-id="${m.id}">Dejar la administración</button>` : ""}</span></li>`; }).join("");
    const join = admin ? `<div class="card"><h2>${ic("link")} Enlace y código de ingreso</h2><p class="small mut">Quien tenga una cuenta de Pastel con Balance puede entrar con el enlace y el código. No vencen: regenérelos si se filtran. Los miembros no ven esta sección.</p><div class="linkbox" id="jl">https://pastel.example/balance#/unirse/${esc(g.join.token)}</div><div class="codebox"><span class="cd num" aria-label="Código de ingreso ${esc(g.join.code.split("").join(" "))}">${esc(g.join.code)}</span><button class="btn small primary" data-act="copy-invite">${ic("copy")}Copiar enlace y código</button><button class="btn small" data-act="copy-link">${ic("copy")}Solo el enlace</button><button class="btn small" data-act="copy-code">${ic("copy")}Solo el código</button><button class="btn small danger" data-act="regen">Regenerar</button></div></div>` : `<div class="card"><h2>¿Necesita invitar a alguien?</h2><p class="small mut">Pida el enlace y el código a una persona que administre el grupo (${g.members.filter((m) => m.role === "admin").map((m) => esc(nm(m.id))).join(", ")}). Cada participante entra con su propia cuenta de Pastel.</p></div>`;
    return `<div class="card"><h2>Personas del grupo</h2><p class="small mut">${nPl(g.members.length, "persona", "personas")} con cuenta de Pastel, ${nPl(g.members.filter((m) => m.role === "admin").length, "administradora", "administradoras")}. El orden de ingreso decide a quién se asigna cada unidad mínima sobrante.</p><ul class="list">${rows}</ul></div>${join}`;
  }
  function help() {
    setTabs(null);
    const step = (n, t, p) => `<section class="card"><span class="stepn" aria-hidden="true">${n}</span><h2>${t}</h2><p class="small mut">${p}</p></section>`;
    $("#main").innerHTML = `<div class="head"><div><h1>¿Cómo funciona Balance?</h1><p class="mut">Gastos compartidos, cuentas claras y una propuesta sencilla para saldar diferencias.</p></div></div><div class="steps">${step(1, "Cree un grupo", "Elija una moneda y una zona horaria. Quien crea el grupo empieza como administrador. Todas las personas necesitan una cuenta de Pastel.")}${step(2, "Registre los gastos", "Anote qué se compró, cuánto costó, quién pagó y la fecha. Cada persona corrige o elimina los gastos que pagó; quien administra puede gestionar cualquiera, incluso en una hoja editable para cargar muchos de una vez.")}${step(3, "Revise los saldos", "Cada gasto se divide por igual entre todas las personas del grupo. Si alguien entra después, también participa en los gastos anteriores.")}${step(4, "Consulte la liquidación", "Balance sugiere quién le paga a quién. No envía dinero ni marca los pagos como hechos: usted transfiere por su banco o SINPE Móvil.")}</div><div class="card" style="margin-top:1rem"><h2>Principios importantes</h2><ul class="list"><li class="row"><div class="main"><b>La suma siempre coincide</b><span class="small mut">Las unidades mínimas sobrantes se reparten por orden de ingreso: las partes suman exacto el total y los saldos suman cero.</span></div></li><li class="row"><div class="main"><b>Sus grupos son privados</b><span class="small mut">Solo las personas del grupo ven sus datos y se necesita una sesión de Pastel.</span></div></li><li class="row"><div class="main"><b>Cerrar no elimina</b><span class="small mut">Un grupo cerrado queda en solo lectura y quien administra puede reabrirlo.</span></div></li></ul></div><p style="margin-top:1rem"><a class="btn primary" href="#/">Volver a mis grupos</a></p>`;
  }
  function tabAjustes(g) {
    return `<div class="card"><h2>Configuración del grupo</h2><div class="field"><label for="sName">Nombre</label><input id="sName" value="${esc(g.name)}" maxlength="200"><span class="err" id="sNameE" hidden></span></div><div class="field"><label for="sDesc">Descripción (opcional)</label><textarea id="sDesc" maxlength="500">${esc(g.description)}</textarea></div><div class="field"><label for="sTz">Zona horaria</label><select id="sTz">${D.ZONES.map(([z, l]) => `<option value="${z}" ${z === g.tz ? "selected" : ""}>${l} — ${z}</option>`).join("")}</select><span class="help">La fecha de «hoy» al registrar un gasto sale de esta zona.</span></div><button class="btn primary" data-act="save-settings" ${g.closed ? "disabled aria-disabled=true" : ""}>Guardar cambios</button>${g.closed ? '<p class="small mut">Reabra el grupo para cambiar su configuración.</p>' : ""}</div>
    <div class="card"><h2>Moneda</h2><p class="small mut">Cambiarla <b>no convierte</b> ningún monto: 10 EUR pasan a ser 10 USD. Sirve para corregir un error de captura.</p><div class="field"><label for="sCur">Moneda del grupo</label><select id="sCur">${curOptions(g.currency)}</select></div><button class="btn" data-act="change-cur" ${g.closed ? "disabled aria-disabled=true" : ""}>Cambiar moneda</button></div>
    <div class="card"><h2>Estado del grupo</h2>${g.closed ? '<p>Cerrado: solo lectura. Los saldos y la liquidación se siguen calculando.</p><button class="btn" data-act="reopen">Reabrir el grupo</button>' : '<p>Abierto. Al cerrarlo nadie puede registrar cambios, pero se puede reabrir cuando haga falta.</p><button class="btn" data-act="close">Cerrar el grupo</button>'} <button class="btn danger" data-act="del-group">Borrar el grupo</button><p class="small mut">Solo se puede borrar un grupo sin gastos.</p></div>
    <div class="card"><h2>Historial</h2><p class="small mut">Los últimos 25 cambios.</p><ul class="log">${g.audit.slice(0, 25).map((a) => `<li>${esc(a.at)} · ${esc(a.who)}: ${esc(a.what)}</li>`).join("")}</ul></div>`;
  }
  const curOptions = (sel) => { const F = D.FEATURED, all = M.CURRENCIES; const o = (c) => `<option value="${c.code}" ${c.code === sel ? "selected" : ""}>${c.code} · ${esc(c.symbol)} · ${esc(c.name)}</option>`; return `<optgroup label="Más usadas">${F.map((c) => o(M.currency(c))).join("")}</optgroup><optgroup label="Todas">${all.filter((c) => !F.includes(c.code)).sort((a, b) => a.name.localeCompare(b.name, "es")).map(o).join("")}</optgroup>`; };

  function newGroup() {
    $("#main").innerHTML = `<div class="head"><div><h1>Nuevo grupo</h1><p class="mut">Usted queda como persona administradora. Después comparte el enlace y el código.</p></div></div><div class="card" style="max-width:36rem"><div class="field"><label for="nName">Nombre del grupo</label><input id="nName" maxlength="200" placeholder="Ej.: Viaje a la playa" aria-describedby="nNameE" autocomplete="off"><span class="err" id="nNameE" hidden></span></div><div class="field"><label for="nDesc">Descripción (opcional)</label><textarea id="nDesc" maxlength="500"></textarea></div><div class="field"><label for="nCur">Moneda</label><select id="nCur">${curOptions("CRC")}</select><span class="help">Todos los gastos se registran en esta moneda. Se muestra el código junto al símbolo porque varios países usan «$».</span></div><div class="field"><label for="nTz">Zona horaria</label><select id="nTz">${D.ZONES.map(([z, l]) => `<option value="${z}">${l} — ${z}</option>`).join("")}</select></div><button class="btn primary" data-act="create-group">Crear grupo</button> <a class="btn" href="#/">Cancelar</a></div>`;
    setTabs(null);
  }
  function join(token) {
    setTabs(null); const s = sess(); const known = groups.find((g) => g.join.token === token);
    if (!s.session) return gate("", "Para entrar a un grupo necesita una cuenta", "Le invitaron a un grupo de gastos compartidos en Balance, una aplicación de Pastel.", `<ol><li><b>Regístrese</b> en Pastel con su cuenta de Google.</li><li><b>Marque la aplicación Balance</b> al registrarse.</li><li>Vuelva a este enlace y escriba el código de 4 dígitos que le dio quien lo invitó.</li></ol>`, '<button class="btn primary" data-act="signup">Crear mi cuenta</button><button class="btn" data-act="login-join">Ya tengo cuenta</button>', "Esta misma página aparece para cualquier enlace, válido o no: no revela si el grupo existe");
    if (!s.access) return gate("", "Su cuenta todavía no tiene acceso a Balance", "Para entrar a un grupo necesita la aplicación Balance en su cuenta de Pastel.", "", '<button class="btn" data-act="back-apps">Volver a mis aplicaciones</button>', "Con sesión pero sin balance.access · el servidor responde 403");
    if (known && known.members.some((m) => m.id === me())) return go("#/g/" + known.id);
    $("#main").innerHTML = `<section class="card gate"><h1>Entrar al grupo</h1><p>Escriba el código de 4 dígitos que le compartió quien administra el grupo.</p><div class="field"><label for="jCode">Código de ingreso</label><input id="jCode" class="joininput num" inputmode="numeric" maxlength="4" autocomplete="one-time-code" aria-describedby="jErr"><span class="err" id="jErr" role="alert" hidden></span></div><button class="btn primary" data-act="join-go" data-token="${esc(token)}">Entrar al grupo</button> <a class="btn" href="#/">Cancelar</a><span class="code">Hasta 5 intentos fallidos por cuenta; después hay una pausa de 15 minutos.</span></section>`;
  }

  // ── Formularios y acciones ──
  function expenseForm(g, e) {
    const admin = roleIn(g) === "admin", d0 = M.currency(g.currency).decimals; const payers = admin ? g.members : g.members.filter((m) => m.id === me());
    const val = e ? dec(e.amount) : ""; const date = e ? e.date : M.todayInZone(g.tz);
    dlg(`<h2 id="mt">${e ? "Editar gasto" : "Registrar gasto"}</h2><div class="field"><label for="xDesc">¿En qué se gastó?</label><input id="xDesc" maxlength="500" value="${esc(e ? e.description : "")}" placeholder="Ej.: Peajes de ida" aria-describedby="xDescE" autocomplete="off"><span class="err" id="xDescE" hidden></span></div>
    <div class="field"><label for="xAmt">Monto</label><div class="with-suffix"><input id="xAmt" inputmode="${d0 ? "decimal" : "numeric"}" value="${esc(val)}" aria-describedby="xAmtH xAmtE" autocomplete="off"><span>${g.currency}</span></div><span class="help" id="xAmtH">${d0 ? "Esta moneda no tiene decimales." : "Puede usar coma o punto para los decimales: 12,50."}</span><span class="err" id="xAmtE" hidden></span></div>
    <div class="field"><label for="xPay">Pagó</label><select id="xPay" ${admin && !(e && roleIn(g) !== "admin") ? "" : "disabled"}>${payers.map((m) => `<option value="${m.id}" ${(e ? e.payerId : me()) === m.id ? "selected" : ""}>${esc(nm(m.id))}${m.id === me() ? " (usted)" : ""}</option>`).join("")}</select>${admin ? "" : '<span class="help">Usted solo puede registrar gastos pagados por usted. Para registrar uno a nombre de otra persona, pídalo a quien administra el grupo.</span>'}</div>
    <div class="field"><label for="xDate">Fecha del gasto</label><input id="xDate" type="date" value="${date}" aria-describedby="xDateE"><span class="err" id="xDateE" hidden></span></div><div class="err" id="xTop" role="alert" hidden></div>
    <div class="btns"><button class="btn" data-x="cancel">Cancelar</button><button class="btn primary" data-x="save">${e ? "Guardar cambios" : "Registrar gasto"}</button></div>`);
    const setE = (id, msg, inp) => { const el = $("#" + id); el.hidden = !msg; el.innerHTML = msg ? ic("alert") + esc(msg) : ""; if (inp) { $("#" + inp).setAttribute("aria-invalid", String(!!msg)); } };
    $("#dlg [data-x=cancel]").onclick = closeDlg;
    $("#dlg [data-x=save]").onclick = () => {
      const desc = $("#xDesc").value.trim(), amt = M.parseInput($("#xAmt").value, g.currency), dt = $("#xDate").value, payer = $("#xPay").value; let bad = false;
      if (desc.length < 4 || desc.length > 500) { setE("xDescE", "La descripción debe tener entre 4 y 500 caracteres.", "xDesc"); bad = true; } else setE("xDescE", "", "xDesc");
      if (!amt.ok) { setE("xAmtE", amt.message, "xAmt"); bad = true; } else setE("xAmtE", "", "xAmt");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dt) || Number.isNaN(Date.parse(dt))) { setE("xDateE", "Elija una fecha válida.", "xDate"); bad = true; } else setE("xDateE", "", "xDate");
      if (bad) return;
      const act = e ? "edit_expense" : "add_expense"; let res = R.can(act, ctx(g, { expense: e, payerId: payer })); if (res.allowed && e && payer !== e.payerId) res = R.can("change_payer", ctx(g));
      if (!res.allowed) { const t = $("#xTop"); t.hidden = false; t.innerHTML = ic("alert") + esc(res.reason + " " + res.who); return; }
      if (e) { Object.assign(e, { description: desc, amount: amt.value, date: dt, payerId: payer }); audit(g, `Modificó el gasto «${desc}»`); } else { g.expenses.push({ id: "e" + nextId++, description: desc, amount: amt.value, date: dt, payerId: payer }); audit(g, `Registró el gasto «${desc}»`); }
      closeDlg(); render(); toast(e ? "Gasto actualizado" : "Gasto registrado");
    };
  }
  function act(a, el) {
    const r = route(), g = r.k === "g" ? byId(r.id) : null, id = el && el.dataset.id;
    switch (a) {
      case "login": DevKit.setRole("admin"); break;
      case "login-join": DevKit.setRole("nueva"); break;
      case "signup": toast("En Pastel este botón lleva al registro; al terminar vuelve aquí para escribir el código."); break;
      case "back-apps": toast("En Pastel este botón lleva a sus aplicaciones."); break;
      case "have-link": dlg(`<h2 id="mt">Tengo un enlace</h2><div class="field"><label for="lk">Pegue el enlace de ingreso</label><input id="lk" placeholder="https://…/unirse/…"></div><div class="btns"><button class="btn" data-x="cancel">Cancelar</button><button class="btn primary" data-x="ok">Continuar</button></div>`); $("#dlg [data-x=cancel]").onclick = closeDlg; $("#dlg [data-x=ok]").onclick = () => { const m = /unirse\/([^/?#\s]+)/.exec($("#lk").value); closeDlg(); go("#/unirse/" + (m ? m[1] : "enlace-invalido")); }; break;
      case "add-exp": if (g) expenseForm(g); break;
      case "clear-filters": { const F = uiOf(g); Object.assign(F, { q: "", who: "", from: "", to: "" }); render(); break; }
      case "clear-home": Object.assign(HOME, { q: "", st: "all" }); render(); break;
      case "who-filter": { const F = uiOf(g); Object.assign(F, { q: "", from: "", to: "", who: id }); go("#/g/" + g.id + "/gastos"); break; }
      case "g-add": gAdd(); break;
      case "g-rm": gRemove([el.dataset.k]); break;
      case "g-rm-sel": gRemove([...uiOf(g).dr.sel]); break;
      case "g-save": gSave(); break;
      case "g-discard": confirmDlg({ title: "¿Descartar los cambios?", body: "<p>Se recuperan los gastos guardados y se pierde lo que no guardó.</p>", ok: "Descartar cambios", danger: true, onOk: () => { uiOf(g).dr = null; render(); toast("Cambios descartados"); } }); break;
      case "copy-invite": copy(`Enlace para unirse a ${g.name}: ${$("#jl").textContent}\nCódigo: ${g.join.code}`, "Enlace y código"); break;
      case "toast-undo": { const f = toastFn; toastFn = null; $("#toast").hidden = true; if (f) f(); break; }
      case "edit-exp": expenseForm(g, g.expenses.find((x) => x.id === id)); break;
      case "del-exp": { const e = g.expenses.find((x) => x.id === id), res = R.can("delete_expense", ctx(g, { expense: e })); if (!res.allowed) return denyDlg(res); confirmDlg({ title: "¿Eliminar este gasto?", body: `<p>«${esc(e.description)}» por ${money(M.toUnits(e.amount, g.currency), g)}. Los saldos se recalculan.</p>`, ok: "Eliminar gasto", danger: true, onOk: () => { g.expenses = g.expenses.filter((x) => x.id !== id); audit(g, `Eliminó el gasto «${e.description}»`); render(); toast("Gasto eliminado"); } }); break; }
      case "copy-amt": copy(el.dataset.v, "Monto"); break;
      case "copy-link": copy($("#jl").textContent, "Enlace"); break;
      case "copy-code": copy(g.join.code, "Código"); break;
      case "regen": { const res = R.can("regenerate_join", ctx(g)); if (!res.allowed) return denyDlg(res); confirmDlg({ title: "¿Regenerar el enlace y el código?", body: "<p>Los anteriores dejan de servir. Quien ya está en el grupo no se ve afectado.</p>", ok: "Regenerar", onOk: () => { g.join = { token: "g-" + R.randomToken().slice(0, 16), code: R.randomCode() }; audit(g, "Regeneró el enlace y el código de ingreso"); render(); toast("Enlace y código nuevos"); } }); break; }
      case "toggle-admin": { const t = g.members.find((m) => m.id === id), res = t.role === "admin" ? R.can("manage_admins", ctx(g, { targetId: id })) : R.can("manage_admins", ctx(g, { targetId: id })); if (!res.allowed) return denyDlg(res); t.role = t.role === "admin" ? "member" : "admin"; audit(g, `${t.role === "admin" ? "Nombró administrador a" : "Quitó la administración a"} ${nm(id)}`); render(); toast("Listo"); break; }
      case "remove-p": { const res = R.can("remove_participant", ctx(g, { targetId: id })); if (!res.allowed) return denyDlg(res); confirmDlg({ title: `¿Quitar a ${nm(id)} del grupo?`, body: "<p>Como no tiene gastos, el reparto se recalcula entre las personas que quedan.</p>", ok: "Quitar", danger: true, onOk: () => { g.members = g.members.filter((m) => m.id !== id); audit(g, `Quitó a ${nm(id)} del grupo`); render(); toast("Persona quitada"); } }); break; }
      case "leave": { const res = R.can("leave_group", ctx(g)); if (!res.allowed) return denyDlg(res); confirmDlg({ title: "¿Salir del grupo?", body: "<p>Perderá el acceso. Podrá volver a entrar con el enlace y el código vigentes, al final del orden de ingreso.</p>", ok: "Salir del grupo", danger: true, onOk: () => { g.members = g.members.filter((m) => m.id !== me()); audit(g, `${nm(me())} salió del grupo`); go("#/"); toast("Salió del grupo"); } }); break; }
      case "close": case "reopen": { const k = a === "close" ? "close_group" : "reopen_group", res = R.can(k, ctx(g)); if (!res.allowed) return denyDlg(res); confirmDlg({ title: a === "close" ? "¿Cerrar el grupo?" : "¿Reabrir el grupo?", body: a === "close" ? "<p>Nadie podrá registrar cambios, pero los saldos y la liquidación se siguen viendo. Puede reabrirlo cuando quiera.</p>" : "<p>Vuelven a permitirse los cambios y los saldos y la liquidación se recalculan.</p>", ok: a === "close" ? "Cerrar grupo" : "Reabrir grupo", onOk: () => { g.closed = a === "close"; audit(g, a === "close" ? "Cerró el grupo" : "Reabrió el grupo"); render(); toast(a === "close" ? "Grupo cerrado" : "Grupo reabierto"); } }); break; }
      case "del-group": { const res = R.can("delete_group", ctx(g)); if (!res.allowed) return denyDlg(res); confirmDlg({ title: "¿Borrar el grupo?", body: "<p>Se eliminan sus participantes, su enlace y su código. No se puede deshacer.</p>", ok: "Borrar grupo", danger: true, onOk: () => { groups = groups.filter((x) => x.id !== g.id); go("#/"); toast("Grupo borrado"); } }); break; }
      case "save-settings": { const name = $("#sName").value.trim(); if (!name) { const e = $("#sNameE"); e.hidden = false; e.innerHTML = ic("alert") + "Escriba un nombre para el grupo."; return; } const res = R.can("edit_settings", ctx(g)); if (!res.allowed) return denyDlg(res); g.name = name; g.description = $("#sDesc").value.trim(); g.tz = $("#sTz").value; audit(g, "Cambió la configuración"); render(); toast("Cambios guardados"); break; }
      case "change-cur": { const to = $("#sCur").value; if (to === g.currency) return toast("Ese ya es la moneda del grupo"); const res = R.can("change_currency", ctx(g)); if (!res.allowed) return denyDlg(res); const chk = M.canChangeCurrency(g.expenses.map((x) => x.amount), to); if (!chk.ok) return denyDlg({ status: 409, code: chk.code, reason: chk.message, who: "Corrija los montos con decimales o elija otra moneda." }); confirmDlg({ title: `¿Cambiar la moneda a ${to}?`, body: `<p><b>No se convierte ningún monto.</b> Por ejemplo, ${money(100n * 10n ** BigInt(M.currency(g.currency).decimals), g, { code: true })} pasarán a ser ${M.format(100n * 10n ** BigInt(M.currency(to).decimals), to, { code: true })}. Las partes y los saldos se recalculan.</p>`, ok: "Cambiar moneda", onOk: () => { const old = g.currency; g.currency = to; audit(g, `Cambió la moneda de ${old} a ${to} (sin conversión, ${g.expenses.length} gastos)`); render(); toast("Moneda cambiada"); } }); break; }
      case "create-group": { const name = $("#nName").value.trim(); const e = $("#nNameE"); if (!name) { e.hidden = false; e.innerHTML = ic("alert") + "Escriba un nombre para el grupo."; $("#nName").setAttribute("aria-invalid", "true"); return; } const ng = { id: "g" + nextId++, name, description: $("#nDesc").value.trim(), currency: $("#nCur").value, tz: $("#nTz").value, closed: false, members: [{ id: me(), role: "admin" }], expenses: [], join: { token: "g-" + R.randomToken().slice(0, 16), code: R.randomCode() }, audit: [] }; audit(ng, "Creó el grupo"); groups.push(ng); go("#/g/" + ng.id + "/personas"); toast("Grupo creado: comparta el enlace y el código"); break; }
      case "join-go": { const code = $("#jCode").value.trim(), res = guard.attempt({ accountId: me(), groups, token: el.dataset.token, code }), e = $("#jErr"); if (!res.ok) { e.hidden = false; e.innerHTML = ic("alert") + esc(res.status === 429 ? `${res.message} Faltan unos ${Math.ceil(res.retryAfterSec / 60)} minutos.` : res.message); $("#jCode").setAttribute("aria-invalid", "true"); return; } res.group.members.push({ id: me(), role: "member" }); audit(res.group, `${nm(me())} ingresó con el enlace y el código`); go("#/g/" + res.group.id); toast("Ya forma parte del grupo"); break; }
    }
  }
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-act]"); if (b) { e.preventDefault(); act(b.dataset.act, b); return; } const sz = e.target.closest("[data-sz]"); if (sz) { document.documentElement.style.setProperty("--fs", ["16px", "18.4px", "20.8px"][sz.dataset.sz]); $$("[data-sz]").forEach((x) => x.setAttribute("aria-pressed", String(x === sz))); } });
  document.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.id === "jCode") { const b = $("[data-act=join-go]"); if (b) b.click(); } });

  function render() {
    const s = sess(), r = route(); $("#fab") && $("#fab").remove(); renderSide();
    if (r.k === "join") return join(r.token);
    setTabs(null);
    if (!s.session) return gate("", "Inicie sesión para ver sus grupos", "Balance guarda sus grupos y gastos en su cuenta de Pastel, así que solo los ve quien forma parte de cada grupo.", "", LOGIN, "Sin sesión · el servidor responde 401");
    if (!s.access) return gate("", "Su cuenta todavía no tiene acceso a Balance", "Balance es una de las aplicaciones de Pastel y el acceso lo concede quien administra su cuenta.", '<p class="notice"><b>A quién pedirlo:&nbsp;</b> a la persona que administra su espacio de Pastel. Dígale que necesita el acceso a Balance.</p>', '<button class="btn" data-act="back-apps">Volver a mis aplicaciones</button>', "Con sesión pero sin el permiso balance.access · el servidor responde 403");
    if (r.k === "help") return help();
    if (r.k === "new") return newGroup();
    if (r.k === "g") { const g = byId(r.id); const v = R.can("view", ctx(g)); if (!v.allowed) return noGroup(); return group(g, ["resumen", "gastos", "saldos", "liquidar", "personas", "gestion", "ajustes"].includes(r.tab) ? r.tab : "resumen"); }
    home();
  }
  const renderAndRemember = () => { render(); lastHash = location.hash; };
  addEventListener("hashchange", () => {
    if (ignoreHash) { ignoreHash = false; return; }
    const x = dirtyGroup(), target = location.hash;
    if (x && target !== "#/g/" + x.k + "/gestion") { ignoreHash = true; location.hash = lastHash; openUnsaved(target); return; }
    renderAndRemember();
  });
  DevKit.init({ app: "balance", role: "admin", onRole: (id) => { roleId = id; Object.keys(UI).forEach((k) => delete UI[k]); HOME.q = ""; HOME.st = "all"; if (id === "invitada") location.hash = "#/unirse/" + groups[0].join.token; else if (route().k === "join" && D.ROLES[id].session === false && id !== "invitada") { /* se queda en el ingreso */ } render(); }, roles: [
    { id: "admin", label: "Ana · administra el paseo", desc: "Ve todo, ve el enlace y el código, edita la configuración, cierra y reabre, nombra administradores." },
    { id: "member", label: "Beto · miembro del paseo", desc: "Registra solo gastos que él pagó; ve todo; no ve el enlace, el código ni los ajustes del paseo." },
    { id: "nueva", label: "Marcos · con acceso, sin grupos", desc: "Estado vacío. Para ingresar: #/unirse/paseo-7k3m9xq2 con el código 4821 (tras 5 fallos, pausa de 15 min)." },
    { id: "invitada", label: "Invitada sin cuenta (abre el enlace)", desc: "Ve la página informativa: registrarse y marcar Balance. Es la misma para cualquier enlace." },
    { id: "noaccess", label: "Con sesión, sin acceso a Balance", desc: "Ve por qué no entra y a quién pedirlo (403)." },
    { id: "anon", label: "Sin sesión", desc: "Se le pide iniciar sesión (401)." }] });
  const rp = new URLSearchParams(location.search); if (rp.get("view") === "liquidar" || rp.get("g")) { go("#/g/" + (rp.get("g") || "g1") + "/" + (rp.get("view") || "resumen")); }
  renderAndRemember();
})();
