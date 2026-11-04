/* Huella · Estudio v2 (prototipo). La IA está SIMULADA: derivación por reglas + el motor verificado de engine.js.
   Todo lo escrito en el Banco es PRIVADO. Globales que usa engine.js: S y BANK. */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clone = (o) => JSON.parse(JSON.stringify(o)), words = (t) => (t || "").trim().split(/\s+/).filter(Boolean).length;
const SEED = window.HUELLA_SEED, GUIDES = window.HUELLA_GUIDES;
const EMPTY = () => ({ contacto: { name: "", headline: "", city: "", email: "", phone: "", linkedin: "", github: "" }, historia: "", exps: [], skills: [], projects: [], edu: [], certs: [], langs: [], otros: [], privado: { ubicacion: "", modalidad: "", disponibilidad: "", autorizacion: "", pretension: "", evitar: "" }, voz: "" });
let B = clone(SEED), BANK = null;
const S = { tab: "banco", sec: "exps", role: "owner", paper: "letter", level: "mid", mode: "oferta", focus: "Enfocado a QA y automatización; destaco CI/CD y pruebas de API.", offer: window.HUELLA_OFFER, prov: "gemini", tier: "fast", pii: true, over: true, map: null, hard: null, steps: [], res: null, ed: null, edErr: "", pv: "page", cvs: 0, saved: "" };
const NOW = 2026;

// ── Derivación: del relato largo a logros (XYZ) — simulada con reglas; en producción la hace la IA con el mismo contrato ──
const VERBS = /^(también\s+)?(automaticé|integré|diseñé|construí|reduje|definí|acompañé|elevé|corregí|escribí|creé|optimicé|documenté|coordiné|mejoré|desarrollé|configuré|implementé|migré|lideré|ayudé|publiqué|presenté|capacité|analicé|gestioné|negocié|organicé|aumenté|logré|establecí|resolví)(?![\p{L}])/iu;
const STOP = new Set("de la el y en a con que los las un una por para al del antes como se su sus propia propias propio propios misma mismo".split(" "));
const sentences = (t) => (t || "").replace(/\n+/g, " ").split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡«])/).map((s) => s.trim()).filter((s) => s.length >= 20);
const tidy = (s, max) => { let t = s; if (t.length > max - 1) { const sc = t.indexOf(";"), pre = t.slice(0, sc), post = t.slice(sc + 1); if (sc >= 45 && sc <= max - 1 && (/\d/.test(pre) || !/\d/.test(post))) t = pre; else { t = t.slice(0, max - 1); t = t.slice(0, t.lastIndexOf(" ")); } } const w = t.split(" "); while (w.length > 3 && STOP.has(fold(w[w.length - 1]))) w.pop(); return w.join(" ").replace(/[;,:]$/, "") + "."; };
function extract(text, kind, eid) {
  return sentences(text).map((s, i) => ({ s, i })).filter(({ s }) => kind === "proj" || VERBS.test(s.replace(/^[«"]/, ""))).map(({ s, i }) => {
    const c = s.replace(/\s+/g, " ").replace(/\.$/, ""), dig = /\d/.test(c), f = fold(c);
    return { id: `a-${eid}-${i + 1}`, short: tidy(c, 110), long: tidy(c, 170), skills: KNOWN.filter(([, syn]) => syn.some((x) => f.includes(x))).map(([t]) => t), strength: dig ? (/%|horas|días|minutos|semanas|clientes|personas|estrellas/.test(c) ? 5 : 4) : 2, noFigure: !dig };
  });
}
function deriveBank(b) {
  const c = b.contacto;
  return { name: c.name, headline: c.headline, contact_l1: [c.city, c.email, c.phone].filter(Boolean), contact_l2: [c.linkedin, c.github].filter(Boolean),
    exps: b.exps.map((e) => ({ id: e.id, role: e.role, company: e.company, loc: e.loc, from: e.from, to: e.to, ach: extract(e.text, "exp", e.id) })),
    projects: b.projects.map((p) => ({ id: p.id, name: p.name, stack: (p.how || "").split(".")[0].replace(/\s+y\s+/g, ", "), ach: extract(p.what, "proj", p.id) })),
    skills: b.skills.map((s) => ({ n: s.n, c: s.c || "Otras" })), edu: b.edu.map((e) => ({ degree: e.degree, school: e.school, dates: `${e.from} - ${e.to}`, detail: e.note || "" })),
    extras: [...b.certs.map((x) => `${x.name}${x.date ? ` (${x.date})` : ""}`), b.langs.map((l) => `${l.lang}: ${l.level}`).join(" | ")].filter(Boolean) };
}
const yearsPro = () => { const ys = B.exps.filter((e) => !/practicante/i.test(e.role)).map((e) => +(e.from || "").slice(-4)).filter(Boolean); return ys.length ? NOW - Math.min(...ys) : 0; };
const suggest = () => { const y = yearsPro(); return y < 3 ? "junior" : y < 8 ? "mid" : "senior"; };
const LV = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
function hardFilters(txt) {
  const rows = [], P = B.privado, f = fold(txt); let m;
  if ((m = txt.match(/(\d+)\s*años?\s+de\s+experiencia\s+en\s+([^;.\n]+)/i))) { const need = +m[1], since = Math.min(...B.skills.filter((s) => s.c === "Pruebas" && s.since).map((s) => s.since)), mine = isFinite(since) ? NOW - since : 0, ok = mine >= need; rows.push([`${need} años de experiencia en ${m[2].trim()}`, `${mine} años (desde ${isFinite(since) ? since : "—"}, según sus habilidades de pruebas)`, ok ? "ok" : "no", ok ? "Cumple." : "No cumple: considere no aplicar, o explique experiencia equivalente con evidencia real."]); }
  if (/remot/.test(f)) { const ok = /remot/i.test(P.modalidad); rows.push(["Trabajo remoto", P.modalidad || "—", ok ? "ok" : "no", ok ? "Cumple." : "Su preferencia no es remoto: responda con honestidad."]); }
  if (/costa rica/.test(f)) { const ok = /costa rica/i.test(P.ubicacion); rows.push(["Ubicación: Costa Rica", P.ubicacion || "—", ok ? "ok" : "no", ok ? "Cumple." : "Revise la ubicación y la autorización de trabajo."]); }
  if ((m = txt.match(/ingl[eé]s[^.\n]*?\b(A1|A2|B1|B2|C1|C2)\b/i))) { const need = m[1].toUpperCase(), mine = ((B.langs.find((l) => /ingl/i.test(l.lang)) || {}).level || "—"), ok = (LV[mine.toUpperCase()] || 0) >= LV[need]; rows.push([`Inglés ${need}`, mine, ok ? "ok" : "no", ok ? "Cumple." : "Nivel insuficiente o sin declarar."]); }
  if (/bachillerato|licenciatura|grado universitario/i.test(txt)) { const e = B.edu.find((x) => /bachillerato|licenciatura/i.test(x.degree)); rows.push(["Título universitario", e ? e.degree : "—", e ? "ok" : "no", e ? "Cumple." : "Falta el título en el banco."]); }
  return rows;
}

// ── Utilidades de edición (enlace por ruta: data-p="exps.0.text") ──
const getP = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o), setP = (o, p, v) => { const k = p.split("."), last = k.pop(); k.reduce((a, x) => a[x], o)[last] = v; };
const F = (p, l, o = {}) => `<label class="f">${l}<input type="${o.type || "text"}" data-p="${p}" value="${esc(getP(B, p))}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ""}></label>`;
const T = (p, l, o = {}) => `<label class="f">${l}<textarea class="${o.big ? "big" : ""}" data-p="${p}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ""}>${esc(getP(B, p))}</textarea></label><div class="cnt" data-w="${p}">${words(getP(B, p))} palabras</div>`;
const guide = (k) => (GUIDES[k] ? `<details class="guide" ${B.exps.length || B.historia ? "" : "open"}><summary><b>Preguntas para recordar mejor</b></summary><ul>${GUIDES[k].map((q) => `<li>${esc(q)}</li>`).join("")}</ul></details>` : "");
const head = (k, i, t) => `<div class="hd"><b>${esc(t || "(sin título)")}</b><button class="btn sm" data-a="del" data-k="${k}" data-i="${i}" aria-label="Quitar">Quitar</button></div>`;
const add = (k, t) => `<p><button class="btn" data-a="add" data-k="${k}">+ ${t}</button></p>`;

const SECS = [["historia", "Mi historia"], ["exps", "Experiencia"], ["skills", "Habilidades y por qué"], ["projects", "Proyectos"], ["edu", "Educación"], ["certs", "Certificados"], ["langs", "Idiomas"], ["otros", "Otros (voluntariado, charlas…)"], ["privado", "Privado: filtros y preferencias"], ["voz", "Mi voz"], ["contacto", "Datos del encabezado"]];
function secStatus(id) {
  const n = (a) => a.length, ok = (t) => [t, "ok"], no = (t) => [t, "no"];
  switch (id) {
    case "historia": { const w = words(B.historia); return w >= 40 ? ok(`${w} pal.`) : no(w ? `${w} pal. · poco` : "vacío"); }
    case "exps": { const w = B.exps.reduce((a, e) => a + words(e.text), 0); return n(B.exps) && w >= 60 ? ok(`${n(B.exps)} · ${w} pal.`) : no(n(B.exps) ? "cuente más" : "vacío"); }
    case "skills": { const miss = B.skills.filter((s) => !(s.why || "").trim()).length; return n(B.skills) && !miss ? ok(`${n(B.skills)}`) : no(n(B.skills) ? `${miss} sin «por qué»` : "vacío"); }
    case "projects": return n(B.projects) ? ok(`${n(B.projects)}`) : no("opcional");
    case "edu": return n(B.edu) ? ok(`${n(B.edu)}`) : no("vacío");
    case "certs": return n(B.certs) ? ok(`${n(B.certs)}`) : no("opcional");
    case "langs": return n(B.langs) ? ok(`${n(B.langs)}`) : no("vacío");
    case "otros": return n(B.otros) ? ok(`${n(B.otros)}`) : no("opcional");
    case "privado": return B.privado.ubicacion && B.privado.modalidad ? ok("completo") : no("faltan datos");
    case "voz": return words(B.voz) >= 10 ? ok("definida") : no("opcional");
    default: return B.contacto.name && B.contacto.email ? ok("completo") : no("falta nombre o correo");
  }
}
const snav = () => SECS.map(([id, l]) => { const [t, c] = secStatus(id); return `<button data-a="sec" data-id="${id}" aria-current="${S.sec === id}">${esc(l)}<span class="st ${c}">${esc(t)}</span></button>`; }).join("");
const derivedExp = (e) => {
  const at = extract(e.text, "exp", e.id), tools = [...new Set(at.flatMap((a) => a.skills))], nf = at.filter((a) => a.noFigure);
  return `<summary><b>Lo que el sistema entiende de este relato</b> · ${at.length} logros · ${at.length - nf.length} con cifra${nf.length ? ` · <span class="tag w">${nf.length} sin cifra</span>` : ""}</summary>
  ${tools.length ? `<p>${tools.map((t) => `<span class="tag k">${esc(t)}</span>`).join("")}</p>` : ""}
  ${at.map((a) => `<div class="atom"><span class="mut">${a.id}</span> ${a.noFigure ? '<span class="tag w">sin cifra</span>' : ""}<br>${esc(a.long)}${a.noFigure ? `<br><span class="mut"><b>El sistema le preguntará:</b> ¿cuánto tiempo ahorró?, ¿a cuántas personas?, ¿con qué frecuencia?</span>` : ""}</div>`).join("") || '<p class="mut">Aún no se detectan logros. Cuente qué hizo usted, empezando cada frase por un verbo en pasado («automaticé», «reduje»…).</p>'}<p class="mut">Simulado con reglas; en producción la IA lo hace y usted confirma cada logro.</p>`;
};
const EDIT = {
  historia: () => `<h1 id="eh">Mi historia</h1><p class="mut">Cuente quién es y qué busca, como si se lo contara a una persona de confianza. No se publica.</p>${guide("historia")}${T("historia", "Mi historia", { big: 1 })}`,
  exps: () => `<h1 id="eh">Experiencia</h1><p class="mut">Escriba <b>contando</b>, con todo el detalle que recuerde: el sistema extrae lo que sirve y usted decide qué sale en cada CV.</p>${guide("exps")}
    ${B.exps.map((e, i) => `<div class="entry">${head("exps", i, `${e.role} · ${e.company}`)}<div class="grid2">${F(`exps.${i}.company`, "Empresa")}${F(`exps.${i}.role`, "Cargo (como lo llamaba la empresa)")}${F(`exps.${i}.from`, "Desde", { ph: "Mar 2022" })}${F(`exps.${i}.to`, "Hasta", { ph: "Presente" })}${F(`exps.${i}.loc`, "Lugar")}</div>${T(`exps.${i}.text`, "Cuente qué hizo, con qué y qué cambió", { big: 1 })}<details class="guide derived" id="d-exps-${i}" open>${derivedExp(e)}</details></div>`).join("") || '<div class="empty"><b>Aún no hay experiencias.</b><br>Empiece por la más reciente: cuente cómo era el lugar, qué hizo usted y qué cambió.</div>'}${add("exps", "Agregar una experiencia")}`,
  skills: () => `<h1 id="eh">Habilidades y por qué las tengo</h1><p class="mut">No se publican como barras de nivel. Sirven para que el sistema <b>no prometa de más</b> y para respaldar cada habilidad con evidencia.</p>${guide("skills")}
    ${B.skills.map((s, i) => { const ev = extract(B.exps.map((e) => e.text).join(" "), "exp", "x").filter((a) => a.skills.includes(s.n)).length; return `<div class="entry">${head("skills", i, s.n)}<div class="grid2">${F(`skills.${i}.n`, "Habilidad")}${F(`skills.${i}.c`, "Grupo (Pruebas, Lenguajes…)")}${F(`skills.${i}.since`, "Desde (año)", { type: "number" })}</div>${T(`skills.${i}.why`, "¿Por qué la tengo? ¿Dónde la usé?")}<p>${ev ? `<span class="tag k">${ev} logro(s) la respaldan</span>` : '<span class="tag w">sin logro que la respalde: no se usará como argumento fuerte</span>'}</p></div>`; }).join("") || '<div class="empty">Agregue sus habilidades y cuente por qué las tiene.</div>'}${add("skills", "Agregar una habilidad")}`,
  projects: () => `<h1 id="eh">Proyectos</h1>${guide("projects")}${B.projects.map((p, i) => `<div class="entry">${head("projects", i, p.name)}<div class="grid2">${F(`projects.${i}.name`, "Nombre")}${F(`projects.${i}.link`, "Enlace (opcional)")}</div>${T(`projects.${i}.what`, "¿Qué hace y para quién?")}${T(`projects.${i}.how`, "¿Cómo está hecho? (tecnologías y decisiones)")}</div>`).join("") || '<div class="empty">Sin proyectos todavía (opcional, pero muy valioso para Junior).</div>'}${add("projects", "Agregar un proyecto")}`,
  edu: () => `<h1 id="eh">Educación</h1>${B.edu.map((e, i) => `<div class="entry">${head("edu", i, e.degree)}<div class="grid2">${F(`edu.${i}.degree`, "Título")}${F(`edu.${i}.school`, "Institución")}${F(`edu.${i}.from`, "Año de inicio")}${F(`edu.${i}.to`, "Año de fin")}</div>${F(`edu.${i}.note`, "Mención, énfasis, promedio (opcional)")}</div>`).join("") || '<div class="empty">Agregue sus estudios universitarios.</div>'}${add("edu", "Agregar un estudio")}`,
  certs: () => `<h1 id="eh">Certificados</h1>${B.certs.map((e, i) => `<div class="entry">${head("certs", i, e.name)}<div class="grid2">${F(`certs.${i}.name`, "Nombre")}${F(`certs.${i}.issuer`, "Emisor")}${F(`certs.${i}.date`, "Año")}${F(`certs.${i}.exp`, "Vence (opcional)")}</div></div>`).join("") || '<div class="empty">Opcional.</div>'}${add("certs", "Agregar un certificado")}`,
  langs: () => `<h1 id="eh">Idiomas</h1>${B.langs.map((e, i) => `<div class="entry">${head("langs", i, e.lang)}<div class="grid2">${F(`langs.${i}.lang`, "Idioma")}<label class="f">Nivel<select data-p="langs.${i}.level">${["Nativo", "C2", "C1", "B2", "B1", "A2", "A1"].map((l) => `<option ${e.level === l ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>${F(`langs.${i}.ev`, "Cómo lo usa o cómo lo demuestra (opcional)")}</div>`).join("")}${add("langs", "Agregar un idioma")}`,
  otros: () => `<h1 id="eh">Otros: voluntariado, charlas, publicaciones, premios</h1>${B.otros.map((e, i) => `<div class="entry">${head("otros", i, e.t)}${F(`otros.${i}.t`, "Título")}${T(`otros.${i}.x`, "Detalle")}</div>`).join("") || '<div class="empty">Opcional. Aquí caben cosas que a veces deciden una entrevista.</div>'}${add("otros", "Agregar")}`,
  privado: () => `<h1 id="eh">Privado: filtros y preferencias</h1><div class="guide">Esto <b>nunca</b> sale en un CV. Sirve para avisarle si una oferta tiene un <b>requisito eliminatorio</b> que usted no cumple, antes de gastar tiempo.</div>${F("privado.ubicacion", "Dónde vive")}${F("privado.modalidad", "Modalidad que acepta (remoto, híbrido, presencial)")}${F("privado.disponibilidad", "Disponibilidad")}${F("privado.autorizacion", "Autorización para trabajar")}${F("privado.pretension", "Pretensión salarial (privada)")}${F("privado.evitar", "Lo que NO quiere")}`,
  voz: () => `<h1 id="eh">Mi voz</h1><p class="mut">Cómo escribe usted. El sistema debe sonar como usted, no como un robot.</p>${T("voz", "Cómo escribo y qué palabras evito")}<div class="guide">Frases que el sistema nunca usará: <b>profesional apasionado, orientado a resultados, proactivo, responsable de, dinámico</b>.</div>`,
  contacto: () => `<h1 id="eh">Datos del encabezado</h1><div class="grid2">${F("contacto.name", "Nombre completo")}${F("contacto.headline", "Titular (rol de mercado)")}${F("contacto.city", "Ciudad y país")}${F("contacto.email", "Correo")}${F("contacto.phone", "Teléfono")}${F("contacto.linkedin", "LinkedIn")}${F("contacto.github", "GitHub u otro enlace")}</div><p class="mut">Sin foto, sin cédula, sin estado civil ni edad: no ayudan al ATS y pueden sesgar.</p>`,
};
const ROLEMSG = { owner: "Todo lo que escriba aquí es <b>privado</b>: nunca se publica ni se envía. La IA lo lee solo cuando usted pide un CV.", primera: "<b>Bienvenida.</b> Empiece contando su historia y su experiencia más reciente con sus propias palabras. No tiene que ordenarlo ni acortarlo: eso lo hace el sistema.", invitada: "<b>Modo invitada (F3).</b> Su banco es solo suyo: ni la propietaria ni nadie más puede leerlo. La IA usa una cuota compartida de <b>3 CV por semana</b>." };
const viewBanco = () => `<div class="banner">${ROLEMSG[S.role]}</div><div class="bank"><nav class="snav" id="snav" aria-label="Secciones del banco">${snav()}</nav><section id="editor" aria-labelledby="eh">${EDIT[S.sec]()}<p class="saved" id="saved" role="status">${S.saved}</p></section></div>`;

// ── Crear CV ──
const chipRow = (map) => `<div class="chips">${map.terms.map((x) => `<span class="${{ ok: "y", part: "p", gap: "n" }[x.ev.st]}" title="${esc(x.ev.note || "")}">${{ ok: "✓", part: "~", gap: "✕" }[x.ev.st]} ${esc(x.t)}${x.w === 1 ? " (deseable)" : ""}${x.ev.note ? " · " + esc(x.ev.note) : x.ev.st === "ok" ? " · " + x.ev.n + " evid." : " · brecha"}</span>`).join("")}</div>`;
const cnt = (n, m) => `<div class="cnt ${n > m ? "over" : ""}">${n}/${m}</div>`;
function paper(cv) {
  const c = BANK, rows = (e) => `<div class="r"><span><b>${esc(e.role)}</b>, ${esc(e.company)}${e.loc ? ", " + esc(e.loc) : ""}</span><span>${esc(e.dates)}</span></div>`;
  return `<div class="paper" aria-label="Vista previa del CV"><h4>${esc(c.name)}</h4><div class="hl">${esc(c.headline)}</div><div class="ct">${esc(c.contact_l1.join(" · "))}${c.contact_l2.length ? "<br>" + esc(c.contact_l2.join(" · ")) : ""}</div>
  <div class="sec">Perfil profesional</div><div>${esc(cv.summary)}</div><div class="sec">Habilidades técnicas</div>${cv.skills.map((g) => { const [a, ...b] = g.line.split(": "); return `<div><b>${esc(a)}:</b> ${esc(b.join(": "))}</div>`; }).join("")}
  <div class="sec">Experiencia laboral</div>${cv.exps.map((e) => `${rows(e)}${e.bl.length ? `<ul>${e.bl.map((b) => `<li>${esc(b.text)}</li>`).join("")}</ul>` : '<div style="height:.35rem"></div>'}`).join("")}
  ${cv.projects.length ? `<div class="sec">Proyectos</div>${cv.projects.map((p) => `<div class="r"><span><b>${esc(p.name)}</b> | ${esc(p.stack)}</span><span></span></div><ul>${p.bl.map((b) => `<li>${esc(b.text)}</li>`).join("")}</ul>`).join("")}` : ""}
  <div class="sec">Educación</div>${cv.edu.map((e) => `<div class="r"><span><b>${esc(e.degree)}</b>, ${esc(e.school)}</span><span>${esc(e.dates)}</span></div>${e.detail ? `<div class="mu">${esc(e.detail)}</div>` : ""}`).join("")}
  <div class="sec">Certificaciones e idiomas</div>${cv.extras.map((x) => `<div>${esc(x)}</div>`).join("")}</div>`;
}
function viewCrear() {
  const L = lim(), P = PROV[S.prov], ready = BANK.exps.some((e) => e.ach.length), sug = suggest(), calls = 4 + Math.min(L.entries, 3), limit = S.role === "invitada" && S.cvs >= 3;
  if (!ready) return `<div class="banner">${ROLEMSG[S.role]}</div><div class="empty"><b>Todavía no hay material para armar un CV.</b><br>Necesita al menos una experiencia con logros (frases que empiecen con un verbo en pasado). Es el único paso previo.<p><button class="btn go" data-a="tab" data-id="banco">Ir al Banco y empezar a contar</button></p></div>`;
  const contact = S.pii ? "{{EMAIL}} | {{PHONE}} | {{CITY}}" : [...BANK.contact_l1, ...BANK.contact_l2].join(" | "), payload = JSON.stringify({ tarea: "experience_bullets", contacto: contact, logros: ACH().slice(0, 2).map((a) => ({ id: a.id, texto: a.short })) }, null, 1), leaks = /[\w.+-]+@[\w-]+\.[\w.]+|\+?\d[\d\s-]{7,}/.test(payload);
  const r = S.res, tot = r ? total(r.cv, r.L) : 0, lu = r ? luOf(r.cv, r.L) : {}, scale = r ? Math.max(r.L.cap, tot) : 1, ck = r ? checks(r.cv, r.L, S.map) : [], txt = r ? atsText(r.cv) : "";
  const inCV = r ? S.map.terms.map((x) => ({ ...x, in: synOf(x.t).some((s) => fold(txt).includes(s)) })) : [], cov = r ? Math.round((inCV.filter((x) => x.in && x.ev.st === "ok").reduce((a, x) => a + x.w, 0) / S.map.terms.reduce((a, x) => a + x.w, 0)) * 100) : 0;
  const bl = (b) => (S.ed === b.id ? `<div class="bl"><span><textarea data-k="edtext">${esc(b.text)}</textarea>${S.edErr ? `<div class="err">${esc(S.edErr)}</div>` : ""}</span><button class="btn sm go" data-a="edsave" data-id="${b.id}">Guardar</button><button class="btn sm" data-a="edx">Cancelar</button></div>` : `<div class="bl"><span>• ${esc(b.text)} <small class="mut">[${b.id} · ${b.v} · ${b.text.length} car.]</small></span><button class="btn sm" data-a="ed" data-id="${b.id}">Editar</button></div>`);
  const left = `${S.role !== "owner" ? `<div class="banner">${ROLEMSG[S.role]}</div>` : ""}
  <h1><span class="stepn">1</span>¿Para qué puesto?</h1>
  <div class="seg" role="radiogroup" aria-label="Entrada">${[["oferta", "Desde una oferta"], ["enfocado", "Perfil enfocado"]].map(([v, t]) => `<label><input type="radio" name="md" data-k="mode" value="${v}" ${S.mode === v ? "checked" : ""}>${t}</label>`).join("")}</div>
  ${S.mode === "oferta" ? `<label class="f">Texto de la oferta (se trata como dato, nunca como instrucciones)<textarea data-k="offer" style="min-height:9rem">${esc(S.offer)}</textarea></label>` : `<label class="f">Mini-prompt de enfoque (máx. 200)<textarea data-k="focus" maxlength="200" style="min-height:4rem">${esc(S.focus)}</textarea></label>${cnt(S.focus.length, 200)}`}
  <div class="grid2"><label class="f">Nivel <select data-k="level">${Object.entries(BASE).map(([k, b]) => `<option value="${k}" ${S.level === k ? "selected" : ""}>${b.label}${k === sug ? " · sugerido" : ""}</option>`).join("")}</select></label><label class="f">Papel <select data-k="paper"><option value="letter" ${S.paper === "letter" ? "selected" : ""}>Carta</option><option value="a4" ${S.paper === "a4" ? "selected" : ""}>A4</option></select></label></div>
  <p class="mut">Con ${yearsPro()} años de experiencia profesional se sugiere <b>${BASE[sug].label}</b>. Cupo: ${L.pages} pág. · ${L.cap} LU · viñeta máx. ${L.bmax}.</p>
  <details class="box"><summary><b>Conexión de IA</b> · ${S.role === "invitada" ? "cuota compartida" : P.n}</summary>${S.role === "invitada" ? '<p class="mut">Usa la cuota compartida del Estudio. No necesita claves.</p>' : `<label class="f">Proveedor<select data-k="prov">${Object.entries(PROV).map(([k, p]) => `<option value="${k}" ${S.prov === k ? "selected" : ""}>${p.n}</option>`).join("")}</select></label><label class="f">Nivel de modelo<select data-k="tier">${[["fast", "Rápido"], ["bal", "Equilibrado"], ["best", "Máximo"]].map(([k, t]) => `<option value="${k}" ${P.m[k] ? "" : "disabled"} ${S.tier === k ? "selected" : ""}>${t} · ${P.m[k] || "no disponible en el plan gratuito"}</option>`).join("")}</select></label>
    <label style="display:flex;gap:.5rem"><input type="checkbox" data-k="pii" ${S.pii || P.free ? "checked" : ""} ${P.free ? "disabled" : ""}> Escudo de datos personales${P.free ? " (obligatorio en el plan gratuito de Gemini)" : ""}</label>`}
    <p class="mut">≈ ${calls} llamadas${P.rpm && S.role !== "invitada" ? ` · ≈ ${calls * Math.ceil(60 / P.rpm)} s con el límite gratuito` : ""}. Lo que se enviaría: ${leaks ? "⚠ incluye datos personales" : "✓ sin correo ni teléfono"}.</p><pre>${esc(payload)}</pre></details>
  <label style="display:flex;gap:.5rem;margin:.6rem 0"><input type="checkbox" data-k="over" ${S.over ? "checked" : ""}> Simular un borrador que se pasa de largo (para ver la escalera de ajuste)</label>
  <p><button class="btn" data-a="map">Analizar y mapear evidencia</button></p>
  ${S.map ? `<h1 style="margin-top:1.2rem"><span class="stepn">2</span>Evidencia y filtros duros</h1><p class="mut">Cobertura honesta de partida: <b class="num">${S.map.cov} %</b>. Lo que no tiene respaldo se muestra como brecha; nunca se inventa.</p>${chipRow(S.map)}
    <h3>Filtros duros (requisitos eliminatorios)</h3>${S.hard.length ? `<table class="hard"><tr><th></th><th>La oferta pide</th><th>Usted tiene</th></tr>${S.hard.map(([q, m, st, adv]) => `<tr><td class="${st}">${{ ok: "✓", no: "✕", wn: "!" }[st]}</td><td>${esc(q)}</td><td>${esc(m)}<br><span class="mut">${esc(adv)}</span></td></tr>`).join("")}</table>` : '<p class="mut">No se detectaron requisitos eliminatorios en el texto.</p>'}
    ${S.hard.some((h) => h[2] === "no") ? '<div class="banner">Hay requisitos eliminatorios que no cumple. Puede generar el CV igual, pero decida con honestidad si conviene postular.</div>' : ""}
    <p><button class="btn go" data-a="gen" ${limit ? "disabled" : ""}>Generar CV</button>${limit ? ' <span class="err">Llegó al límite de 3 CV esta semana (modo invitada).</span>' : ""}</p>` : ""}
  ${S.steps.length ? `<h3>Proceso</h3>${S.steps.map((s) => `<div class="st2 ${s[1] ? "done" : ""}"><b>${s[1] ? "✓" : "…"}</b><span>${esc(s[0])}</span></div>`).join("")}` : ""}
  ${r ? `<h1 style="margin-top:1.2rem"><span class="stepn">3</span>Resultado · ${r.L.label}</h1><div class="box"><b>Presupuesto de la página:</b> <span class="num">${tot}</span> de <span class="num">${r.L.cap}</span> LU · ${Math.ceil(tot / (r.L.cap / r.L.pages))} de ${r.L.pages} página(s)
    <div class="m" role="img" aria-label="Uso de la página por sección">${Object.entries(lu).filter(([, v]) => v).map(([k, v]) => `<i style="width:${(v / scale) * 100}%" title="${k}: ${v} LU">${k} ${v}</i>`).join("")}<span class="cap" style="left:calc(${(r.L.cap / scale) * 100}% - 2px)" title="Cupo"></span></div></div>
    <p><a class="btn go" href="../cv-spec/samples/mid-qa-fullstack.pdf" download>Descargar PDF (muestra)</a> <a class="btn" href="../cv-spec/samples/mid-qa-fullstack.docx" download>Descargar Word (muestra)</a> <button class="btn" disabled title="Fase 2">LaTeX (F2)</button></p>
    <p class="mut">En producción se compila con Typst el CV que acaba de generar. Los archivos de muestra son el ejemplo del repositorio.</p>
    <h3>Escalera de ajuste</h3><ol>${r.log.map((l) => `<li>${esc(l)}</li>`).join("")}</ol>
    <h3>Cobertura de la oferta · <span class="num">${cov} %</span> con evidencia en el CV</h3>${chipRow({ terms: inCV })}
    <h3>Editar líneas (cada una se valida)</h3><div class="box">${r.cv.exps.map((e) => `<b>${esc(e.role)}, ${esc(e.company)}</b> <span class="mut">${e.dates}</span>${e.bl.map(bl).join("")}`).join("<br>")}${r.cv.projects.length ? `<br><b>Proyectos</b>${r.cv.projects.map((p) => `<div>${esc(p.name)}</div>${p.bl.map(bl).join("")}`).join("")}` : ""}</div>` : ""}`;
  const right = `<div class="sticky"><div class="tabs2" role="group" aria-label="Vista"><button data-a="pv" data-id="page" aria-pressed="${S.pv === "page"}">Página</button><button data-a="pv" data-id="ats" aria-pressed="${S.pv === "ats"}">Lo que ve el ATS</button><button data-a="pv" data-id="rep" aria-pressed="${S.pv === "rep"}">Reporte ATS</button></div>
    ${!r ? `<div class="empty"><b>Aquí aparecerá su CV</b><br>Siga los pasos de la izquierda: elija el puesto, analice la evidencia y genere. La vista previa se actualiza sola.<p><button class="btn" data-a="sample">Usar la oferta de ejemplo y analizar</button></p></div>`
      : S.pv === "page" ? `${paper(r.cv)}<div class="pg">Vista aproximada de la plantilla (acento sobrio, una columna). El PDF real usa Source Sans 3.</div>`
      : S.pv === "ats" ? `<pre class="cv" style="max-height:78vh;background:#fff;color:#000" aria-label="Texto extraído">${esc(txt)}</pre><div class="pg">Texto extraído en orden de lectura, tal como lo vería un ATS.</div>`
      : `<ul class="chk">${ck.map(([t, ok, n]) => `<li><span class="${ok ? "ok" : "no"}">${ok ? "✓" : "✕"}</span><span>${esc(t)}${n ? ` <span class="mut">· ${n}</span>` : ""}</span></li>`).join("")}</ul>`}</div>`;
  return `<div class="mk"><div>${left}</div>${right}</div>`;
}

const view = $("#view"), toast = (t) => { const n = $("#toast"); n.textContent = t; n.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (n.hidden = true), 2800); };
function render() {
  const a = document.activeElement, key = a && a.dataset && (a.dataset.k || a.dataset.p), attr = a && a.dataset && (a.dataset.k ? "k" : "p"), pos = a && a.selectionStart;
  BANK = deriveBank(B); view.innerHTML = S.tab === "banco" ? viewBanco() : viewCrear();
  $("#tabs").innerHTML = [["banco", "Banco"], ["crear", "Crear CV"]].map(([v, t]) => `<button data-a="tab" data-id="${v}" ${v === S.tab ? 'aria-current="page"' : ""}>${t}</button>`).join("");
  if (key) { const n = view.querySelector(`[data-${attr}="${key}"]`); if (n && n.type !== "radio" && n.type !== "checkbox") { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* select */ } } }
}
const tick = () => new Promise((r) => setTimeout(r, window.__NOWAIT ? 0 : 160));
const mapIt = () => { const m = analyze(S.mode === "oferta" ? S.offer : S.focus, S.mode !== "oferta"); m.terms.forEach((x) => (x.ev = evid(x.t))); m.cov = Math.round((m.terms.reduce((a, x) => a + x.w * ({ ok: 1, part: 0.5, gap: 0 }[x.ev.st]), 0) / (m.terms.reduce((a, x) => a + x.w, 0) || 1)) * 100); S.map = m; S.hard = S.mode === "oferta" ? hardFilters(S.offer) : []; S.res = null; S.steps = []; };
async function gen() {
  const L = lim(), names = ["Analizar la oferta (llamada 1)", "Mapear evidencia: cubierto, parcial, brecha", "Planificar el presupuesto de líneas por sección", "Redactar por sección (simulado): perfil, habilidades, cada experiencia, proyectos", "Validar con el guardián de verdad", "Escalera de ajuste a la página", "Renderizar y extraer texto con dos motores"];
  S.steps = []; S.res = null; for (const n of names) { S.steps.push([n, false]); render(); await tick(); S.steps[S.steps.length - 1][1] = true; }
  const cv = draft(L, S.map.terms, S.over), log = ladder(cv, L); S.res = { cv, L, log }; S.cvs++; S.pv = "page"; render();
}
function applyRole(id) { S.role = id; B = id === "primera" ? EMPTY() : clone(SEED); if (id === "invitada") B.contacto.name = "Persona invitada (ejemplo)"; S.tab = "banco"; S.sec = id === "primera" ? "historia" : "exps"; S.map = S.res = S.hard = null; S.steps = []; S.cvs = 0; render(); }

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-a]"); if (!t) return; const a = t.dataset.a, id = t.dataset.id, k = t.dataset.k, i = +t.dataset.i;
  if (a === "tab") { S.tab = id; return render(); } if (a === "sec") { S.sec = id; return render(); } if (a === "pv") { S.pv = id; return render(); }
  if (a === "add") { const tpl = { exps: () => ({ id: "e" + (Date.now() % 100000), role: "", company: "", loc: "", from: "", to: "", text: "" }), skills: () => ({ n: "", c: "", since: "", why: "" }), projects: () => ({ id: "p" + (Date.now() % 100000), name: "", link: "", what: "", how: "" }), edu: () => ({ degree: "", school: "", from: "", to: "", note: "" }), certs: () => ({ name: "", issuer: "", date: "", exp: "" }), langs: () => ({ lang: "", level: "B1", ev: "" }), otros: () => ({ t: "", x: "" }) }; B[k].push(tpl[k]()); return render(); }
  if (a === "del") { B[k].splice(i, 1); S.map = S.res = null; return render(); }
  if (a === "map") { mapIt(); return render(); } if (a === "sample") { S.mode = "oferta"; S.offer = window.HUELLA_OFFER; mapIt(); return render(); } if (a === "gen") return gen();
  if (a === "ed") { S.ed = id; S.edErr = ""; return render(); } if (a === "edx") { S.ed = null; S.edErr = ""; return render(); }
  if (a === "edsave") { const text = $('[data-k="edtext"]').value.trim(), err = validate(text, id, S.res.L); if (err) { S.edErr = err; return render(); } [...S.res.cv.exps.flatMap((x) => x.bl), ...S.res.cv.projects.flatMap((x) => x.bl)].find((b) => b.id === id).text = text; S.ed = null; S.edErr = ""; render(); return toast(total(S.res.cv, S.res.L) > S.res.L.cap ? "Atención: la edición excede el cupo de la página" : "Línea guardada"); }
});
function refreshDerived() {
  const sn = $("#snav"); if (sn) sn.innerHTML = snav(); BANK = deriveBank(B);
  $$("[data-w]").forEach((n) => (n.textContent = words(getP(B, n.dataset.w)) + " palabras"));
  $$("details.derived").forEach((d) => { const i = +d.id.split("-")[2]; if (B.exps[i]) d.innerHTML = derivedExp(B.exps[i]); });
  const sv = $("#saved"); if (sv) sv.textContent = "Guardado ahora mismo (en el navegador)";
}
document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.dataset.p) { setP(B, t.dataset.p, t.type === "number" ? +t.value || "" : t.value); S.map = S.res = null; return refreshDerived(); }
  const k = t.dataset.k; if (!k) return;
  if (k === "offer") { S.offer = t.value; S.map = null; } else if (k === "focus") { S.focus = t.value.slice(0, 200); S.map = null; } else return; render();
});
document.addEventListener("change", (e) => {
  const t = e.target, k = t.dataset.k; if (t.dataset.p) { setP(B, t.dataset.p, t.value); S.map = S.res = null; return refreshDerived(); } if (!k) return;
  if (k === "level" || k === "paper" || k === "mode") { S[k] = t.value; S.map = null; S.res = null; S.steps = []; } else if (k === "prov") { S.prov = t.value; if (!PROV[S.prov].m[S.tier]) S.tier = "fast"; if (PROV[S.prov].free) S.pii = true; }
  else if (k === "tier") S.tier = t.value; else if (k === "pii") S.pii = t.checked; else if (k === "over") S.over = t.checked; else return; render();
});
DevKit.init({ app: "huella-estudio", roles: [
  { id: "owner", label: "Propietaria (banco completo)", desc: "Su banco privado completo, filtros y conexión de IA propia (Gemini gratuito)." },
  { id: "primera", label: "Primera vez (banco vacío)", desc: "Lo que ve alguien que acaba de empezar: guía para contar, sin material aún." },
  { id: "invitada", label: "Invitada (F3)", desc: "Persona a quien la propietaria cede el Estudio: su banco es solo suyo; cuota compartida de IA." } ], role: "owner", onRole: applyRole });
