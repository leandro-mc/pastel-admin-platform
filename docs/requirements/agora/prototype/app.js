/* Ágora (prototipo). CONTENIDO DE EJEMPLO: piezas evergreen escritas para ilustrar el formato; personas y revisores son ficticios.
   Sin servidor: las acciones se guardan en el navegador (con respaldo en memoria si no hay localStorage). */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = (() => { try { localStorage.setItem("_t", "1"); localStorage.removeItem("_t"); return localStorage; } catch (e) { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } }; } })();
  const load = (k, d) => { try { const v = JSON.parse(store.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }, save = (k, v) => store.setItem(k, JSON.stringify(v));
  const I = { home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>', news: '<path d="M4 5h13v14H5a1 1 0 0 1-1-1zM17 9h3v9a1 1 0 0 1-1 1M7 9h7M7 13h7"/>', play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.500l6 3.500-6 3.500z"/>', book: '<path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2zM4 19V5"/>', mark: '<path d="M6 3h12v18l-6-4-6 4z"/>', pen: '<path d="M4 20l1-4L16 5l3 3L8 19zM14 7l3 3"/>', check: '<path d="M5 12l5 5L20 7"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', edit: '<path d="M4 20l1-4L16 5l3 3L8 19z"/>', chat: '<path d="M21 12a8 8 0 0 1-11.600 7.100L4 20l1-4.600A8 8 0 1 1 21 12z"/>', help: '<circle cx="12" cy="12" r="9"/><path d="M9.500 9a2.500 2.500 0 1 1 3.500 2.300c-.7.400-1 1-1 1.700M12 17h.01"/>', plus: '<path d="M12 5v14M5 12h14"/>' };
  const ic = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;

  const TYPES = { hechos: "Hechos documentados", analisis: "Análisis", opinion: "Opinión" };
  const P = (o) => o;
  const PIECES = [
    P({ id: "whatsapp", today: true, cat: "guias", serie: "Verifique antes de compartir", type: "hechos", min: 2, date: "2026-10-22", author: "Equipo Ágora (ejemplo)", seal: "ok", sealBy: "Revisora Ejemplo", sealDate: "22 oct",
      scope: "Se revisó que las cuatro preguntas sean consistentes con las guías públicas de verificación citadas.", title: "Cuatro preguntas antes de reenviar un mensaje por WhatsApp",
      sum: "Antes de reenviar, pregunte quién lo dice, cuándo, dónde se confirma y qué quiere que usted haga. Si no puede responder, mejor no lo reenvíe.",
      know: ["Un mensaje sin autor ni fecha es información sin confirmar.", "Una imagen puede ser real pero de otro lugar o de otro año.", "Los textos que piden «reenviar urgente» apelan a la emoción, no a la prueba."], unknown: ["A veces no se puede confirmar rápido. En ese caso, esperar también es una forma de cuidar a los demás."],
      why: "Reenviar es publicar: cada persona que lo hace se vuelve parte de la cadena.", body: ["Pregunte primero **quién** lo dice: ¿hay un nombre, una institución, un enlace que pueda abrir?", "Luego **cuándo**: busque la {{fecha}} original. Muchas imágenes viejas vuelven a circular como si fueran nuevas.", "Después, **dónde se confirma**: si es importante, otras fuentes serias lo estarán contando."],
      terms: { fecha: "La fecha de la primera publicación, no la del día en que le llegó el mensaje." },
      sources: [{ t: "Código de principios de la International Fact-Checking Network", k: "Primaria", n: "Estándares de verificación de las organizaciones que verifican datos." }, { t: "Ayuda oficial de búsqueda inversa de imágenes de un buscador", k: "Oficial", n: "Cómo comprobar si una imagen ya circuló antes." }],
      quiz: [{ q: "Le llega un audio sin autor que pide «reenviar urgente». ¿Qué conviene hacer?", o: ["Reenviarlo por si acaso", "Buscar quién lo dice y dónde se confirma", "Borrarlo y reenviar otro parecido"], a: 1, e: "Sin autor ni confirmación, lo prudente es verificar antes de difundir." }] }),
    P({ id: "presupuesto", today: true, cat: "guias", serie: "Cómo funciona", type: "hechos", min: 3, date: "2026-10-20", author: "Equipo Ágora (ejemplo)", seal: "ok", sealBy: "Revisora Ejemplo", sealDate: "20 oct",
      scope: "Se revisó que la descripción general del ciclo presupuestario coincida con las fuentes oficiales citadas.", title: "¿Qué es el presupuesto nacional y por qué se discute cada año?",
      sum: "El presupuesto es el plan de ingresos y gastos del Estado para un año. El Ejecutivo lo propone y la Asamblea Legislativa lo discute y aprueba.",
      know: ["Es un plan anual: calcula cuánto dinero entrará y en qué se usará.", "Lo propone el Poder Ejecutivo y lo aprueba la Asamblea Legislativa.", "Lo aprobado es una autorización de gasto, no una promesa de que todo se cumpla."], unknown: ["Cuánto se ejecutará realmente de cada partida cambia cada año: se ve en los informes de ejecución."],
      why: "Define qué servicios se financian. Entenderlo ayuda a leer noticias sobre recortes o aumentos sin confundirse.", body: ["El Estado recibe {{ingresos}}, sobre todo por impuestos, y los destina a salud, educación, carreteras, seguridad y otros servicios.", "Cada rubro tiene una {{partida}} con un monto autorizado. Lo que finalmente se gasta es la {{ejecución}}, y puede ser menor o distinta de lo autorizado."],
      terms: { ingresos: "Dinero que el Estado recibe, sobre todo por impuestos.", partida: "Rubro dentro del presupuesto con un monto autorizado.", "ejecución": "Cuánto del dinero autorizado se gastó realmente." },
      sources: [{ t: "Constitución Política de Costa Rica (texto oficial)", k: "Primaria", n: "Marco general del presupuesto de la República." }, { t: "Ministerio de Hacienda: portal de presupuesto", k: "Oficial", n: "Explicaciones y documentos del proyecto de ley." }, { t: "Contraloría General de la República: informes", k: "Oficial", n: "Fiscalización de la ejecución presupuestaria." }],
      quiz: [{ q: "¿Quién aprueba el presupuesto?", o: ["La Asamblea Legislativa", "El Banco Central", "Cada ministerio por separado"], a: 0, e: "El Ejecutivo lo propone y la Asamblea lo aprueba." }, { q: "Un presupuesto aprobado es…", o: ["Una autorización de gasto", "Una garantía de que se gastará todo", "Un informe de lo gastado"], a: 0, e: "Autoriza gastar; lo realmente gastado se ve en la ejecución." }] }),
    P({ id: "inflacion", cat: "guias", serie: "Economía en casa", type: "analisis", min: 4, date: "2026-10-18", author: "Equipo Ágora (ejemplo)", seal: "pending", title: "¿Cómo leer un dato de inflación sin confundirse?",
      sum: "La inflación mide cuánto cambian los precios de una canasta de productos. Un mismo dato puede ser mensual o interanual, y no significan lo mismo.",
      know: ["Se calcula comparando el costo de una canasta de bienes y servicios entre dos fechas.", "«Mensual» compara con el mes anterior; «interanual», con el mismo mes del año pasado.", "Inflación baja no es que los precios bajen: es que suben más despacio."], unknown: ["Su canasta personal puede subir distinto a la canasta promedio."],
      why: "Permite entender titulares sobre costo de vida sin sacar conclusiones apresuradas.", body: ["El {{IPC}} se calcula con una canasta fija. Cuando un titular dice «inflación de X %», revise si habla de un mes o de doce."], terms: { IPC: "Índice de Precios al Consumidor: mide la variación de precios de una canasta fija." },
      sources: [{ t: "INEC: índice de precios al consumidor", k: "Oficial", n: "Metodología y series publicadas." }, { t: "Banco Central de Costa Rica: informes de inflación", k: "Oficial", n: "Análisis y definiciones." }],
      quiz: [{ q: "«Inflación interanual» compara con…", o: ["El mes anterior", "El mismo mes del año pasado", "El promedio de los últimos 10 años"], a: 1, e: "Interanual: mismo mes, un año antes." }] }),
    P({ id: "deuda", cat: "guias", video: true, serie: "Cómo funciona", type: "hechos", min: 3, date: "2026-10-16", author: "Equipo Ágora (ejemplo)", seal: "mod", sealBy: "Revisora Ejemplo", sealDate: "16 oct", title: "Deuda y déficit: una explicación de 3 minutos",
      scope: "Se revisó la versión original; la corrección posterior aclara un término y está pendiente de nueva revisión.", sum: "El déficit es lo que falta en un año cuando se gasta más de lo que entra. La deuda es la suma acumulada de lo que se debe.",
      know: ["Déficit: resultado de un solo año.", "Deuda: acumulado de varios años.", "Un año con déficit suele aumentar la deuda; uno con superávit puede reducirla."], unknown: ["Qué nivel de deuda es «sostenible» depende de muchos factores y se discute entre especialistas."], why: "Son los dos conceptos que más se confunden en noticias económicas.",
      body: ["Piense en un hogar: si un mes gasta más de lo que gana, ese mes tiene un déficit. Si lo cubre con préstamo, su deuda crece."], terms: {}, corr: [{ d: "20 oct", t: "Se aclaró la diferencia entre deuda (acumulado) y déficit (resultado de un año)." }],
      sources: [{ t: "Ministerio de Hacienda: informes fiscales", k: "Oficial", n: "Definiciones y cifras." }], quiz: [{ q: "El déficit se refiere a…", o: ["Todo lo que se debe", "Lo que falta en un año", "Los impuestos cobrados"], a: 1, e: "Déficit es el faltante de un periodo; la deuda es el acumulado." }] }),
    P({ id: "contexto", cat: "opinion", serie: "Verifique antes de compartir", type: "opinion", min: 2, date: "2026-10-15", author: "Colaboración (ejemplo)", seal: "pending", title: "Por qué conviene leer el contexto antes de compartir",
      sum: "Opinión: compartir rápido es fácil; leer el contexto cuesta dos minutos. Esos dos minutos evitan la mayoría de los errores.", know: ["Esta es una opinión: expresa una postura, no un hecho comprobado."], unknown: ["No se midió cuántos errores se evitarían; es una apreciación de la autora."], why: "Invita a una pausa breve antes de difundir.", body: ["Compartir es una forma de hablar en público. Un buen hábito es leer, al menos, el segundo párrafo."], terms: {}, sources: [{ t: "Nota editorial de Ágora sobre estándares", k: "Interna", n: "Cómo se distingue opinión de hechos." }], quiz: [] }),
  ];
  const NEWS = [{ t: "Tema de actualidad 1 (ejemplo)", ctx: "Contexto de Ágora: qué conceptos ayudan a leer esta noticia. El enlace lleva al medio original; Ágora no copia el texto.", src: "Medio de ejemplo" }, { t: "Tema de actualidad 2 (ejemplo)", ctx: "Contexto de Ágora: antecedentes y qué se sabe y qué no.", src: "Medio de ejemplo" }];
  const SERIES = [["Cómo funciona", "Estado"], ["Verifique antes de compartir", "Verificar"], ["Economía en casa", "Economía"], ["Historia cercana", "Historia"], ["Ambiente", "Ambiente"]];
  const INTERESTS = ["Cómo funciona", "Economía en casa", "Verifique antes de compartir", "Historia cercana", "Ambiente"];

  const S = { calm: false, serie: null, q: "", marks: load("agora.marks", {}), interests: load("agora.int", null), pops: {}, qz: {}, ed: { title: "", sum: "", type: "", know: "", unk: "", why: "", src: "", alt: false, orig: false, gl: false } };
  const sealTxt = (p) => (p.seal === "ok" ? `Verificado por ${p.sealBy} · ${p.sealDate}` : p.seal === "mod" ? `Modificada tras la verificación · ${p.sealDate}` : "Pendiente de verificación");
  const seal = (p) => `<div class="seal ${p.seal}">${ic(p.seal === "ok" ? "check" : p.seal === "mod" ? "edit" : "clock")}<span>${sealTxt(p)}</span></div>`;
  const toast = (t) => { const n = $("#toast"); n.textContent = t; n.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (n.hidden = true), 3000); };
  const url = (p) => location.href.split("#")[0] + "#/p/" + p.id;
  const wa = (p) => "https://wa.me/?text=" + encodeURIComponent(`${p.title}\n${sealTxt(p)}\nEn 20 segundos: ${p.sum}\nLea con fuentes: ${url(p)}`);
  const mk = (id, k) => !!(S.marks[id] && S.marks[id][k]);

  const card = (p) => `<article class="card" aria-labelledby="t-${p.id}">
    <div class="head"><span class="av" aria-hidden="true">Á</span><div><b>${esc(p.author)}</b><div class="mut">${p.date.slice(8)} oct · ${p.min} min de lectura</div></div></div>
    <span class="chip t-${p.type}">${TYPES[p.type]}</span>${p.video ? ' <span class="chip">Video</span>' : ""}
    <h2 class="serif title" id="t-${p.id}"><a href="#/p/${p.id}">${esc(p.title)}</a></h2>
    <div class="sum"><b>En 20 segundos</b>${esc(p.sum)}</div>${p.video ? `<div class="vid" role="img" aria-label="Video (se carga al pulsar)"><button type="button">Reproducir (YouTube sin cookies)</button></div>` : ""}
    ${seal(p)}<div class="mut">Fuentes (${p.sources.length}) · <a href="#/p/${p.id}">ver cómo lo sabemos</a></div>
    <div class="acts" role="group" aria-label="Acciones">
      <button data-a="mk" data-id="${p.id}" data-k="ayudo" aria-pressed="${mk(p.id, "ayudo")}">${ic("check")} Me ayudó a entender</button>
      <button data-a="mk" data-id="${p.id}" data-k="mas" aria-pressed="${mk(p.id, "mas")}">${ic("plus")} Quiero más fuentes</button>
      <button data-a="mk" data-id="${p.id}" data-k="guardar" aria-pressed="${mk(p.id, "guardar")}">${ic("mark")} Guardar</button>
      <a href="${wa(p)}" target="_blank" rel="noopener noreferrer">${ic("chat")} WhatsApp</a></div></article>`;

  const route = () => { const h = location.hash.replace(/^#\/?/, "").split("/"); return { n: h[0] || "home", a: h[1] }; };
  const filt = (list, f) => list.filter((p) => (!S.serie || p.serie === S.serie) && (!S.q || p.title.toLowerCase().includes(S.q.toLowerCase())) && (!f || f === "all" || (f === "videos" ? p.video : f === "guias" ? p.cat === "guias" : true)));

  const V = {
    home(f) {
      if (f === "actualidad") return `<h1 class="serif" style="font-size:1.5rem;margin:.2rem 0 .6rem">Actualidad enlazada</h1>${S.calm ? '<div class="card">Modo calma activo: la actualidad dura está oculta por 24 horas. Puede desactivarlo arriba.</div>' : NEWS.map((n) => `<div class="card"><b>${n.t}</b><p>${n.ctx}</p><a href="https://example.org/" target="_blank" rel="noopener noreferrer">Leer en ${n.src}</a></div>`).join("")}`;
      const today = S.serie || S.q || f ? [] : PIECES.filter((p) => p.today), feed = filt(PIECES.filter((p) => !today.includes(p)), f), mins = today.reduce((a, p) => a + p.min, 0);
      const order = SERIES.slice().sort((a, b) => (S.interests && S.interests.includes(b[0]) ? 1 : 0) - (S.interests && S.interests.includes(a[0]) ? 1 : 0));
      return `${S.interests === null ? `<section class="card welcome" aria-labelledby="w"><h2 id="w" style="font-size:1.1rem">Bienvenida. ¿Qué le interesa?</h2><p class="mut">No necesita cuenta. Su elección se guarda solo en este navegador.</p><div class="chips">${INTERESTS.map((i) => `<button data-a="int" data-i="${esc(i)}" aria-pressed="false">${esc(i)}</button>`).join("")}</div><button class="btn" data-a="intok">Listo</button> <button class="btn alt" data-a="intno">Ahora no</button></section>` : ""}
      ${S.calm ? `<div class="card" style="border-color:var(--info)">${ic("check")} <b>Modo calma activo.</b> <span class="mut">Se oculta la actualidad dura por 24 horas.</span></div>` : ""}
      <div class="stories" role="group" aria-label="Series">${order.map(([n, s]) => `<button class="story" data-a="serie" data-s="${esc(n)}" aria-pressed="${S.serie === n}"><span>${s[0]}</span>${esc(n)}</button>`).join("")}</div>
      ${today.length ? `<section class="card brief" aria-labelledby="b"><h2 id="b">Hoy en 5 minutos</h2><p class="mut">${today.length} piezas · ${mins} min de lectura en total</p>${today.map((p) => `<div class="src"><a href="#/p/${p.id}"><b>${esc(p.title)}</b></a><span class="mut">${p.min} min · <span class="chip t-${p.type}">${TYPES[p.type]}</span> · ${sealTxt(p)}</span></div>`).join("")}</section>` : ""}
      ${S.serie ? `<p class="mut">Serie: ${esc(S.serie)} · <button class="btn alt" data-a="serie" data-s="">Quitar filtro</button></p>` : ""}
      ${feed.map(card).join("") || '<div class="card">No hay piezas para este filtro todavía.</div>'}
      <div class="end" role="status"><b>Está al día</b>No hay más por hoy. Vuelva mañana o active el resumen semanal.</div>`;
    },
    guardados() { const l = PIECES.filter((p) => mk(p.id, "guardar")); return `<h1 class="serif" style="font-size:1.5rem;margin:.2rem 0 .6rem">Guardados</h1>${l.map(card).join("") || '<div class="card">Aún no guardó nada. Use «Guardar» en cualquier pieza.</div>'}`; },
    p(id) {
      const p = PIECES.find((x) => x.id === id); if (!p) return V.home();
      const body = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\{\{(.+?)\}\}/g, (m, k) => `<button class="term" data-a="term" data-k="${esc(k)}" aria-expanded="${!!S.pops[k]}">${esc(k)}</button>${S.pops[k] && p.terms[k] ? `<span class="pop" role="note"> ${esc(p.terms[k])}</span>` : ""}`);
      const qz = p.quiz.map((q, i) => { const r = S.qz[p.id + i]; return `<div class="q"><b>${esc(q.q)}</b>${q.o.map((o, j) => `<label><input type="radio" name="q${i}" data-a="qa" data-q="${i}" value="${j}" ${r && r.v === j ? "checked" : ""}> ${esc(o)}</label>`).join("")}${r ? `<div class="res">${r.v === q.a ? "Correcto. " : "Revise: "}${esc(q.e)}</div>` : ""}</div>`; }).join("");
      return `<p><a href="#/">← Volver al inicio</a></p><article class="card"><span class="chip t-${p.type}">${TYPES[p.type]}</span> <span class="mut">${p.min} min · ${p.date.slice(8)} oct 2026</span>
      <h1 class="serif title" style="font-size:1.7rem">${esc(p.title)}</h1><div class="sum"><b>En 20 segundos</b>${esc(p.sum)}</div>${seal(p)}${p.video ? `<div class="vid"><button type="button">Reproducir (YouTube sin cookies)</button></div>` : ""}
      <div class="know"><section><h3>Se sabe</h3><ul>${p.know.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section><section><h3>No se sabe</h3><ul>${p.unknown.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section><section><h3>Por qué importa</h3><p style="margin:.2rem 0">${esc(p.why)}</p></section></div>
      <div class="body">${p.body.map((t) => `<p>${body(t)}</p>`).join("")}</div>
      ${(p.corr || []).length ? `<div class="seal mod" style="display:block"><b>Correcciones</b>${p.corr.map((c) => `<div>${c.d}: ${esc(c.t)}</div>`).join("")}</div>` : ""}
      <h2 style="font-size:1.05rem;margin-top:1rem">Fuentes (${p.sources.length})</h2>${p.sources.map((s) => `<div class="src"><b>${esc(s.t)}</b><span class="mut">${esc(s.k)} · ${esc(s.n)}</span></div>`).join("")}
      <h2 style="font-size:1.05rem;margin-top:1rem">Cómo sabemos esto</h2><p>${p.scope ? esc(p.scope) : "Esta pieza todavía no ha sido verificada por una persona revisora. El sello solo lo otorga quien revisa, nunca quien escribe."}</p>
      ${p.quiz.length ? `<h2 style="font-size:1.05rem;margin-top:1rem">¿Qué entendí?</h2><p class="mut">Solo para usted: no se guarda ni se mide.</p>${qz}` : ""}
      <h2 style="font-size:1.05rem;margin-top:1rem">Compartir con contexto</h2><div class="wa"><b>${esc(p.title)}</b><br>${esc(sealTxt(p))}<br>${esc(p.sum)}<div class="u">agora.ejemplo.cr</div></div>
      <div class="acts"><a class="btn" href="${wa(p)}" target="_blank" rel="noopener noreferrer" style="color:var(--brand-ink)">${ic("chat")} Compartir por WhatsApp</a><button data-a="mk" data-id="${p.id}" data-k="guardar" aria-pressed="${mk(p.id, "guardar")}">${ic("mark")} Guardar</button></div>
      <details style="margin-top:.8rem"><summary>Señalar un error o una fuente que falta</summary><textarea id="err" aria-label="Describa el error"></textarea><button class="btn" data-a="err">Enviar al equipo</button></details></article>`;
    },
    editorial() {
      const e = S.ed, srcs = e.src.split("\n").filter((l) => /https?:\/\/\S+/.test(l)).length, needNo = e.type !== "opinion";
      const ck = [["Titular informativo (1–90 caracteres)", e.title.length > 0 && e.title.length <= 90], ["«En 20 segundos» (1–280 caracteres)", e.sum.length > 0 && e.sum.length <= 280], ["Tipo definido (hechos, análisis u opinión)", !!e.type], [`Al menos 2 fuentes con enlace (hay ${srcs})`, srcs >= 2], ["«Se sabe» y «No se sabe» completos", e.know.trim() && (e.unk.trim() || !needNo)], ["Imágenes con texto alternativo", e.alt], ["Redacción original, sin texto copiado", e.orig], ["Términos difíciles enlazados al glosario", e.gl]].map(([t, ok]) => [t, !!ok]);
      const pv = { id: "preview", type: e.type || "hechos", min: 2, date: "2026-10-23", author: "Usted (borrador)", title: e.title || "Titular de la pieza", sum: e.sum || "Resumen de 20 segundos…", seal: "pending", sources: new Array(srcs) };
      const f = (k, l, max, ta) => `<label class="f" style="display:block;margin:.5rem 0"><b>${l}</b>${ta ? `<textarea data-e="${k}">${esc(e[k])}</textarea>` : `<input type="text" data-e="${k}" value="${esc(e[k])}">`}<div class="cnt ${e[k].length > max ? "over" : ""}">${e[k].length}/${max}</div></label>`;
      return `<h1 class="serif" style="font-size:1.5rem;margin:.2rem 0 .6rem">Redactar una pieza</h1><div class="card">${f("title", "Titular", 90)}${f("sum", "En 20 segundos", 280, 1)}
      <label class="f" style="display:block"><b>Tipo</b><select data-e="type"><option value="">Elija…</option>${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${e.type === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      ${f("know", "Se sabe", 600, 1)}${f("unk", "No se sabe", 400, 1)}${f("why", "Por qué importa", 400, 1)}<label class="f" style="display:block"><b>Fuentes (una por línea, con enlace)</b><textarea data-e="src" placeholder="Nombre de la fuente https://…"></textarea></label>
      ${[["alt", "Mis imágenes tienen texto alternativo"], ["orig", "La redacción es original"], ["gl", "Enlacé los términos difíciles al glosario"]].map(([k, t]) => `<label style="display:flex;gap:.5rem;margin:.3rem 0"><input type="checkbox" data-e="${k}" ${e[k] ? "checked" : ""}> ${t}</label>`).join("")}</div>
      <div class="card"><h2 style="font-size:1.05rem">Lista de control de publicación</h2><ul class="chk">${ck.map(([t, ok]) => `<li><span class="${ok ? "o" : "x"}">${ok ? "✓" : "✕"}</span>${esc(t)}</li>`).join("")}</ul>
      <button class="btn" data-a="ready" ${ck.every((x) => x[1]) ? "" : "disabled"}>Marcar como lista para revisión</button><p class="mut">El sello «Verificado» solo lo otorga una persona revisora; no puede darse a sí misma.</p></div>
      <h2 style="font-size:1rem;margin:1rem 0 .4rem">Así se verá</h2>${card(pv)}`;
    },
  };

  const NAV = [["#/", "home", "Inicio", ""], ["#/f/actualidad", "news", "Actualidad", "actualidad"], ["#/f/videos", "play", "Videos", "videos"], ["#/f/guias", "book", "Guías", "guias"], ["#/guardados", "mark", "Guardados", "guardados"], ["#/editorial", "pen", "Editorial", "editorial"]];
  const render = () => {
    const r = route(), key = r.n === "home" ? "" : r.n === "f" ? r.a : r.n, a = document.activeElement, de = a && a.dataset && a.dataset.e, pos = a && a.selectionStart;
    $("#main").innerHTML = r.n === "p" ? V.p(r.a) : r.n === "guardados" ? V.guardados() : r.n === "editorial" ? V.editorial() : V.home(r.n === "f" ? r.a : "");
    const cur = (k) => (k === key ? ' aria-current="page"' : "");
    $("#side").innerHTML = NAV.map(([h, i, t, k]) => `<a href="${h}"${cur(k)}>${ic(i)}${t}</a>`).join("");
    $("#tabs").innerHTML = [NAV[0], NAV[1], NAV[2], NAV[4], NAV[5]].map(([h, i, t, k]) => `<a href="${h}"${cur(k)}>${ic(i)}${t}</a>`).join("");
    $("#rail").innerHTML = `${S.calm ? "" : `<section class="card"><h2 style="font-size:1rem">Actualidad enlazada</h2>${NEWS.map((n) => `<p style="margin:.5rem 0"><b>${n.t}</b><br><span class="mut">${n.ctx}</span></p>`).join("")}</section>`}
      <section class="card"><h2 style="font-size:1rem">Pregunte al especialista</h2><p class="mut">Se publican solo las preguntas que el equipo selecciona.</p><textarea id="ask" maxlength="280" aria-label="Su pregunta"></textarea><button class="btn" data-a="ask">Enviar</button></section>
      <section class="card"><h2 style="font-size:1rem">Glosario del día</h2><p><b>IPC</b>: índice que mide la variación de precios de una canasta fija.</p></section>`;
    if (de) { const n = $(`[data-e="${de}"]`); if (n && n.type !== "checkbox") { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* select */ } } }
  };

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-a],[data-sz],#theme,#calm"); if (!t) return;
    if (t.dataset.sz != null) { $$("[data-sz]").forEach((b) => b.setAttribute("aria-pressed", String(b === t))); document.documentElement.style.setProperty("--fs", ["16px", "18px", "21px"][+t.dataset.sz]); return; }
    if (t.id === "theme") { const c = document.documentElement.dataset.theme; c === "dark" ? (document.documentElement.dataset.theme = "light") : c === "light" ? delete document.documentElement.dataset.theme : (document.documentElement.dataset.theme = "dark"); return; }
    if (t.id === "calm") { S.calm = !S.calm; t.setAttribute("aria-pressed", String(S.calm)); toast(S.calm ? "Modo calma activado por 24 horas" : "Modo calma desactivado"); return render(); }
    const a = t.dataset.a;
    if (a === "mk") { const m = (S.marks[t.dataset.id] = S.marks[t.dataset.id] || {}); m[t.dataset.k] = !m[t.dataset.k]; save("agora.marks", S.marks); if (t.dataset.k === "mas" && m.mas) toast("Anotado: el equipo verá que quiere más fuentes"); if (t.dataset.k === "guardar") toast(m.guardar ? "Guardado" : "Quitado de guardados"); return render(); }
    if (a === "serie") { S.serie = t.dataset.s || null; return render(); }
    if (a === "term") { S.pops[t.dataset.k] = !S.pops[t.dataset.k]; return render(); }
    if (a === "int") { const on = t.getAttribute("aria-pressed") !== "true"; t.setAttribute("aria-pressed", String(on)); return; }
    if (a === "intok") { S.interests = $$("[data-a=int][aria-pressed=true]").map((b) => b.dataset.i); save("agora.int", S.interests); toast("Listo: ajustamos su inicio"); return render(); }
    if (a === "intno") { S.interests = []; save("agora.int", S.interests); return render(); }
    if (a === "ask") { const n = $("#ask"); if (!n.value.trim()) return toast("Escriba su pregunta"); n.value = ""; return toast("Recibida. Solo se publican las que el equipo selecciona."); }
    if (a === "err") { const n = $("#err"); if (!n.value.trim()) return toast("Describa el error"); n.value = ""; return toast("Gracias: llegó a la bandeja editorial"); }
    if (a === "ready") return toast("Enviada a la cola de revisión. El sello lo otorga una persona revisora.");
  });
  document.addEventListener("change", (e) => { const t = e.target;
    if (t.dataset.a === "qa") { const id = route().a, p = PIECES.find((x) => x.id === id); S.qz[id + t.dataset.q] = { v: +t.value }; return render(); }
    if (t.dataset.e) { S.ed[t.dataset.e] = t.type === "checkbox" ? t.checked : t.value; render(); } });
  document.addEventListener("input", (e) => { const t = e.target;
    if (t.id === "q") { S.q = t.value; if (route().n !== "home") location.hash = "#/"; return render(); }
    if (t.dataset.e && t.type !== "checkbox" && t.tagName !== "SELECT") { S.ed[t.dataset.e] = t.value; render(); } });
  window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
  render();
})();
