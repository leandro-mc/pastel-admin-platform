/* Balance · prototipo v3 (diseño nuevo). Datos FICTICIOS en memoria (recargar los restablece). Dinero: money.js (D1, D2, D4, D8). Acceso: rules.js (D3, D7).
   Lo que la persona no puede hacer NO se muestra; lo que se ve pero se deniega explica el porqué y a quién pedirlo. Textos de usted (regla de Pastel). */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const M = window.BalanceMoney, R = window.BalanceRules, D = window.BALANCE_DATA;
  const I = { groups: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>', coins: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>', scale: '<path d="M12 3v18M5 21h14M4 7h16M7 7l-3 7a3 3 0 0 0 6 0zM17 7l-3 7a3 3 0 0 0 6 0z"/>', receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6M16 5a3.5 3.5 0 0 1 0 7M18 14c2.5.5 4 2.5 4 6"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>', plus: '<path d="M12 5v14M5 12h14"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/>', check: '<path d="M5 12l5 5L20 7"/>', lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', alert: '<path d="M12 3l10 18H2zM12 10v5M12 18h.01"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', pencil: '<path d="M4 20l1-4L16 5l3 3L8 19z"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', door: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h8M10 12h11M18 8l4 4-4 4"/>', open: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>' };
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
  const route = () => { const h = location.hash.replace(/^#\/?/, "").split("/"); if (h[0] === "g") return { k: "g", id: h[1], tab: h[2] || "gastos" }; if (h[0] === "nuevo") return { k: "new" }; if (h[0] === "unirse") return { k: "join", token: h[1] || "" }; return { k: "home" }; };
  const go = (h) => { if (location.hash === h) render(); else location.hash = h; };

  // ── Infraestructura: toast, diálogos ──
  let tt, toastFn = null; const toast = (m, a) => { const t = $("#toast"); t.innerHTML = `<span>${esc(m)}</span>` + (a ? ` <button class="btn small" data-act="toast-undo">${esc(a.label)}</button>` : ""); toastFn = a ? a.fn : null; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => { t.hidden = true; toastFn = null; }, a ? 9000 : 3200); };
  const closeDlg = () => { $("#dlg").innerHTML = ""; if (lastFocus && lastFocus.focus) lastFocus.focus(); };
  const dlg = (html) => { lastFocus = document.activeElement; $("#dlg").innerHTML = `<div class="back" id="back"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="mt">${html}</section></div>`; const f = $("#dlg input,#dlg select,#dlg textarea,#dlg button"); if (f) f.focus(); };
  const confirmDlg = ({ title, body, ok, danger, onOk }) => { dlg(`<h2 id="mt">${esc(title)}</h2><div>${body}</div><div class="btns"><button class="btn" data-x="cancel">Cancelar</button><button class="btn ${danger ? "danger" : "primary"}" data-x="ok">${esc(ok)}</button></div>`); $("#dlg [data-x=ok]").onclick = () => { closeDlg(); onOk(); }; $("#dlg [data-x=cancel]").onclick = closeDlg; };
  const denyDlg = (r) => { dlg(`<h2 id="mt">${r.status === 403 ? "Sin permiso" : r.status === 404 ? "No encontrado" : "No se puede hacer todavía"}</h2><p>${esc(r.reason)}</p>${r.who ? `<p class="mut"><b>Qué hacer:</b> ${esc(r.who)}</p>` : ""}<p class="mut small">Código: ${esc(r.code)} · estado ${r.status}</p><div class="btns"><button class="btn primary" data-x="cancel">Entendido</button></div>`); $("#dlg [data-x=cancel]").onclick = closeDlg; };
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("#dlg .back")) closeDlg(); });
  document.addEventListener("click", (e) => { if (e.target.id === "back") closeDlg(); });
  const copy = (text, what) => { try { navigator.clipboard.writeText(text).then(() => toast(what + " copiado"), () => toast("No se pudo copiar; seleccione el texto")); } catch (e) { toast("No se pudo copiar; seleccione el texto"); } };

  // ── Vistas ──
  function gate(kind, title, body, steps, btns, code) { $("#main").innerHTML = `<section class="card gate" ${kind === "bad" ? 'role="alert"' : ""}><h1>${title}</h1><p>${body}</p>${steps || ""}<div class="btns">${btns}</div><span class="code">${code}</span></section>`; }
  const LOGIN = '<button class="btn primary" data-act="login">Iniciar sesión con Google</button>';

  function renderSide() {
    const gs = myGroups(), r = route();
    $("#side").innerHTML = !sess().session || !sess().access ? "" : `<h2>Sus grupos</h2>${gs.map((g) => `<a href="#/g/${g.id}" ${r.k === "g" && r.id === g.id ? 'aria-current="page"' : ""}>${ic("coins")}<span>${esc(g.name)}<span class="sub">${g.closed ? "Cerrado" : "Abierto"} · ${g.members.length} personas</span></span></a>`).join("") || '<p class="small mut" style="padding:0 .8rem">Todavía ninguno.</p>'}<hr><a href="#/nuevo" ${r.k === "new" ? 'aria-current="page"' : ""}>${ic("plus")}Nuevo grupo</a><a href="#" data-act="have-link">${ic("link")}Tengo un enlace</a>`;
    $("#who").textContent = me() && sess().session ? "Sesión de " + nm(me()) : "Sin sesión";
  }
  function setTabs(g, tab) {
    const el = $("#tabs"); if (!g) { el.hidden = true; $("#fab") && $("#fab").remove(); return; }
    const admin = roleIn(g) === "admin", T = [["gastos", "Gastos", "receipt"], ["saldos", "Saldos", "scale"], ["liquidar", "Liquidar", "coins"], ["personas", "Personas", "users"]]; if (admin) T.push(["ajustes", "Ajustes", "gear"]);
    el.style.gridTemplateColumns = `repeat(${T.length},1fr)`; el.hidden = false; el.innerHTML = T.map(([k, l, i]) => `<a href="#/g/${g.id}/${k}" ${tab === k ? 'aria-current="page"' : ""}>${ic(i)}${l}</a>`).join("");
    return T;
  }
  function home() {
    const gs = myGroups();
    $("#main").innerHTML = `<div class="head"><div><h1>Sus grupos</h1><p class="mut">Cuentas claras con quienes comparte gastos.</p></div><div class="acts"><a class="btn" href="#" data-act="have-link">${ic("link")}Tengo un enlace</a><a class="btn primary" href="#/nuevo">${ic("plus")}Nuevo grupo</a></div></div>` +
      (gs.length ? `<div class="gcards">${gs.map((g) => { const { r } = calc(g), b = r.balances[me()]; const st = b > 0n ? `<span class="st pos">Le deben ${money(b, g)}</span>` : b < 0n ? `<span class="st neg">Usted debe ${money(-b, g)}</span>` : '<span class="st zero">Está al día</span>'; return `<a class="card gcard" href="#/g/${g.id}"><h2>${esc(g.name)}</h2><p class="mut small">${esc(g.description)}</p><div><span class="chip ${g.closed ? "closed" : "open"}">${ic(g.closed ? "lock" : "open")}${g.closed ? "Cerrado" : "Abierto"}</span> <span class="chip">${g.currency}</span> <span class="chip">${g.members.length} personas</span></div>${st}</a>`; }).join("")}</div>` :
        `<div class="card empty"><b>Todavía no está en ningún grupo</b>Cree uno para registrar gastos con su gente, o abra el enlace que le enviaron.<div><a class="btn primary" href="#/nuevo">${ic("plus")}Crear mi primer grupo</a> <a class="btn" href="#" data-act="have-link">${ic("link")}Tengo un enlace</a></div></div>`);
  }
  function noGroup() { gate("", "No encontramos ese grupo", "Puede que el enlace ya no sirva o que usted no forme parte de ese grupo.", "", '<a class="btn primary" href="#/">Ver mis grupos</a>', "Para una persona que no es miembro, el grupo «no existe» (404)"); }

  function heroHtml(g) {
    const { r } = calc(g), mineB = r.balances[me()] || 0n;
    return `<div class="hero ${mineB < 0n ? "owe" : mineB === 0n ? "even" : ""}"><div><div class="lbl">Su situación en este grupo</div><div class="big num ${mineB > 0n ? "pos" : mineB < 0n ? "neg" : "zero"}">${mineB > 0n ? "Le deben " + money(mineB, g) : mineB < 0n ? "Usted debe " + money(-mineB, g) : "Está al día"}</div></div><div class="tot"><div><div class="lbl">Total del grupo</div><b class="num">${money(r.total, g)}</b></div><div><div class="lbl">Su parte</div><b class="num">${money(r.shares[me()] || 0n, g)}</b></div><div><div class="lbl">Usted pagó</div><b class="num">${money(r.paid[me()] || 0n, g)}</b></div></div></div>`;
  }
  function group(g, tab) {
    const rl = roleIn(g), admin = rl === "admin"; const { r, transfers } = calc(g); const total = r.total; const mineB = r.balances[me()] || 0n;
    const canAdd = R.can("add_expense", ctx(g, { payerId: me() })).allowed;
    const hero = heroHtml(g);
    const tabs = [["gastos", "Gastos"], ["saldos", "Saldos"], ["liquidar", g.closed ? "Liquidación" : "Liquidar"], ["personas", "Personas"]]; if (admin) tabs.push(["ajustes", "Ajustes"]);
    let body = "";
    if (tab === "gastos") body = tabGastos(g, canAdd); else if (tab === "saldos") body = tabSaldos(g, r); else if (tab === "liquidar") body = tabLiquidar(g, transfers, r); else if (tab === "personas") body = tabPersonas(g, admin); else if (tab === "ajustes") body = admin ? tabAjustes(g) : noPerm(g);
    $("#main").innerHTML = `<div class="head"><div><h1>${esc(g.name)}</h1><div class="meta"><span class="chip ${g.closed ? "closed" : "open"}">${ic(g.closed ? "lock" : "open")}${g.closed ? "Cerrado" : "Abierto"}</span><span class="chip" title="${esc(M.currency(g.currency).name)}">${g.currency} · ${esc(M.currency(g.currency).symbol)}</span><span class="chip">${g.members.length} personas</span><span class="chip">${admin ? "Usted administra" : "Usted es miembro"}</span></div>${g.description ? `<p class="mut small" style="margin:.5rem 0 0">${esc(g.description)}</p>` : ""}</div>${canAdd ? `<div class="acts add-acts"><button class="btn primary" data-act="add-exp">${ic("plus")}Registrar gasto</button></div>` : ""}</div>${hero}<nav class="tabsd" aria-label="Secciones del grupo">${tabs.map(([k, l]) => `<a href="#/g/${g.id}/${k}" ${tab === k ? 'aria-current="page"' : ""}>${l}</a>`).join("")}</nav>${body}`;
    setTabs(g, tab); if (canAdd) { const f = document.createElement("button"); f.id = "fab"; f.className = "btn primary fab"; f.dataset.act = "add-exp"; f.innerHTML = ic("plus") + "Registrar gasto"; document.body.appendChild(f); }
  }
  function noPerm(g) { return `<div class="card gate"><h2>Sin permiso</h2><p>${esc("Los ajustes del grupo los cambia quien lo administra.")}</p><p class="mut"><b>Qué hacer:</b> pídale a alguien que administre el grupo (${g.members.filter((m) => m.role === "admin").map((m) => esc(nm(m.id))).join(", ")}) que haga el cambio.</p><span class="code mut small">El servidor responde 403 · balance.forbidden</span></div>`; }

  // ── Gastos: filtros, lista y hoja de gastos (administración) ──
  const UI = {}; const uiOf = (g) => UI[g.id] || (UI[g.id] = { q: "", who: "", from: "", to: "", sort: "date-desc", view: "list", sel: new Set(), draft: null });
  const normT = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const idn = (e) => parseInt(String(e.id).slice(1), 10) || 0;
  const SORTS = { "date-desc": (a, b) => b.date.localeCompare(a.date) || idn(b) - idn(a), "date-asc": (a, b) => a.date.localeCompare(b.date) || idn(a) - idn(b), reg: (a, b) => idn(a) - idn(b) };
  const SORT_LABEL = { "date-desc": "Fecha (reciente primero)", "date-asc": "Fecha (antigua primero)", "amt-desc": "Monto (mayor primero)", "amt-asc": "Monto (menor primero)", reg: "Orden de registro" };
  const curG = () => byId(route().id);
  const units = (e, g) => M.toUnits(e.amount, g.currency);
  function filtered(g) {
    const F = uiOf(g), q = normT(F.q); const sorter = F.sort === "amt-desc" ? (a, b) => (units(b, g) > units(a, g) ? 1 : units(b, g) < units(a, g) ? -1 : 0) : F.sort === "amt-asc" ? (a, b) => (units(a, g) > units(b, g) ? 1 : units(a, g) < units(b, g) ? -1 : 0) : SORTS[F.sort];
    return g.expenses.filter((e) => (!F.who || e.payerId === F.who) && (!F.from || e.date >= F.from) && (!F.to || e.date <= F.to) && (!q || normT(e.description).includes(q))).sort(sorter);
  }
  const clearBtn = (F) => (filtersActive(F) ? '<button class="btn small" data-act="clear-filters">Limpiar filtros</button>' : "");
  const sumU = (ex, g) => ex.reduce((a, e) => a + units(e, g), 0n);
  const filtersActive = (F) => !!(F.q || F.who || F.from || F.to);
  function summaryText(g, ex) {
    const F = uiOf(g), total = sumU(g.expenses, g), shown = sumU(ex, g);
    let t = `Mostrando ${ex.length} de ${g.expenses.length} gastos · suma ${money(shown, g)}`;
    if (F.who) t += ` · ${nm(F.who)} pagó ${money(sumU(g.expenses.filter((e) => e.payerId === F.who), g), g)} de ${money(total, g)} en total`;
    return t;
  }
  function filtersBar(g) {
    const F = uiOf(g);
    return `<div class="filters" role="search" aria-label="Filtrar gastos"><div class="field"><label for="fQ">Buscar</label><input id="fQ" data-f="q" value="${esc(F.q)}" placeholder="Descripción…" autocomplete="off"></div><div class="field"><label for="fWho">Pagó</label><select id="fWho" data-f="who"><option value="">Todas</option>${g.members.map((m) => `<option value="${m.id}" ${F.who === m.id ? "selected" : ""}>${esc(nm(m.id))}${m.id === me() ? " (usted)" : ""}</option>`).join("")}</select></div><div class="field"><label for="fFrom">Desde</label><input id="fFrom" type="date" data-f="from" value="${F.from}"></div><div class="field"><label for="fTo">Hasta</label><input id="fTo" type="date" data-f="to" value="${F.to}"></div><div class="field"><label for="fSort">Ordenar</label><select id="fSort" data-f="sort">${Object.entries(SORT_LABEL).map(([k, l]) => `<option value="${k}" ${F.sort === k ? "selected" : ""}>${l}</option>`).join("")}</select></div><span id="fClear" style="align-self:end;margin-bottom:.9rem">${clearBtn(F)}</span></div><p class="small mut" id="fSummary" aria-live="polite">${esc(summaryText(g, filtered(g)))}</p>`;
  }
  const sheetOn = (g) => roleIn(g) === "admin" && !g.closed && uiOf(g).view === "sheet";
  function expArea(g) {
    const ex = filtered(g); const F = uiOf(g);
    const sum = $("#fSummary"); if (sum) sum.textContent = summaryText(g, ex);
    if (sheetOn(g)) return sheetView(g, ex);
    if (!ex.length) return `<div class="card empty"><b>Ningún gasto coincide con los filtros</b>Pruebe con otra persona, otro rango de fechas o menos texto.<div><button class="btn" data-act="clear-filters">Limpiar filtros</button></div></div>`;
    return `<div class="card"><ul class="list">${ex.map((e) => { const can = (a) => R.can(a, ctx(g, { expense: e })).allowed; return `<li class="row"><div class="main"><b>${esc(e.description)}</b><span class="small mut">Pagó ${esc(nm(e.payerId))}${e.payerId === me() ? " (usted)" : ""} · ${fdate(e.date)}</span></div><span class="amt num">${money(units(e, g), g)}</span><span class="acts">${can("edit_expense") ? `<button class="btn small" data-act="edit-exp" data-id="${e.id}" aria-label="Editar ${esc(e.description)}">${ic("pencil")}Editar</button>` : ""}${can("delete_expense") ? `<button class="btn small danger" data-act="del-exp" data-id="${e.id}" aria-label="Eliminar ${esc(e.description)}">${ic("trash")}</button>` : ""}</span></li>`; }).join("")}</ul></div>`;
  }
  function tabGastos(g, canAdd) {
    const admin = roleIn(g) === "admin", F = uiOf(g);
    const h = g.closed ? `<div class="notice warn">${ic("lock")}<div>El grupo está cerrado: solo se puede leer.${admin ? ' <button class="btn small" data-act="reopen">Reabrir el grupo</button>' : " Pida a quien lo administra que lo reabra."}</div></div>` : "";
    if (!g.expenses.length && !sheetOn(g) && !(admin && !g.closed && F.view === "sheet")) return h + `<div class="card empty"><b>Aún no hay gastos</b>Registre el primero: quién pagó y cuánto. Balance reparte en partes iguales entre todas las personas del grupo.${canAdd ? `<div><button class="btn primary" data-act="add-exp">${ic("plus")}Registrar el primer gasto</button> ${admin ? `<button class="btn" data-act="view-sheet">Abrir la hoja de gastos</button>` : ""}</div>` : ""}</div>`;
    const tog = admin && !g.closed ? `<div class="viewtog" role="group" aria-label="Vista de gastos"><button data-act="view-list" aria-pressed="${!sheetOn(g)}">Lista</button><button data-act="view-sheet" aria-pressed="${sheetOn(g)}">Hoja de gastos</button></div>` : "";
    return h + tog + filtersBar(g) + `<div id="expArea">${expArea(g)}</div>`;
  }
  const payerOpts = (g, sel) => g.members.map((m) => `<option value="${m.id}" ${sel === m.id ? "selected" : ""}>${esc(nm(m.id))}</option>`).join("");
  function sheetView(g, ex) {
    const F = uiOf(g), dec0 = M.currency(g.currency).decimals, d = F.draft || (F.draft = { date: M.todayInZone(g.tz), payer: me() });
    const mode = dec0 ? "decimal" : "numeric", all = ex.length && ex.every((e) => F.sel.has(e.id));
    const rows = ex.map((e) => `<tr data-id="${e.id}" class="${F.sel.has(e.id) ? "sel" : ""}"><td class="c"><input type="checkbox" data-sel="${e.id}" ${F.sel.has(e.id) ? "checked" : ""} aria-label="Seleccionar ${esc(e.description)}"></td><td><input type="date" data-c="date" value="${e.date}" aria-label="Fecha de ${esc(e.description)}"></td><td><input data-c="desc" value="${esc(e.description)}" maxlength="500" aria-label="Descripción" autocomplete="off"></td><td><select data-c="payer" aria-label="Quién pagó ${esc(e.description)}">${payerOpts(g, e.payerId)}</select></td><td><input data-c="amt" class="r" inputmode="${mode}" value="${esc(dec(e.amount))}" aria-label="Monto de ${esc(e.description)}" autocomplete="off"></td><td class="c"><button class="btn small danger" data-act="sheet-del" data-id="${e.id}" aria-label="Eliminar ${esc(e.description)}">${ic("trash")}</button></td></tr>`).join("");
    return `<div class="card sheetwrap"><div class="sheetbar"><span class="small mut">Edite una celda y pulse <b>Enter</b> o cambie de celda: se guarda al instante. <b>Tab</b> avanza; <b>Esc</b> deshace la celda. En la fila nueva, Enter agrega; también puede <b>pegar filas desde Excel</b> (fecha, descripción, pagó, monto).</span><button class="btn small danger" data-act="sheet-bulk-del" ${F.sel.size ? "" : "hidden"}>Eliminar seleccionados (${F.sel.size})</button></div><div class="sheetscroll"><table class="sheet" id="sheet"><caption class="sr">Hoja de gastos de ${esc(g.name)}</caption><thead><tr><th class="c"><input type="checkbox" id="selAll" ${all ? "checked" : ""} aria-label="Seleccionar todos los gastos mostrados"></th><th>Fecha</th><th>Descripción</th><th>Pagó</th><th class="r">Monto (${g.currency})</th><th><span class="sr">Acciones</span></th></tr></thead><tbody>${rows}</tbody><tfoot><tr class="newrow" id="newrow"><td class="c" aria-hidden="true">+</td><td><input type="date" data-n="date" value="${d.date}" aria-label="Fecha del gasto nuevo"></td><td><input data-n="desc" placeholder="Nuevo gasto…" maxlength="500" aria-label="Descripción del gasto nuevo" autocomplete="off"></td><td><select data-n="payer" aria-label="Quién pagó el gasto nuevo">${payerOpts(g, d.payer)}</select></td><td><input data-n="amt" class="r" inputmode="${mode}" placeholder="${dec0 ? "0,00" : "0"}" aria-label="Monto del gasto nuevo" autocomplete="off"></td><td class="c"><button class="btn small primary" data-act="sheet-add" aria-label="Agregar el gasto">${ic("plus")}</button></td></tr><tr class="tot"><td></td><td colspan="3">Total mostrado · ${ex.length} ${ex.length === 1 ? "gasto" : "gastos"}</td><td class="r num" id="sheetTot">${money(sumU(ex, g), g)}</td><td></td></tr></tfoot></table></div><div class="err-line" id="sheetMsg" role="alert" hidden></div></div>`;
  }
  const sheetMsg = (m) => { const el = $("#sheetMsg"); if (!el) return; el.hidden = !m; el.innerHTML = m ? ic("alert") + esc(m) : ""; };
  function validateRow(g, v) {
    if (v.desc.length < 4 || v.desc.length > 500) return { ok: false, field: "desc", message: "La descripción debe tener entre 4 y 500 caracteres." };
    const a = M.parseInput(v.amt, g.currency); if (!a.ok) return { ok: false, field: "amt", message: a.message };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date) || Number.isNaN(Date.parse(v.date))) return { ok: false, field: "date", message: "Elija una fecha válida." };
    if (!g.members.some((m) => m.id === v.payer)) return { ok: false, field: "payer", message: "Elija quién pagó." };
    return { ok: true, value: { description: v.desc, amount: a.value, date: v.date, payerId: v.payer } };
  }
  const rowVals = (tr, k) => ({ date: tr.querySelector(`[${k}=date]`).value, desc: tr.querySelector(`[${k}=desc]`).value.trim(), payer: tr.querySelector(`[${k}=payer]`).value, amt: tr.querySelector(`[${k}=amt]`).value });
  function refreshAfterEdit(g) { const h = $(".hero"); if (h) h.outerHTML = heroHtml(g); const ex = filtered(g), t = $("#sheetTot"); if (t) t.textContent = money(sumU(ex, g), g); const sum = $("#fSummary"); if (sum) sum.textContent = summaryText(g, ex); }
  function commitCell(inp) {
    const g = curG(), tr = inp.closest("tr"), e = g && g.expenses.find((x) => x.id === tr.dataset.id); if (!e) return;
    const v = validateRow(g, rowVals(tr, "data-c"));
    $$("[aria-invalid]", tr).forEach((x) => x.removeAttribute("aria-invalid"));
    if (!v.ok) { const f = tr.querySelector(`[data-c=${v.field}]`); f.setAttribute("aria-invalid", "true"); sheetMsg(`«${e.description}»: ${v.message} (no se guardó)`); return; }
    let res = R.can("edit_expense", ctx(g, { expense: e })); if (res.allowed && v.value.payerId !== e.payerId) res = R.can("change_payer", ctx(g));
    if (!res.allowed) { sheetMsg(res.reason + " " + res.who); return; }
    const changed = ["description", "amount", "date", "payerId"].some((k) => e[k] !== v.value[k]); if (!changed) { sheetMsg(""); return; }
    Object.assign(e, v.value); tr.querySelector("[data-c=amt]").value = dec(e.amount); audit(g, `Modificó el gasto «${e.description}»`); sheetMsg(""); refreshAfterEdit(g);
  }
  function sheetAdd() {
    const g = curG(), tr = $("#newrow"); if (!g || !tr) return; const F = uiOf(g);
    const v = validateRow(g, rowVals(tr, "data-n")); $$("[aria-invalid]", tr).forEach((x) => x.removeAttribute("aria-invalid"));
    if (!v.ok) { tr.querySelector(`[data-n=${v.field}]`).setAttribute("aria-invalid", "true"); tr.querySelector(`[data-n=${v.field}]`).focus(); sheetMsg("Fila nueva: " + v.message); return; }
    const res = R.can("add_expense", ctx(g, { payerId: v.value.payerId })); if (!res.allowed) { sheetMsg(res.reason + " " + res.who); return; }
    g.expenses.push({ id: "e" + nextId++, ...v.value }); F.draft = { date: v.value.date, payer: v.value.payerId }; audit(g, `Registró el gasto «${v.value.description}»`);
    $("#expArea").innerHTML = expArea(g); refreshAfterEdit(g); sheetMsg(""); const d = $("#newrow [data-n=desc]"); if (d) d.focus();
  }
  function sheetDelete(g, ids) {
    const F = uiOf(g); const removed = g.expenses.map((e, i) => ({ e, i })).filter((x) => ids.includes(x.e.id)); if (!removed.length) return;
    for (const x of removed) { const res = R.can("delete_expense", ctx(g, { expense: x.e })); if (!res.allowed) return denyDlg(res); }
    g.expenses = g.expenses.filter((e) => !ids.includes(e.id)); ids.forEach((i) => F.sel.delete(i)); audit(g, `Eliminó ${removed.length} ${removed.length === 1 ? "gasto" : "gastos"}`);
    $("#expArea").innerHTML = expArea(g); refreshAfterEdit(g);
    toast(`${removed.length} ${removed.length === 1 ? "gasto eliminado" : "gastos eliminados"}`, { label: "Deshacer", fn: () => { removed.forEach((x) => g.expenses.splice(Math.min(x.i, g.expenses.length), 0, x.e)); audit(g, `Restauró ${removed.length} ${removed.length === 1 ? "gasto" : "gastos"}`); if (curG() === g) { const a = $("#expArea"); if (a) { a.innerHTML = expArea(g); refreshAfterEdit(g); } } toast("Gastos restaurados"); } });
  }
  function parsePaste(g, text) {
    const F = uiOf(g), d0 = (F.draft && F.draft.date) || M.todayInZone(g.tz); const rows = [], errs = [];
    const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
    lines.forEach((line, i) => {
      const c = line.split(/\t|;/).map((x) => x.trim()); const last = c[c.length - 1];
      if (i === 0 && !M.parseInput(last, g.currency).ok && /monto|importe|descripci/i.test(line)) return;
      let date = d0, desc, who, amt; if (c.length >= 4) [date, desc, who, amt] = c; else if (c.length === 3) [desc, who, amt] = c; else { errs.push(`Fila ${i + 1}: use fecha, descripción, pagó y monto separados por tabulador.`); return; }
      const dm = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(date); if (dm) date = `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
      const m = g.members.find((x) => normT(nm(x.id)) === normT(who)); if (!m) { errs.push(`Fila ${i + 1}: «${who}» no está en el grupo.`); return; }
      const v = validateRow(g, { date, desc, payer: m.id, amt }); if (!v.ok) { errs.push(`Fila ${i + 1}: ${v.message}`); return; } rows.push(v.value);
    });
    if (!rows.length && !errs.length) return;
    if (errs.length) return dlg(`<h2 id="mt">No se pegó ningún gasto</h2><p>Se revisan todas las filas y no se agrega nada si alguna tiene un error (así no queda a medias).</p><ul>${errs.slice(0, 8).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>${errs.length > 8 ? `<p class="mut small">…y ${errs.length - 8} más.</p>` : ""}<div class="btns"><button class="btn primary" data-x="cancel">Entendido</button></div>`), ($("#dlg [data-x=cancel]").onclick = closeDlg);
    const total = rows.reduce((a, r) => a + M.toUnits(r.amount, g.currency), 0n);
    confirmDlg({ title: `¿Agregar ${rows.length} ${rows.length === 1 ? "gasto" : "gastos"}?`, body: `<p>Suman ${money(total, g)}. Se agregan todos juntos y puede deshacerlo.</p>`, ok: `Agregar ${rows.length}`, onOk: () => { const ids = rows.map((r) => { const id = "e" + nextId++; g.expenses.push({ id, ...r }); return id; }); audit(g, `Agregó ${rows.length} gastos pegados desde una hoja`); const a = $("#expArea"); if (a) { a.innerHTML = expArea(g); refreshAfterEdit(g); } toast(`${rows.length} gastos agregados`, { label: "Deshacer", fn: () => { g.expenses = g.expenses.filter((e) => !ids.includes(e.id)); audit(g, `Deshizo el pegado de ${rows.length} gastos`); const a2 = $("#expArea"); if (a2 && curG() === g) { a2.innerHTML = expArea(g); refreshAfterEdit(g); } } }); } });
  }
  // Eventos de filtros y de la hoja (delegados: el contenido se repinta)
  document.addEventListener("input", (e) => { const f = e.target.closest && e.target.closest("[data-f]"); if (f) { const g = curG(); if (!g) return; uiOf(g)[f.dataset.f] = f.value; const a = $("#expArea"); if (a) a.innerHTML = expArea(g); const c = $("#fClear"); if (c) c.innerHTML = clearBtn(uiOf(g)); } });
  document.addEventListener("change", (e) => {
    const t = e.target, g = curG(); if (!g) return;
    const f = t.closest && t.closest("[data-f]"); if (f) { uiOf(g)[f.dataset.f] = f.value; const a = $("#expArea"); if (a) a.innerHTML = expArea(g); const c = $("#fClear"); if (c) c.innerHTML = clearBtn(uiOf(g)); return; }
    if (t.matches && t.matches("#sheet [data-c]")) return commitCell(t);
    if (t.id === "selAll") { const F = uiOf(g), ex = filtered(g); if (t.checked) ex.forEach((x) => F.sel.add(x.id)); else ex.forEach((x) => F.sel.delete(x.id)); $("#expArea").innerHTML = expArea(g); return; }
    if (t.dataset && t.dataset.sel) { const F = uiOf(g); if (t.checked) F.sel.add(t.dataset.sel); else F.sel.delete(t.dataset.sel); t.closest("tr").classList.toggle("sel", t.checked); const b = $('[data-act="sheet-bulk-del"]'); if (b) { b.hidden = !F.sel.size; b.textContent = `Eliminar seleccionados (${F.sel.size})`; } const all = $("#selAll"); if (all) all.checked = filtered(g).every((x) => F.sel.has(x.id)); }
  });
  document.addEventListener("keydown", (e) => {
    const t = e.target; if (!t.closest || !t.closest("#sheet")) return; const g = curG(); if (!g) return; const tr = t.closest("tr"), col = t.dataset.c || t.dataset.n; if (!col) return;
    if (e.key === "Enter" && t.tagName === "INPUT" && t.type !== "checkbox") { e.preventDefault(); if (tr.id === "newrow") return sheetAdd(); t.blur(); commitCell(t); const nx = tr.nextElementSibling; const target = nx && nx.dataset.id ? nx : $("#newrow"); const f = target && target.querySelector(`[data-c=${col}],[data-n=${col}]`); if (f) f.focus(); return; }
    if (e.key === "Escape" && tr.dataset.id) { const x = g.expenses.find((y) => y.id === tr.dataset.id); if (x) { tr.querySelector("[data-c=date]").value = x.date; tr.querySelector("[data-c=desc]").value = x.description; tr.querySelector("[data-c=payer]").value = x.payerId; tr.querySelector("[data-c=amt]").value = dec(x.amount); $$("[aria-invalid]", tr).forEach((n) => n.removeAttribute("aria-invalid")); sheetMsg(""); } return; }
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && t.tagName === "INPUT" && t.type === "text") { const rowsEls = $$("#sheet tbody tr, #newrow"); const i = rowsEls.indexOf(tr), n = rowsEls[i + (e.key === "ArrowDown" ? 1 : -1)]; const f = n && n.querySelector(`[data-c=${col}],[data-n=${col}]`); if (f) { e.preventDefault(); f.focus(); } }
  });
  document.addEventListener("paste", (e) => { const t = e.target; if (!t.closest || !t.closest("#newrow")) return; const text = (e.clipboardData && e.clipboardData.getData("text")) || ""; if (!/[\n\t;]/.test(text.trim())) return; e.preventDefault(); const g = curG(); if (g) parsePaste(g, text); });

  function tabSaldos(g, r) {
    const mx = g.members.reduce((a, m) => { const b = r.balances[m.id]; const v = b < 0n ? -b : b; return v > a ? v : a; }, 0n);
    const rows = g.members.map((m, i) => { const b = r.balances[m.id], v = b < 0n ? -b : b, w = mx ? Number((v * 100n) / mx) : 0; const txt = b > 0n ? `Le deben ${money(b, g)}` : b < 0n ? `Debe ${money(-b, g)}` : "Al día"; return `<div class="bal"><span class="av" aria-hidden="true">${esc(nm(m.id)[0])}</span><div><div class="t">${esc(nm(m.id))}${m.id === me() ? " (usted)" : ""}</div><div class="sub">#${i + 1} en el orden de ingreso · pagó ${money(r.paid[m.id], g)} · su parte ${money(r.shares[m.id], g)}</div><button class="btn small" data-act="who-filter" data-id="${m.id}" style="margin-top:.3rem">Ver sus gastos</button></div><div class="bw"><div class="t num ${b > 0n ? "pos" : b < 0n ? "neg" : "zero"}">${txt}</div><div class="bar" aria-hidden="true"><span class="l" style="width:${b < 0n ? w : 0}%"></span><span class="r" style="width:${b > 0n ? w : 0}%"></span></div></div></div>`; }).join("");
    const rest = r.extraUnits > 0n ? `<div class="notice">${ic("scale")}<div>Al repartir ${money(r.total, g)} entre ${g.members.length} personas sobran ${r.extraUnits} ${r.extraUnits === 1n ? "unidad mínima" : "unidades mínimas"} (${M.currency(g.currency).decimals ? "centavos" : "unidades"}). Se asignan de una en una a las primeras personas por orden de ingreso, así las partes suman <b>exactamente</b> el total y los saldos suman cero.</div></div>` : "";
    const sumB = g.members.reduce((a, m) => a + r.balances[m.id], 0n);
    return `<div class="card">${rows || '<div class="empty">Aún no hay personas.</div>'}<p class="small mut" style="margin:.8rem 0 0">Total pagado por el grupo: <b class="num">${money(r.total, g)}</b> · Suma de los saldos: <b class="num">${money(sumB, g)}</b> (siempre cero: lo que unos deben es lo que otros reciben).</p></div>${rest}`;
  }
  function tabLiquidar(g, transfers, r) {
    const title = g.closed ? "Liquidación (grupo cerrado)" : "Liquidación sugerida";
    if (!g.expenses.length) return `<div class="card empty"><b>Todavía no hay nada que liquidar</b>Cuando se registren gastos, aquí aparecerá quién le paga a quién.</div>`;
    if (!transfers.length) return `<div class="card empty"><b>Las cuentas están claras</b>Nadie le debe nada a nadie en este momento.</div>`;
    const tot = transfers.reduce((a, t) => a + t.units, 0n);
    return `<div class="tape"><h2><span>${title}</span><span class="num">${transfers.length} ${transfers.length === 1 ? "pago" : "pagos"}</span></h2>${transfers.map((t) => { const mine = t.from === me() || t.to === me(); const who = t.from === me() ? "Usted paga a" : t.to === me() ? `${esc(nm(t.from))} le paga a` : `${esc(nm(t.from))} paga a`; const to = t.to === me() ? "usted" : esc(nm(t.to)); return `<div class="pay ${mine ? "mine" : ""}"><span>${who} <b>${to}</b></span><span class="amt num">${money(t.units, g)}</span>${t.from === me() ? `<button class="btn small" data-act="copy-amt" data-v="${esc(dec(M.fromUnits(t.units, g.currency)))}">${ic("copy")}Copiar monto</button>` : ""}</div>`; }).join("")}<div class="sum"><span>Total que se mueve</span><span class="num">${money(tot, g, { code: true })}</span></div></div><p class="mut small" style="max-width:34rem">Balance no registra pagos: esta lista se recalcula con cada cambio y es la misma para todas las personas del grupo. Haga la transferencia por su banco o SINPE Móvil y avise al grupo.</p>`;
  }
  function tabPersonas(g, admin) {
    const rows = g.members.map((m, i) => { const mine = m.id === me(); return `<li class="row"><span class="av" aria-hidden="true">${esc(nm(m.id)[0])}</span><div class="main"><b>${esc(nm(m.id))}${mine ? " (usted)" : ""}</b><span class="small mut">#${i + 1} · ${m.role === "admin" ? "Administra el grupo" : "Miembro"}</span></div><span class="acts"><button class="btn small" data-act="who-filter" data-id="${m.id}">Ver gastos</button>${admin && !mine ? `<button class="btn small" data-act="toggle-admin" data-id="${m.id}">${m.role === "admin" ? "Quitar administración" : "Nombrar administrador"}</button><button class="btn small danger" data-act="remove-p" data-id="${m.id}">Quitar</button>` : ""}${mine ? `<button class="btn small" data-act="leave">${ic("door")}Salir del grupo</button>` : ""}${admin && mine && m.role === "admin" ? `<button class="btn small" data-act="toggle-admin" data-id="${m.id}">Dejar la administración</button>` : ""}</span></li>`; }).join("");
    const join = admin ? `<div class="card"><h2>${ic("link")} Enlace y código de ingreso</h2><p class="small mut">Quien tenga una cuenta de Pastel con Balance puede entrar con el enlace y el código. No vencen: regenérelos si se filtran. Los miembros no ven esta sección.</p><div class="linkbox" id="jl">https://pastel.example/balance#/unirse/${esc(g.join.token)}</div><div class="codebox"><span class="cd num" aria-label="Código de ingreso ${esc(g.join.code.split("").join(" "))}">${esc(g.join.code)}</span><button class="btn small" data-act="copy-link">${ic("copy")}Copiar enlace</button><button class="btn small" data-act="copy-code">${ic("copy")}Copiar código</button><button class="btn small danger" data-act="regen">Regenerar</button></div></div>` : "";
    return `<div class="card"><h2>Personas del grupo</h2><p class="small mut">El orden de ingreso decide a quién se asigna cada unidad mínima sobrante.</p><ul class="list">${rows}</ul></div>${join}`;
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
      case "view-list": case "view-sheet": { const F = uiOf(g); F.view = a === "view-sheet" ? "sheet" : "list"; if (F.view === "sheet" && F.sort === "date-desc") F.sort = "reg"; if (F.view === "list" && F.sort === "reg") F.sort = "date-desc"; render(); break; }
      case "clear-filters": { const F = uiOf(g); Object.assign(F, { q: "", who: "", from: "", to: "" }); render(); break; }
      case "who-filter": { const F = uiOf(g); Object.assign(F, { q: "", from: "", to: "", who: id }); go("#/g/" + g.id + "/gastos"); break; }
      case "sheet-add": sheetAdd(); break;
      case "sheet-del": sheetDelete(g, [id]); break;
      case "sheet-bulk-del": sheetDelete(g, [...uiOf(g).sel]); break;
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
    if (r.k === "new") return newGroup();
    if (r.k === "g") { const g = byId(r.id); const v = R.can("view", ctx(g)); if (!v.allowed) return noGroup(); return group(g, ["gastos", "saldos", "liquidar", "personas", "ajustes"].includes(r.tab) ? r.tab : "gastos"); }
    home();
  }
  addEventListener("hashchange", render);
  DevKit.init({ app: "balance", role: "admin", onRole: (id) => { roleId = id; Object.keys(UI).forEach((k) => delete UI[k]); if (id === "invitada") location.hash = "#/unirse/" + groups[0].join.token; else if (route().k === "join" && D.ROLES[id].session === false && id !== "invitada") { /* se queda en el ingreso */ } render(); }, roles: [
    { id: "admin", label: "Ana · administra el paseo", desc: "Ve todo, ve el enlace y el código, edita la configuración, cierra y reabre, nombra administradores." },
    { id: "member", label: "Beto · miembro del paseo", desc: "Registra solo gastos que él pagó; ve todo; no ve el enlace, el código ni los ajustes del paseo." },
    { id: "nueva", label: "Marcos · con acceso, sin grupos", desc: "Estado vacío. Para ingresar: #/unirse/paseo-7k3m9xq2 con el código 4821 (tras 5 fallos, pausa de 15 min)." },
    { id: "invitada", label: "Invitada sin cuenta (abre el enlace)", desc: "Ve la página informativa: registrarse y marcar Balance. Es la misma para cualquier enlace." },
    { id: "noaccess", label: "Con sesión, sin acceso a Balance", desc: "Ve por qué no entra y a quién pedirlo (403)." },
    { id: "anon", label: "Sin sesión", desc: "Se le pide iniciar sesión (401)." }] });
  const rp = new URLSearchParams(location.search); if (rp.get("view") === "liquidar" || rp.get("g")) { go("#/g/" + (rp.get("g") || "g1") + "/" + (rp.get("view") || "gastos")); }
  render();
})();
