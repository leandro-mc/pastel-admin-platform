/* Ágora v2 (prototipo). Contenido de EJEMPLO en data.js. Sin servidor: el estado vive en memoria/navegador.
   Roles y permisos: ver agora/ROLES-Y-PERMISOS.md. Mecanismos de despolarización: agora/INVESTIGACION-AGORA.md. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const { TYPES, PIECES, NEWS, SERIES, INTERESTS, PERSP, ESCUCHA, SEED } = window.AGORA_DATA;
  const mem = {}; const store = { getItem: (k) => { try { return localStorage.getItem(k); } catch (e) { return mem[k] ?? null; } }, setItem: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { mem[k] = String(v); } } };
  const load = (k, d) => { try { const v = JSON.parse(store.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }, save = (k, v) => store.setItem(k, JSON.stringify(v));
  const I = { home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>', news: '<path d="M4 5h13v14H5a1 1 0 0 1-1-1zM17 9h3v9a1 1 0 0 1-1 1M7 9h7M7 13h7"/>', play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.500l6 3.500-6 3.500z"/>', book: '<path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2zM4 19V5"/>', mark: '<path d="M6 3h12v18l-6-4-6 4z"/>', pen: '<path d="M4 20l1-4L16 5l3 3L8 19zM14 7l3 3"/>', check: '<path d="M5 12l5 5L20 7"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', edit: '<path d="M4 20l1-4L16 5l3 3L8 19z"/>', chat: '<path d="M21 12a8 8 0 0 1-11.600 7.100L4 20l1-4.600A8 8 0 1 1 21 12z"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6z"/><path d="M8.500 12l2.500 2.500 4.500-5"/>', layers: '<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5"/>', inbox: '<path d="M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5"/>', users: '<circle cx="9" cy="8" r="3.500"/><path d="M2 20c0-3.500 3-6 7-6s7 2.500 7 6M16 5a3.500 3.500 0 0 1 0 7M18 14c2.500.5 4 2.500 4 6"/>', vote: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M8 9V4h8v5M9 14l2 2 4-4"/>',
    coins: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.700 3.600 3 8 3s8-1.300 8-3V6M4 12v6c0 1.700 3.600 3 8 3s8-1.300 8-3v-6"/>', land: '<path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>', leaf: '<path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 15zM5 19c3-5 6-8 10-10"/>', gear: '<path d="M4 12c0-1 .1-1.500.4-2l-2-2 2-3.500 2.700.7a8 8 0 0 1 1.800-1L9.500 1h5l.6 3.200c.7.300 1.300.600 1.800 1l2.700-.7 2 3.500-2 2c.3.500.4 1 .4 2s-.1 1.500-.4 2l2 2-2 3.500-2.700-.7a8 8 0 0 1-1.800 1L14.500 23h-5l-.6-3.200a8 8 0 0 1-1.800-1l-2.700.7-2-3.500 2-2c-.3-.5-.4-1-.4-2z" transform="scale(.9) translate(1.300 1.300)"/><circle cx="12" cy="12" r="3"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>' };
  const ic = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;
  const SERIE_ICO = { "Cómo funciona": "layers", "Verifique antes de compartir": "shield", "Economía en casa": "coins", "Historia cercana": "land", "Ambiente": "leaf" };

  // ── Roles y permisos (separación de funciones: quien escribe no verifica; quien modera no edita; quien administra no publica) ──
  const ROLES = [
    { id: "anon", label: "Visitante (sin cuenta)", short: "Visitante", desc: "Lee, busca y comparte. Para guardar, reaccionar, preguntar o votar necesita una cuenta gratuita." },
    { id: "lector", label: "Persona registrada", short: "Lectora", desc: "Guarda piezas, reacciona, pregunta al especialista, señala errores y participa en la escucha ciudadana." },
    { id: "colab", label: "Colaboradora (autora)", short: "Colaboradora", desc: "Redacta con la plantilla guiada y envía a revisión. No puede verificar lo que escribe." },
    { id: "revisor", label: "Revisora especialista", short: "Revisora", desc: "Comprueba fuentes y afirmaciones y otorga el sello con su alcance por escrito. No revisa lo que escribió." },
    { id: "editor", label: "Editora (curaduría)", short: "Editora", desc: "Elige «Hoy en 5 minutos» y organiza series. No otorga sellos." },
    { id: "moderador", label: "Moderadora de comunidad", short: "Moderadora", desc: "Atiende errores señalados, preguntas y propuestas de la escucha ciudadana. No edita contenido." },
    { id: "admin", label: "Administrador", short: "Admin", desc: "Gestiona cuentas y roles y ve la auditoría. No publica ni verifica." },
    { id: "owner", label: "Propietario (superusuario)", short: "Propietario", desc: "Todo lo anterior y los ajustes de la plataforma. Sus acciones también quedan en la auditoría." },
  ];
  const BASE = ["read", "share", "save", "react", "ask", "report", "vote"], ALLC = ["read", "share", "save", "react", "ask", "report", "vote", "write", "review", "curate", "moderate", "admin", "settings"];
  const CAN = { anon: ["read", "share"], lector: BASE, colab: [...BASE, "write"], revisor: [...BASE, "review"], editor: [...BASE, "curate"], moderador: [...BASE, "moderate"], admin: [...BASE, "admin"], owner: ALLC };
  const CAPS = [["read", "Leer y buscar"], ["share", "Compartir"], ["save", "Guardar"], ["react", "Reaccionar"], ["ask", "Preguntar al especialista"], ["report", "Señalar un error"], ["vote", "Escucha ciudadana (votar)"], ["write", "Redactar y enviar a revisión"], ["review", "Otorgar sello"], ["curate", "Curar «Hoy en 5 minutos»"], ["moderate", "Moderar bandeja"], ["admin", "Gestionar cuentas y roles"], ["settings", "Ajustes de la plataforma"]];
  let role = "anon"; const can = (c) => CAN[role].includes(c);
  const roleInfo = () => ROLES.find((r) => r.id === role);

  const S = { calm: false, serie: null, q: "", marks: load("agora.marks", {}), interests: load("agora.int", null), pops: {}, qz: {}, shareOk: {}, votes: {}, rev: { id: null, c: [false, false, false], scope: "" },
    today: new Set(PIECES.filter((p) => p.today).map((p) => p.id)), errors: SEED.errors.map((x) => ({ ...x })), asks: SEED.asks.map((x) => ({ ...x })), props: SEED.proposals.map((x) => ({ ...x })), users: SEED.users.map(([n, r]) => ({ n, r })), audit: SEED.audit.slice(),
    ed: { title: "", sum: "", type: "", know: "", unk: "", why: "", src: "", alt: false, orig: false, gl: false } };
  const sealTxt = (p) => (p.seal === "ok" ? `Verificado por ${p.sealBy} · ${p.sealDate}` : p.seal === "mod" ? `Modificada tras la verificación · ${p.sealDate}` : "Pendiente de verificación");
  const seal = (p) => `<div class="seal ${p.seal}">${ic(p.seal === "ok" ? "check" : p.seal === "mod" ? "edit" : "clock")}<span>${sealTxt(p)}</span></div>`;
  const toast = (t) => { const n = $("#toast"); n.textContent = t; n.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (n.hidden = true), 3200); };
  const log = (t) => S.audit.unshift(`2026-10-24 · ${roleInfo().short} (usted) ${t}`);
  const wa = (p) => "https://wa.me/?text=" + encodeURIComponent(`${p.title}\n${sealTxt(p)}\nEn 20 segundos: ${p.sum}\nLea con fuentes: ${location.href.split("#")[0]}#/p/${p.id}`);
  const mk = (id, k) => !!(S.marks[id] && S.marks[id][k]);
  const login = `<button class="btn alt" data-a="login">Entrar o crear cuenta (gratis)</button>`;

  const card = (p) => `<article class="card" aria-labelledby="t-${p.id}">
    <div class="head"><span class="av" aria-hidden="true">Á</span><div><b>${esc(p.author)}</b><div class="mut">${p.date.slice(8)} oct · ${p.min} min de lectura</div></div></div>
    <span class="chip t-${p.type}">${TYPES[p.type]}</span>${p.format ? ` <span class="chip fmt">${esc(p.format)}</span>` : ""}${p.video ? ' <span class="chip">Video</span>' : ""}
    <h2 class="serif title" id="t-${p.id}"><a href="#/p/${p.id}">${esc(p.title)}</a></h2><div class="sum"><b>En 20 segundos</b>${esc(p.sum)}</div>
    ${p.video ? `<div class="vid" role="img" aria-label="Video (se carga al pulsar)"><button type="button">Reproducir (YouTube sin cookies)</button></div>` : ""}${seal(p)}
    <div class="mut">Fuentes (${p.sources.length}) · <a href="#/p/${p.id}">ver cómo lo sabemos</a></div>
    <div class="acts" role="group" aria-label="Acciones">${can("react") ? `<button data-a="mk" data-id="${p.id}" data-k="ayudo" aria-pressed="${mk(p.id, "ayudo")}">${ic("check")} Me ayudó a entender</button><button data-a="mk" data-id="${p.id}" data-k="mas" aria-pressed="${mk(p.id, "mas")}">${ic("plus")} Quiero más fuentes</button><button data-a="mk" data-id="${p.id}" data-k="guardar" aria-pressed="${mk(p.id, "guardar")}">${ic("mark")} Guardar</button>` : `<span class="mut" style="align-self:center">Para guardar y reaccionar:</span> <button data-a="login">Cree su cuenta</button>`}
      <a href="#/p/${p.id}" title="Para compartir con contexto, primero léala">${ic("chat")} Compartir</a></div></article>`;

  const route = () => { const h = location.hash.replace(/^#\/?/, "").split("/"); return { n: h[0] || "home", a: h[1] }; };
  const NEED = { guardados: "save", editorial: "write", revision: "review", curaduria: "curate", bandeja: "moderate", admin: "admin" };
  const WHO = { save: "una persona registrada", write: "una colaboradora o editora", review: "una revisora especialista", curate: "una editora", moderate: "una moderadora de comunidad", admin: "un administrador" };
  const WHY = { review: "La revisión la hace una persona distinta de quien escribe: así el sello significa algo.", curate: "Quien cura no otorga sellos: así lo destacado no depende de una sola persona.", moderate: "Quien modera no edita el contenido: así la moderación no cambia lo que se dice.", admin: "Quien administra cuentas no publica ni verifica.", write: "Solo cuentas con permiso de redacción pueden crear piezas.", save: "Guardar requiere una cuenta gratuita." };
  const WHYX = { editor: { review: "Quien cura no otorga sellos: así lo destacado no depende de una sola persona." }, colab: { review: "Quien escribe no verifica lo que escribe ni lo de sus colegas cercanos: la revisión la hace otra persona." }, moderador: { write: "Quien modera no edita el contenido: así la moderación no cambia lo que se dice.", review: "Quien modera no otorga sellos." }, admin: { review: "Quien administra cuentas no verifica contenido.", write: "Quien administra cuentas no publica.", curate: "Quien administra cuentas no decide qué se destaca." }, revisor: { curate: "Quien verifica no decide qué se destaca: así el sello no se mezcla con la visibilidad.", write: "Quien verifica no escribe las piezas que revisa." } };
  const filt = (list, f) => list.filter((p) => (!S.serie || p.serie === S.serie) && (!S.q || p.title.toLowerCase().includes(S.q.toLowerCase())) && (!f || f === "all" || (f === "videos" ? p.video : f === "guias" ? p.cat === "guias" : true)));
  const deny = (cap) => `<div class="card deny" role="alert"><b>Esta sección es para ${WHO[cap]}</b><p class="mut">${(WHYX[role] || {})[cap] || WHY[cap]} Usted está viendo Ágora como <b>${roleInfo().label}</b>.</p><a class="btn" href="#/" style="color:var(--brand-ink)">Volver al inicio</a>${role === "anon" ? " " + login : ""}</div>`;
  const H1 = (t) => `<h1 class="serif" style="font-size:1.5rem;margin:.2rem 0 .6rem">${t}</h1>`;

  const V = {
    home(f) {
      if (f === "actualidad") return H1("Actualidad enlazada") + (S.calm ? '<div class="card">Modo calma activo: la actualidad dura está oculta por 24 horas. Puede desactivarlo arriba.</div>' : NEWS.map((n) => `<div class="card"><b>${n.t}</b><p>${n.ctx}</p><a href="https://example.org/" target="_blank" rel="noopener noreferrer">Leer en ${n.src}</a></div>`).join(""));
      const todayIds = S.serie || S.q || f ? [] : [...S.today], today = PIECES.filter((p) => todayIds.includes(p.id)), feed = filt(PIECES.filter((p) => !todayIds.includes(p.id)), f), mins = today.reduce((a, p) => a + p.min, 0);
      const order = SERIES.slice().sort((a, b) => (S.interests && S.interests.includes(b[0]) ? 1 : 0) - (S.interests && S.interests.includes(a[0]) ? 1 : 0));
      return `${S.interests === null && can("save") ? `<section class="card welcome" aria-labelledby="w"><h2 id="w" style="font-size:1.1rem">Bienvenida. ¿Qué le interesa?</h2><p class="mut">Su elección se guarda solo en este navegador.</p><div class="chips">${INTERESTS.map((i) => `<button data-a="int" data-i="${esc(i)}" aria-pressed="false">${esc(i)}</button>`).join("")}</div><button class="btn" data-a="intok">Listo</button> <button class="btn alt" data-a="intno">Ahora no</button></section>` : ""}
      ${S.calm ? `<div class="card" style="border-color:var(--info)">${ic("check")} <b>Modo calma activo.</b> <span class="mut">Se oculta la actualidad dura por 24 horas.</span></div>` : ""}
      <div class="stories" role="group" aria-label="Series">${order.map(([n]) => `<button class="story" data-a="serie" data-s="${esc(n)}" aria-pressed="${S.serie === n}"><span>${ic(SERIE_ICO[n] || "book")}</span>${esc(n)}</button>`).join("")}</div>
      ${today.length ? `<section class="card brief" aria-labelledby="b"><h2 id="b">Hoy en 5 minutos</h2><p class="mut">${today.length} piezas · ${mins} min de lectura en total</p>${today.map((p) => `<div class="src"><a href="#/p/${p.id}"><b>${esc(p.title)}</b></a><span class="mut">${p.min} min · <span class="chip t-${p.type}">${TYPES[p.type]}</span> · ${sealTxt(p)}</span></div>`).join("")}</section>` : ""}
      ${S.serie ? `<p class="mut">Serie: ${esc(S.serie)} · <button class="btn alt" data-a="serie" data-s="">Quitar filtro</button></p>` : ""}
      ${feed.map(card).join("") || '<div class="card">No hay piezas para este filtro todavía.</div>'}<div class="end" role="status"><b>Está al día</b>No hay más por hoy. Vuelva mañana o active el resumen semanal.</div>`;
    },
    guardados() { const l = PIECES.filter((p) => mk(p.id, "guardar")); return H1("Guardados") + (l.map(card).join("") || '<div class="card">Aún no guardó nada. Use «Guardar» en cualquier pieza.</div>'); },
    p(id) {
      const p = PIECES.find((x) => x.id === id); if (!p) return V.home();
      const body = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\{\{(.+?)\}\}/g, (m, k) => `<button class="term" data-a="term" data-k="${esc(k)}" aria-expanded="${!!S.pops[k]}">${esc(k)}</button>${S.pops[k] && p.terms[k] ? `<span class="pop" role="note"> ${esc(p.terms[k])}</span>` : ""}`);
      const qz = p.quiz.map((q, i) => { const r = S.qz[p.id + i]; return `<div class="q"><b>${esc(q.q)}</b>${q.o.map((o, j) => `<label><input type="radio" name="q${i}" data-a="qa" data-q="${i}" value="${j}" ${r && r.v === j ? "checked" : ""}> ${esc(o)}</label>`).join("")}${r ? `<div class="res" style="display:block;font-weight:700">${r.v === q.a ? "Correcto. " : "Revise: "}${esc(q.e)}</div>` : ""}</div>`; }).join("");
      const ps = PERSP[p.id], ok = !!S.shareOk[p.id];
      return `<p><a href="#/">← Volver al inicio</a></p><article class="card"><span class="chip t-${p.type}">${TYPES[p.type]}</span>${p.format ? ` <span class="chip fmt">${esc(p.format)}</span>` : ""} <span class="mut">${p.min} min · ${p.date.slice(8)} oct 2026</span>
      <h1 class="serif title" style="font-size:1.7rem">${esc(p.title)}</h1><div class="sum"><b>En 20 segundos</b>${esc(p.sum)}</div>${seal(p)}${p.video ? `<div class="vid"><button type="button">Reproducir (YouTube sin cookies)</button></div>` : ""}
      <div class="know"><section><h3>Se sabe</h3><ul>${p.know.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section><section><h3>No se sabe</h3><ul>${p.unknown.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section><section><h3>Por qué importa</h3><p style="margin:.2rem 0">${esc(p.why)}</p></section></div>
      <div class="body">${p.body.map((t) => `<p>${body(t)}</p>`).join("")}</div>
      ${ps ? `<h2 style="font-size:1.05rem;margin-top:1rem">Perspectivas</h2><p class="mut">Sin bandos: lo que comparten y lo que no las distintas posturas.</p><div class="persp"><div><h3>Dónde coinciden</h3><ul>${ps.coinciden.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div><div><h3>Dónde difieren</h3><ul>${ps.difieren.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div><div><h3>Qué evidencia cambiaría la conversación</h3><ul>${ps.cambiaria.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div></div>` : ""}
      ${(p.corr || []).length ? `<div class="seal mod" style="display:block"><b>Correcciones</b>${p.corr.map((c) => `<div>${c.d}: ${esc(c.t)}</div>`).join("")}</div>` : ""}
      <h2 style="font-size:1.05rem;margin-top:1rem">Fuentes (${p.sources.length})</h2>${p.sources.map((s) => `<div class="src"><b>${esc(s.t)}</b><span class="mut">${esc(s.k)} · ${esc(s.n)}</span></div>`).join("")}
      <h2 style="font-size:1.05rem;margin-top:1rem">Cómo sabemos esto</h2><p>${p.scope ? esc(p.scope) : "Esta pieza todavía no ha sido verificada por una persona revisora. El sello solo lo otorga quien revisa, nunca quien escribe."}</p>
      ${p.quiz.length ? `<h2 style="font-size:1.05rem;margin-top:1rem">¿Qué entendí?</h2><p class="mut">Solo para usted: no se guarda ni se mide.</p>${qz}` : ""}
      <h2 style="font-size:1.05rem;margin-top:1rem">Compartir con contexto</h2><label style="display:flex;gap:.5rem;margin:.4rem 0"><input type="checkbox" data-a="shareok" data-id="${p.id}" ${ok ? "checked" : ""}> Leí la pieza y quiero compartirla con su sello y sus fuentes.</label>
      <div class="wa"><b>${esc(p.title)}</b><br>${esc(sealTxt(p))}<br>${esc(p.sum)}<div class="u">agora.ejemplo.cr</div></div>
      <div class="acts"><a class="btn" ${ok ? `href="${wa(p)}" target="_blank" rel="noopener noreferrer"` : 'aria-disabled="true" role="link" data-a="needread"'} style="color:var(--brand-ink);${ok ? "" : "opacity:.5"}">${ic("chat")} Compartir por WhatsApp</a>${can("save") ? `<button data-a="mk" data-id="${p.id}" data-k="guardar" aria-pressed="${mk(p.id, "guardar")}">${ic("mark")} Guardar</button>` : ""}</div>
      ${can("report") ? `<details style="margin-top:.8rem"><summary>Señalar un error o una fuente que falta</summary><textarea id="err" aria-label="Describa el error"></textarea><button class="btn" data-a="err" data-id="${p.id}">Enviar al equipo</button></details>` : `<p class="mut" style="margin-top:.8rem">¿Encontró un error? ${login}</p>`}</article>`;
    },
    escucha() {
      const n = Object.keys(S.votes).length, items = ESCUCHA.items, cons = items.filter((x) => Math.min(...x.g) >= 75), div = items.filter((x) => Math.max(...x.g) - Math.min(...x.g) >= 50);
      const bars = (x) => ESCUCHA.grupos.map((g, i) => `<div class="res"><span>${g}</span><div class="bar"><i style="width:${x.g[i]}%"></i></div><b>${x.g[i]} %</b></div>`).join("");
      return H1("Escucha ciudadana") + `<div class="card"><b>${esc(ESCUCHA.tema)}</b><p class="mut">Vote cada afirmación: <b>de acuerdo, en desacuerdo o paso</b>. No hay comentarios ni respuestas entre personas: solo se muestra dónde coinciden y dónde se dividen las opiniones.</p><div class="notice">${esc(ESCUCHA.nota)}</div></div>
      ${items.map((x) => `<div class="card"><p style="margin:.1rem 0 0"><b>${esc(x.t)}</b></p>${can("vote") ? `<div class="vote" role="group" aria-label="Su voto">${[["a", "De acuerdo"], ["d", "En desacuerdo"], ["p", "Paso"]].map(([k, t]) => `<button data-a="vote" data-id="${x.id}" data-v="${k}" aria-pressed="${S.votes[x.id] === k}">${t}</button>`).join("")}</div>` : `<p class="mut">Para votar: ${login}</p>`}</div>`).join("")}
      ${n >= 3 || !can("vote") ? `<div class="card"><h2 style="font-size:1.1rem">Lo que muestran los resultados</h2><p class="mut">Estos porcentajes son de ejemplo. Su voto se suma al de otras personas y no se muestra de forma individual.</p>
        <h3 style="font-size:.95rem">Acuerdos entre todos los grupos</h3>${cons.map((x) => `<p><b>${esc(x.t)}</b></p>${bars(x)}`).join("")}
        <h3 style="font-size:.95rem">Dónde las opiniones se dividen</h3><p class="mut">No es un problema: es información sobre lo que falta conversar y medir.</p>${div.map((x) => `<p><b>${esc(x.t)}</b></p>${bars(x)}`).join("")}</div>` : `<div class="notice">Vote al menos 3 afirmaciones para ver los resultados (${n}/3).</div>`}
      ${can("vote") ? `<div class="card"><b>Proponga una afirmación</b><p class="mut">Una idea por frase, sin ataques. La moderación la revisa antes de publicarla.</p><textarea id="prop" maxlength="140" aria-label="Su afirmación"></textarea><button class="btn" data-a="prop">Enviar a moderación</button></div>` : ""}`;
    },
    editorial() {
      if (!can("write")) return deny("write");
      const e = S.ed, srcs = e.src.split("\n").filter((l) => /https?:\/\/\S+/.test(l)).length, needNo = e.type !== "opinion";
      const ck = [["Titular informativo (1–90 caracteres)", e.title.length > 0 && e.title.length <= 90], ["«En 20 segundos» (1–280 caracteres)", e.sum.length > 0 && e.sum.length <= 280], ["Tipo definido", !!e.type], [`Al menos 2 fuentes con enlace (hay ${srcs})`, srcs >= 2], ["«Se sabe» y «No se sabe» completos", e.know.trim() && (e.unk.trim() || !needNo)], ["Imágenes con texto alternativo", e.alt], ["Redacción original", e.orig], ["Términos difíciles enlazados al glosario", e.gl]].map(([t, ok]) => [t, !!ok]);
      const pv = { id: "preview", type: e.type || "hechos", min: 2, date: "2026-10-24", author: "Usted (borrador)", title: e.title || "Titular de la pieza", sum: e.sum || "Resumen de 20 segundos…", seal: "pending", sources: new Array(srcs) };
      const f = (k, l, max, ta) => `<label style="display:block;margin:.5rem 0"><b>${l}</b>${ta ? `<textarea data-e="${k}">${esc(e[k])}</textarea>` : `<input type="text" data-e="${k}" value="${esc(e[k])}">`}<div class="cnt ${e[k].length > max ? "over" : ""}">${e[k].length}/${max}</div></label>`;
      return H1("Redactar una pieza") + `<div class="card">${f("title", "Titular", 90)}${f("sum", "En 20 segundos", 280, 1)}<label style="display:block"><b>Tipo</b><select data-e="type"><option value="">Elija…</option>${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${e.type === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      ${f("know", "Se sabe", 600, 1)}${f("unk", "No se sabe", 400, 1)}${f("why", "Por qué importa", 400, 1)}<label style="display:block"><b>Fuentes (una por línea, con enlace)</b><textarea data-e="src" placeholder="Nombre de la fuente https://…"></textarea></label>
      ${[["alt", "Mis imágenes tienen texto alternativo"], ["orig", "La redacción es original"], ["gl", "Enlacé los términos difíciles al glosario"]].map(([k, t]) => `<label style="display:flex;gap:.5rem;margin:.3rem 0"><input type="checkbox" data-e="${k}" ${e[k] ? "checked" : ""}> ${t}</label>`).join("")}</div>
      <div class="card"><h2 style="font-size:1.05rem">Lista de control de publicación</h2><ul class="chk">${ck.map(([t, ok]) => `<li><span class="${ok ? "o" : "x"}">${ok ? "✓" : "✕"}</span>${esc(t)}</li>`).join("")}</ul><button class="btn" data-a="ready" ${ck.every((x) => x[1]) ? "" : "disabled"}>Enviar a revisión</button><p class="mut">El sello lo otorga una persona revisora distinta de usted.</p></div><h2 style="font-size:1rem;margin:1rem 0 .4rem">Así se verá</h2>${card(pv)}`;
    },
    revision() {
      if (!can("review")) return deny("review");
      const q = PIECES.filter((p) => p.seal !== "ok"), cur = PIECES.find((p) => p.id === S.rev.id), blocked = cur && cur.authoredBy === role, allOk = S.rev.c.every(Boolean) && S.rev.scope.trim().length >= 20 && !blocked;
      const CK = ["Comprobé que cada fuente existe y dice lo que se le atribuye", "Las afirmaciones factuales están respaldadas por al menos dos fuentes (o una primaria)", "«Se sabe / No se sabe» refleja el límite real del conocimiento"];
      return H1("Cola de revisión") + `<p class="mut">Piezas sin sello vigente. El sello certifica un <b>alcance escrito</b>, no que todo sea verdad.</p>${q.map((p) => `<div class="card row2"><span><b>${esc(p.title)}</b><br><span class="mut">${esc(p.author)} · ${sealTxt(p)}</span></span><button class="btn alt" data-a="rvsel" data-id="${p.id}">Revisar</button></div>`).join("") || '<div class="card">No hay piezas pendientes.</div>'}
      ${cur ? `<div class="card"><h2 style="font-size:1.1rem">${esc(cur.title)}</h2>${blocked ? `<div class="notice">Usted escribió esta pieza. La revisa otra persona (separación de funciones).</div>` : ""}
      ${CK.map((t, i) => `<label style="display:flex;gap:.5rem;margin:.3rem 0"><input type="checkbox" data-a="rvck" data-i="${i}" ${S.rev.c[i] ? "checked" : ""}> ${t}</label>`).join("")}
      <label style="display:block;margin:.5rem 0"><b>Alcance de la verificación (obligatorio, mín. 20 caracteres)</b><textarea data-a="rvscope" placeholder="Qué se revisó y qué no…">${esc(S.rev.scope)}</textarea></label>
      <button class="btn" data-a="grant" data-id="${cur.id}" ${allOk ? "" : "disabled"}>Otorgar sello</button> <button class="btn alt" data-a="back" data-id="${cur.id}">Devolver con comentarios</button></div>` : ""}`;
    },
    curaduria() {
      if (!can("curate")) return deny("curate");
      const mins = PIECES.filter((p) => S.today.has(p.id)).reduce((a, p) => a + p.min, 0);
      return H1("Curaduría") + `<p class="mut">Elija lo que aparece en «Hoy en 5 minutos». Tope sugerido: 5 minutos y un solo tema duro por día.</p><div class="card"><b>Seleccionado: ${mins} min</b> ${mins > 5 ? `<span class="chip" style="color:var(--warn)">${ic("clock")} Pasa de 5 minutos</span>` : `<span class="chip" style="color:var(--ok)">${ic("check")} Dentro del tope</span>`}</div>
      ${PIECES.map((p) => `<label class="card row2"><input type="checkbox" data-a="today" data-id="${p.id}" ${S.today.has(p.id) ? "checked" : ""} style="width:1.2rem;height:1.2rem"><span><b>${esc(p.title)}</b><br><span class="mut">${p.min} min · ${TYPES[p.type]} · ${sealTxt(p)}</span></span></label>`).join("")}<p class="mut">La curaduría no cambia los sellos ni el contenido.</p>`;
    },
    bandeja() {
      if (!can("moderate")) return deny("moderate");
      const sec = (t, l, fn) => `<h2 style="font-size:1.05rem;margin:1rem 0 .4rem">${t} (${l.filter((x) => !["resuelto", "publicada", "descartada", "aprobada", "rechazada"].includes(x.st)).length} pendientes)</h2>${l.map(fn).join("")}`;
      return H1("Bandeja de moderación") + `<div class="notice">Se modera lo factual y el lenguaje hiriente, <b>no las opiniones</b>. No se edita el contenido: se deriva a quien corresponde.</div>
      ${sec("Errores señalados", S.errors, (x) => `<div class="card row2"><span>«${esc(x.text)}» <span class="tag">${x.piece}</span> <span class="tag">${x.st}</span></span>${x.st === "nuevo" ? `<button class="btn" data-a="bres" data-k="errors" data-id="${x.id}">Derivar a redacción y avisar</button>` : ""}</div>`)}
      ${sec("Preguntas al especialista", S.asks, (x) => `<div class="card row2"><span>${esc(x.text)} <span class="tag">${x.st}</span></span>${x.st === "nueva" ? `<button class="btn" data-a="bres" data-k="asks" data-id="${x.id}" data-v="publicada">Pasar a revisora</button><button class="btn alt" data-a="bres" data-k="asks" data-id="${x.id}" data-v="descartada">Descartar</button>` : ""}</div>`)}
      ${sec("Propuestas para la escucha ciudadana", S.props, (x) => `<div class="card row2"><span>${esc(x.text)} <span class="tag">${x.st}</span></span>${x.st === "propuesta" ? `<button class="btn" data-a="bres" data-k="props" data-id="${x.id}" data-v="aprobada">Aprobar</button><button class="btn alt" data-a="bres" data-k="props" data-id="${x.id}" data-v="rechazada">Rechazar (ataque personal)</button>` : ""}</div>`)}`;
    },
    admin() {
      if (!can("admin")) return deny("admin");
      return H1("Administración") + `<div class="card"><h2 style="font-size:1.05rem">Cuentas y roles</h2><table class="tbl"><tr><th>Persona</th><th>Rol</th></tr>${S.users.map((u, i) => `<tr><td>${esc(u.n)}</td><td><select data-a="urole" data-i="${i}" aria-label="Rol de ${esc(u.n)}">${ROLES.filter((r) => r.id !== "anon").map((r) => `<option value="${r.id}" ${u.r === r.id ? "selected" : ""} ${r.id === "owner" && role !== "owner" ? "disabled" : ""}>${r.short}</option>`).join("")}</select></td></tr>`).join("")}</table><p class="mut">Solo el propietario asigna el rol de propietario. Todo cambio queda en la auditoría.</p></div>
      <div class="card" style="overflow-x:auto"><h2 style="font-size:1.05rem">Matriz de permisos</h2><table class="tbl"><tr><th>Capacidad</th>${ROLES.map((r) => `<th class="c">${r.short}</th>`).join("")}</tr>${CAPS.map(([c, t]) => `<tr><td>${t}</td>${ROLES.map((r) => `<td class="c ${CAN[r.id].includes(c) ? "y" : "n"}">${CAN[r.id].includes(c) ? "✓" : "—"}</td>`).join("")}</tr>`).join("")}</table></div>
      ${can("settings") ? `<div class="card"><h2 style="font-size:1.05rem">Ajustes de la plataforma (solo propietario)</h2><label style="display:flex;gap:.5rem;margin:.3rem 0"><input type="checkbox" checked disabled> Escucha ciudadana activa</label><label style="display:flex;gap:.5rem;margin:.3rem 0"><input type="checkbox" disabled> Comentarios abiertos <span class="mut">(bloqueado hasta la etapa «Comunidad»: requiere moderación y política)</span></label></div>` : ""}
      <div class="card"><h2 style="font-size:1.05rem">Auditoría</h2><ul style="margin:0;padding-left:1.1rem">${S.audit.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></div>`;
    },
  };

  const NAV = [["#/", "home", "Inicio", ""], ["#/f/actualidad", "news", "Actualidad", "actualidad"], ["#/f/videos", "play", "Videos", "videos"], ["#/f/guias", "book", "Guías", "guias"], ["#/escucha", "vote", "Escucha ciudadana", "escucha"], ["#/guardados", "mark", "Guardados", "guardados", "save"], ["#/editorial", "pen", "Redactar", "editorial", "write"], ["#/revision", "shield", "Revisión", "revision", "review"], ["#/curaduria", "layers", "Curaduría", "curaduria", "curate"], ["#/bandeja", "inbox", "Bandeja", "bandeja", "moderate"], ["#/admin", "users", "Administración", "admin", "admin"]];
  const render = () => {
    const r = route(), key = r.n === "home" ? "" : r.n === "f" ? r.a : r.n, a = document.activeElement, de = a && a.dataset && (a.dataset.e || (a.dataset.a === "rvscope" ? "rvscope" : null)), pos = a && a.selectionStart;
    const cap = NEED[r.n]; $("#main").innerHTML = cap && !can(cap) ? deny(cap) : r.n === "p" ? V.p(r.a) : V[r.n] && r.n !== "home" ? V[r.n]() : V.home(r.n === "f" ? r.a : "");
    const items = NAV.filter((x) => !x[4] || can(x[4])), cur = (k) => (k === key ? ' aria-current="page"' : "");
    $("#side").innerHTML = items.map(([h, i, t, k]) => `<a href="${h}"${cur(k)}>${ic(i)}${t}</a>`).join("");
    const spec = items.filter((x) => x[4] && x[4] !== "save"), tabs = [items[0], items[1], items.find((x) => x[3] === "escucha"), ...(spec.length ? spec.slice(0, 2) : [items.find((x) => x[3] === "videos"), items.find((x) => x[3] === "guardados") || items[3]])].filter(Boolean);
    $("#tabs").innerHTML = tabs.slice(0, 5).map(([h, i, t, k]) => `<a href="${h}"${cur(k)}>${ic(i)}${t.replace("Escucha ciudadana", "Escucha")}</a>`).join("");
    $("#user").innerHTML = role === "anon" ? '<button class="btn" data-a="login" style="min-height:36px;padding:.3rem .9rem">Entrar</button>' : `<span class="userchip"><span class="av" aria-hidden="true">${roleInfo().short[0]}</span>${roleInfo().short}</span>`;
    $("#rail").innerHTML = `${S.calm ? "" : `<section class="card"><h2 style="font-size:1rem">Actualidad enlazada</h2>${NEWS.map((n) => `<p style="margin:.5rem 0"><b>${n.t}</b><br><span class="mut">${n.ctx}</span></p>`).join("")}</section>`}
      <section class="card"><h2 style="font-size:1rem">Pregunte al especialista</h2>${can("ask") ? `<p class="mut">Se publican solo las preguntas que el equipo selecciona.</p><textarea id="ask" maxlength="280" aria-label="Su pregunta"></textarea><button class="btn" data-a="ask">Enviar</button>` : `<p class="mut">Para preguntar necesita una cuenta gratuita.</p>${login}`}</section>
      <section class="card"><h2 style="font-size:1rem">Glosario del día</h2><p><b>IPC</b>: índice que mide la variación de precios de una canasta fija.</p></section>`;
    if (de) { const n = $(`[data-e="${de}"]`) || $(`[data-a="${de}"]`); if (n && n.type !== "checkbox") { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* select */ } } }
  };

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-a],[data-sz],#theme,#calm"); if (!t) return;
    if (t.dataset.sz != null) { $$("[data-sz]").forEach((b) => b.setAttribute("aria-pressed", String(b === t))); document.documentElement.style.setProperty("--fs", ["16px", "18px", "21px"][+t.dataset.sz]); return; }
    if (t.id === "theme") { const c = document.documentElement.dataset.theme; DevKit.applyTheme(c === "dark" ? "light" : c === "light" ? "auto" : "dark"); $$("#devbar [data-t]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.t === (document.documentElement.dataset.theme || "auto")))); return; }
    if (t.id === "calm") { S.calm = !S.calm; t.setAttribute("aria-pressed", String(S.calm)); toast(S.calm ? "Modo calma activado por 24 horas" : "Modo calma desactivado"); return render(); }
    const a = t.dataset.a, id = t.dataset.id;
    if (a === "login") return toast("Aquí iría el registro (gratis). Pruebe el rol «Persona registrada» en la barra de desarrollo.");
    if (a === "needread") return toast("Para compartir con contexto, primero marque que leyó la pieza.");
    if (a === "mk") { const m = (S.marks[id] = S.marks[id] || {}); m[t.dataset.k] = !m[t.dataset.k]; save("agora.marks", S.marks); if (t.dataset.k === "mas" && m.mas) toast("Anotado: el equipo verá que quiere más fuentes"); if (t.dataset.k === "guardar") toast(m.guardar ? "Guardado" : "Quitado de guardados"); return render(); }
    if (a === "serie") { S.serie = t.dataset.s || null; return render(); }
    if (a === "term") { S.pops[t.dataset.k] = !S.pops[t.dataset.k]; return render(); }
    if (a === "int") { t.setAttribute("aria-pressed", String(t.getAttribute("aria-pressed") !== "true")); return; }
    if (a === "intok") { S.interests = $$("[data-a=int][aria-pressed=true]").map((b) => b.dataset.i); save("agora.int", S.interests); toast("Listo: ajustamos su inicio"); return render(); }
    if (a === "intno") { S.interests = []; save("agora.int", S.interests); return render(); }
    if (a === "ask") { const n = $("#ask"); if (!n.value.trim()) return toast("Escriba su pregunta"); S.asks.unshift({ id: "q" + (S.asks.length + 1), text: n.value.trim(), st: "nueva" }); n.value = ""; return toast("Recibida. Solo se publican las que el equipo selecciona."); }
    if (a === "err") { const n = $("#err"); if (!n.value.trim()) return toast("Describa el error"); S.errors.unshift({ id: "e" + (S.errors.length + 1), piece: id, text: n.value.trim(), st: "nuevo" }); n.value = ""; return toast("Gracias: llegó a la bandeja editorial"); }
    if (a === "vote") { S.votes[id] = S.votes[id] === t.dataset.v ? undefined : t.dataset.v; if (!S.votes[id]) delete S.votes[id]; return render(); }
    if (a === "prop") { const n = $("#prop"); if (!n.value.trim()) return toast("Escriba su afirmación"); S.props.unshift({ id: "p" + (S.props.length + 1), text: n.value.trim(), st: "propuesta" }); return toast("Enviada a moderación. Se publica si cumple las reglas."); }
    if (a === "ready") return toast("Enviada a la cola de revisión. El sello lo otorga una persona revisora distinta de usted.");
    if (a === "rvsel") { S.rev = { id, c: [false, false, false], scope: "" }; return render(); }
    if (a === "grant") { const p = PIECES.find((x) => x.id === id); p.seal = "ok"; p.sealBy = "Revisora (usted)"; p.sealDate = "24 oct"; p.scope = S.rev.scope; log(`otorgó sello a «${p.title.slice(0, 40)}…»`); S.rev = { id: null, c: [false, false, false], scope: "" }; toast("Sello otorgado con su alcance escrito"); return render(); }
    if (a === "back") { log(`devolvió con comentarios «${PIECES.find((x) => x.id === id).title.slice(0, 40)}…»`); S.rev = { id: null, c: [false, false, false], scope: "" }; toast("Devuelta a la autora con sus comentarios"); return render(); }
    if (a === "bres") { const x = S[t.dataset.k].find((y) => y.id === id); x.st = t.dataset.v || "resuelto"; log(`resolvió ${t.dataset.k === "errors" ? "un error señalado" : t.dataset.k === "asks" ? "una pregunta" : "una propuesta"}`); toast(t.dataset.k === "errors" ? "Derivado a redacción; se avisó a quien lo señaló" : "Hecho"); return render(); }
  });
  document.addEventListener("change", (e) => { const t = e.target, a = t.dataset.a;
    if (a === "qa") { const id = route().a; S.qz[id + t.dataset.q] = { v: +t.value }; return render(); }
    if (a === "shareok") { S.shareOk[t.dataset.id] = t.checked; return render(); }
    if (a === "rvck") { S.rev.c[+t.dataset.i] = t.checked; return render(); }
    if (a === "today") { t.checked ? S.today.add(t.dataset.id) : S.today.delete(t.dataset.id); log("actualizó «Hoy en 5 minutos»"); return render(); }
    if (a === "urole") { const u = S.users[+t.dataset.i], prev = u.r; u.r = t.value; log(`cambió el rol de ${u.n}: ${prev} → ${u.r}`); toast("Rol actualizado y auditado"); return render(); }
    if (t.dataset.e) { S.ed[t.dataset.e] = t.type === "checkbox" ? t.checked : t.value; render(); } });
  document.addEventListener("input", (e) => { const t = e.target;
    if (t.id === "q") { S.q = t.value; if (route().n !== "home") location.hash = "#/"; return render(); }
    if (t.dataset.a === "rvscope") { S.rev.scope = t.value; return render(); }
    if (t.dataset.e && t.type !== "checkbox" && t.tagName !== "SELECT") { S.ed[t.dataset.e] = t.value; render(); } });
  window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
  DevKit.init({ app: "agora", roles: ROLES, role: "anon", onRole: (id) => { role = id; render(); } });
})();
