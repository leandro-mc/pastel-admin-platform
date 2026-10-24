/* Huella · Estudio (prototipo). La IA está SIMULADA (selección determinista + variantes corta/larga). Todo lo demás es la lógica real propuesta:
   límites de cv-spec/limits.json, presupuesto de líneas, escalera de ajuste, guardián de verdad y reporte ATS. Persona FICTICIA. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fold = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const ln = (n, c) => Math.max(1, Math.ceil(n / c));

  // ── Límites verificados (docs/requirements/huella/cv-spec/limits.json) ──
  const BASE = {
    junior: { label: "Junior (0–3 años)", pages: 1, sum: 180, groups: 4, gchars: 90, skills: 22, entries: 3, lines: [5, 3, 0], bmax: 170, proj: 2, pl: [2, 2] },
    mid: { label: "Mid-level (3–8 años)", pages: 2, sum: 270, groups: 5, gchars: 180, skills: 30, entries: 5, lines: [9, 8, 6, 4, 2], bmax: 175, proj: 2, pl: [3, 3] },
    senior: { label: "Senior (8+ años)", pages: 2, sum: 380, groups: 6, gchars: 180, skills: 38, entries: 6, lines: [11, 9, 7, 5, 3, 0], bmax: 180, proj: 1, pl: [3] },
  };
  const PAPER = { letter: { junior: [50, 93, 91], mid: [97, 93, 91], senior: [101, 98, 95] }, a4: { junior: [53, 90, 88], mid: [103, 90, 88], senior: [109, 95, 92] } };
  const BANNED = ["profesional apasionado", "orientado a resultados", "proactivo", "responsable de", "results-driven", "team player", "dinámico"];

  // ── Banco de evidencia (ficticio). short ≤ 110 (1 línea) · long ≤ 170 (2 líneas) ──
  const A = (id, short, long, skills, strength) => ({ id, short, long, skills, strength });
  const BANK = {
    name: "Marta Solís Araya", headline: "QA Engineer / Desarrolladora Fullstack", contact: ["marta.ejemplo@correo.test", "+506 8888-0000", "Heredia, Costa Rica"],
    exps: [
      { id: "e1", role: "QA Automation Engineer", company: "Empresa Ejemplo S.A.", loc: "San José, CR", from: "Mar 2022", to: "Presente", ach: [
        A("a1", "Automaticé 140 pruebas E2E con Playwright; la regresión manual bajó de 2 días a 3 horas.", "Automaticé 140 pruebas end-to-end con Playwright y reduje la regresión manual de 2 días a 3 horas antes de cada versión.", ["Playwright", "E2E"], 5),
        A("a2", "Integré las pruebas a GitHub Actions; los fallos por despliegue bajaron 35 % en seis meses.", "Integré las pruebas a GitHub Actions como puerta de despliegue; los fallos por despliegue bajaron 35 % en seis meses.", ["GitHub Actions", "CI/CD"], 5),
        A("a3", "Pruebas de carga con k6 sobre 12 endpoints críticos antes de la versión 3.", "Diseñé pruebas de carga con k6 sobre 12 endpoints críticos de la API antes del lanzamiento de la versión 3.", ["k6", "API"], 4),
        A("a4", "Definí la estrategia de regresión de 3 equipos con un tablero de calidad semanal.", "Definí la estrategia de pruebas de regresión de 3 equipos y un tablero de calidad semanal que producto usa en su revisión.", ["Estrategia de pruebas", "Liderazgo"], 4),
        A("a5", "Mentoría a 2 personas junior en automatización de pruebas.", "Acompañé como mentora a 2 personas junior en automatización de pruebas; ambas pasaron a mantener sus propias suites.", ["Mentoría"], 3),
        A("a6", "Reduje 40 % el tiempo de la suite al paralelizar la ejecución en CI.", "Reduje 40 % el tiempo de ejecución de la suite al paralelizarla en CI, de 25 a 15 minutos por cambio.", ["CI/CD", "Playwright"], 4),
      ] },
      { id: "e2", role: "Desarrolladora Fullstack", company: "Estudio Demo", loc: "Heredia, CR", from: "Jun 2020", to: "Feb 2022", ach: [
        A("a7", "Elevé la cobertura de pruebas del 38 % al 71 % con pruebas unitarias y de integración.", "Elevé la cobertura de pruebas del 38 % al 71 % escribiendo pruebas unitarias y de integración en C# y TypeScript.", ["C#", "TypeScript"], 4),
        A("a8", "Construí un módulo de reservas en C# y React usado por 8 clientes.", "Construí un módulo de reservas en C# y React que hoy usan 8 clientes, con confirmación automática por correo.", ["C#", "React"], 4),
        A("a9", "Diseñé una API REST con 20 endpoints documentados con OpenAPI.", "Diseñé una API REST con 20 endpoints documentados con OpenAPI, consumida por la aplicación web y la móvil.", ["API", "C#"], 3),
      ] },
      { id: "e3", role: "Practicante de desarrollo", company: "Startup Piloto", loc: "Heredia, CR", from: "Ene 2019", to: "Dic 2019", ach: [
        A("a10", "Automaticé reportes semanales en Python que ahorraban 4 horas de trabajo manual.", "Automaticé reportes semanales en Python que ahorraban 4 horas de trabajo manual al equipo de operaciones.", ["Python"], 3),
        A("a11", "Corregí 30 defectos del backlog como primera experiencia en pruebas.", "Corregí 30 defectos del backlog y escribí mis primeros casos de prueba manuales para el equipo.", ["Pruebas manuales"], 2),
      ] },
    ],
    projects: [
      { id: "p1", name: "Bitácora de calidad", stack: "TypeScript, Playwright, GitHub Actions", ach: [A("a12", "Panel open source que agrupa fallos de pruebas por causa raíz; 120 estrellas en GitHub.", "Panel open source que agrupa fallos de pruebas por causa raíz; alcanzó 120 estrellas en GitHub y 4 contribuciones externas.", ["TypeScript", "Playwright"], 4)] },
      { id: "p2", name: "Reportero de pruebas", stack: "Python, PDF", ach: [A("a13", "Script que genera cada semana el reporte de calidad en PDF a partir de los resultados.", "Script que genera cada semana el reporte de calidad en PDF a partir de los resultados de las pruebas del equipo.", ["Python"], 2)] },
    ],
    skills: [["Playwright", "Pruebas"], ["Cypress", "Pruebas"], ["Postman", "Pruebas"], ["k6", "Pruebas"], ["E2E", "Pruebas"], ["API", "Pruebas"], ["Estrategia de pruebas", "Pruebas"], ["TypeScript", "Lenguajes"], ["C#", "Lenguajes"], ["Python", "Lenguajes"], ["SQL", "Lenguajes"], ["React", "Frameworks y herramientas"], ["GitHub Actions", "Frameworks y herramientas"], ["CI/CD", "Frameworks y herramientas"], ["Docker", "Frameworks y herramientas"], ["Git", "Frameworks y herramientas"], ["Jira", "Frameworks y herramientas"], ["Mentoría", "Prácticas"]].map(([n, c]) => ({ n, c })),
    edu: [{ degree: "Bachillerato en Ingeniería Informática", school: "Universidad Ejemplo", dates: "2016 - 2020", detail: "Énfasis en ingeniería de software." }],
    extras: ["ISTQB Foundation Level (2023)", "Español: nativo | Inglés: B2 (lectura técnica avanzada)"],
  };
  const OFFER = "QA Automation Engineer — Fintech Ejemplo (remoto, Costa Rica)\nBuscamos una persona con experiencia en automatización de pruebas end-to-end con Playwright o Cypress, integración en CI/CD con GitHub Actions, pruebas de API y de carga (k6 o JMeter) y conocimientos de Docker y Kubernetes. Inglés técnico.\nValoramos: mentoría a personas junior, estrategia de pruebas de regresión y experiencia con TypeScript.";
  const KNOWN = [["Playwright", ["playwright"]], ["Cypress", ["cypress"]], ["E2E", ["e2e", "end-to-end"]], ["CI/CD", ["ci/cd", "github actions", "pipeline"]], ["GitHub Actions", ["github actions"]], ["API", ["api", "endpoints"]], ["k6", ["k6"]], ["JMeter", ["jmeter"]], ["Docker", ["docker"]], ["Kubernetes", ["kubernetes", "k8s"]], ["TypeScript", ["typescript"]], ["C#", ["c#"]], ["React", ["react"]], ["Python", ["python"]], ["SQL", ["sql", "postgres"]], ["Mentoría", ["mentoria", "mentor"]], ["Estrategia de pruebas", ["estrategia de pruebas", "estrategia de regresion"]], ["Inglés", ["ingles", "english"]]];
  const ADJ = { Kubernetes: "Docker", JMeter: "k6", Cypress: "Playwright" };
  const PROV = { gemini: { n: "Gemini", m: { fast: "Flash-Lite (gratuito)", bal: "Flash (gratuito)", best: null }, rpm: 10, free: true }, openai: { n: "OpenAI", m: { fast: "mini (vigente)", bal: "estándar (vigente)", best: "superior (vigente)" }, rpm: 60 }, anthropic: { n: "Anthropic (Claude)", m: { fast: "claude-haiku-5-5", bal: "claude-sonnet-5-5", best: "claude-opus-5-5" }, rpm: 50 }, manual: { n: "Modo manual (copiar y pegar)", m: { fast: "cualquier chat", bal: "cualquier chat", best: "cualquier chat" }, rpm: 0 } };

  const S = { tab: "generar", paper: "letter", level: "mid", mode: "oferta", focus: "Enfocado a QA y automatización; destaco CI/CD y pruebas de API.", offer: OFFER, prov: "gemini", tier: "fast", pii: true, over: true, map: null, steps: [], res: null, ed: null, edErr: "" };
  const lim = () => { const b = BASE[S.level], [cap, cpl, bul] = PAPER[S.paper][S.level]; return { ...b, cap, cpl, bul }; };
  const ACH = () => [...BANK.exps.flatMap((e) => e.ach), ...BANK.projects.flatMap((p) => p.ach)];
  const synOf = (t) => (KNOWN.find((k) => k[0] === t) || [t, [fold(t)]])[1].map(fold);
  const nums = (s) => (s.match(/\d+(?:[.,]\d+)?/g) || []);

  // ── Análisis de la oferta (simula la llamada job_analysis) y mapa de evidencia ──
  const analyze = (text, focus) => {
    const f = fold(text), cut = focus ? -1 : f.search(/valoramos|deseable|nice to have/);
    const terms = KNOWN.map(([t, syn]) => { const idx = Math.min(...syn.map((s) => { const i = f.indexOf(s); return i < 0 ? 1e9 : i; })); return idx < 1e9 ? { t, w: cut > -1 && idx > cut ? 1 : 3 } : null; }).filter(Boolean);
    return { title: focus ? "Perfil enfocado" : text.split("\n")[0].trim().slice(0, 70), terms };
  };
  const evid = (t) => {
    const syn = synOf(t), hits = ACH().filter((a) => a.skills.some((s) => syn.includes(fold(s))) || syn.some((s) => fold(a.short + " " + a.long).includes(s)));
    if (hits.length) return { st: "ok", n: hits.length };
    if (t === "Inglés") return { st: "ok", n: 1, note: "idiomas" };
    if (BANK.skills.some((s) => syn.includes(fold(s.n)))) return { st: "part", n: 0, note: "figura en habilidades, sin logro que lo respalde" };
    if (ADJ[t] && evid(ADJ[t]).st === "ok") return { st: "part", n: 0, note: "adyacente: " + ADJ[t] };
    return { st: "gap", n: 0 };
  };
  const score = (a, r, terms) => { const f = fold(a.short + " " + a.long + " " + a.skills.join(" ")); let s = a.strength * 0.5 - r * 0.3; terms.forEach(({ t, w }) => { if (synOf(t).some((x) => f.includes(x))) s += w; }); return s; };

  // ── Borrador por sección (simula las llamadas a la IA; puede pasarse de largo) ──
  const draft = (L, terms, over) => {
    const exps = BANK.exps.slice(0, L.entries).map((e, r) => {
      const budget = L.lines[r] || 0, cap = over && budget ? Math.ceil(budget * 1.4) + 1 : budget; let used = 0; const bl = [];
      e.ach.map((a) => ({ a, sc: score(a, r, terms) })).sort((x, y) => y.sc - x.sc).forEach(({ a, sc }) => {
        const l = ln(a.long.length, L.bul), ls = ln(a.short.length, L.bul);
        if (cap && used + l <= cap) { bl.push({ id: a.id, text: a.long, sh: a.short, v: "larga", sc }); used += l; } else if (cap && used + ls <= cap) { bl.push({ id: a.id, text: a.short, sh: a.short, v: "corta", sc }); used += ls; }
      });
      return { role: e.role, company: e.company, loc: e.loc, dates: `${e.from} - ${e.to}`, budget, bl };
    });
    const projects = BANK.projects.map((p, i) => ({ p, sc: Math.max(...p.ach.map((a) => score(a, 0, terms))) })).sort((x, y) => y.sc - x.sc).slice(0, L.proj)
      .map(({ p }, i) => ({ name: p.name, stack: p.stack, budget: L.pl[i], bl: p.ach.map((a) => ({ id: a.id, text: ln(a.long.length, L.bul) <= L.pl[i] ? a.long : a.short, sh: a.short, v: "larga", sc: score(a, 0, terms) })) }));
    const rel = (n) => (terms.some(({ t }) => synOf(t).includes(fold(n))) ? 1 : 0), ev = (n) => ACH().filter((a) => a.skills.includes(n)).length, cats = {};
    BANK.skills.forEach((s) => (cats[s.c] = cats[s.c] || []).push(s.n));
    let total = 0;
    const skills = Object.entries(cats).map(([c, items]) => ({ c, items: items.sort((x, y) => rel(y) - rel(x) || ev(y) - ev(x)), r: Math.max(...items.map(rel)) })).sort((x, y) => y.r - x.r).slice(0, L.groups).map((g) => {
      const its = []; g.items.forEach((n) => { if (total < L.skills && (c => c.length + 2 + [...its, n].join(", ").length <= L.gchars)(g.c)) { its.push(n); total++; } }); return { line: `${g.c}: ${its.join(", ")}` };
    });
    const top = terms.map((x) => x.t).filter((t) => evid(t).st === "ok" && !["Inglés", "API", "E2E"].includes(t)).slice(0, 3);
    let sum = `QA y desarrolladora con 5 años automatizando pruebas de APIs y web. Experiencia comprobada con ${top.join(", ") || "automatización de pruebas"}${terms.some((x) => x.t === "Mentoría") ? " y mentoría de personas junior" : ""}.`;
    if (over && sum.length < L.sum + 60) sum += " Trabajo cerca de producto para detectar fallos antes de producción y medir su impacto con datos.";
    return { summary: sum, skills, exps, projects, edu: BANK.edu.map((e) => ({ ...e, detail: S.level === "junior" ? e.detail : S.level === "mid" ? e.detail : "" })), extras: BANK.extras.slice(), refs: top };
  };
  const luOf = (cv, L) => ({
    header: 5.5, summary: 2 + ln(cv.summary.length, L.cpl), skills: 2 + cv.skills.reduce((a, g) => a + ln(g.line.length, L.cpl), 0),
    experience: 2 + cv.exps.reduce((a, e) => a + 1.5 + e.bl.reduce((b, x) => b + ln(x.text.length, L.bul), 0), 0),
    projects: cv.projects.length ? 2 + cv.projects.reduce((a, p) => a + 1.5 + p.bl.reduce((b, x) => b + ln(x.text.length, L.bul), 0), 0) : 0,
    education: 2 + cv.edu.reduce((a, e) => a + 1.5 + (e.detail ? ln(e.detail.length, L.cpl) : 0), 0), extras: 2 + cv.extras.reduce((a, x) => a + ln(x.length, L.cpl), 0),
  });
  const total = (cv, L) => Object.values(luOf(cv, L)).reduce((a, b) => a + b, 0);

  // ── Escalera de ajuste (HUELLA §7.6): el conteo del compilador es la verdad; aquí, el presupuesto de líneas ──
  const ladder = (cv, L) => {
    const log = [`Borrador de la IA: ${total(cv, L)} LU frente a un cupo de ${L.cap} LU (${L.pages} pág.).`], lines = (e) => e.bl.reduce((b, x) => b + ln(x.text.length, L.bul), 0);
    if (cv.summary.length > L.sum) { const cut = cv.summary.slice(0, L.sum + 1).replace(/\s+\S*$/, ""); log.push(`Paso 1 · Perfil: comprimido de ${cv.summary.length} a ${cut.length + 1} caracteres (tope ${L.sum}).`); cv.summary = cut.replace(/[.,;]$/, "") + "."; }
    cv.exps.forEach((e) => { while (lines(e) > e.budget) {
      const low = e.bl.slice().sort((a, b) => a.sc - b.sc), sw = low.find((x) => x.v === "larga" && ln(x.sh.length, L.bul) < ln(x.text.length, L.bul));
      if (sw) { log.push(`Paso 1 · ${e.company}: variante corta para ${sw.id} (${ln(sw.text.length, L.bul)}→${ln(sw.sh.length, L.bul)} líneas).`); sw.text = sw.sh; sw.v = "corta"; continue; }
      if (e.bl.length > 1) { const d = low[0]; e.bl.splice(e.bl.indexOf(d), 1); log.push(`Paso 2 · ${e.company}: se retira ${d.id}, la viñeta menos relevante (puntuación ${d.sc.toFixed(1)}).`); continue; }
      break; } });
    let guard = 40;
    while (total(cv, L) > L.cap && guard--) {
      if (cv.projects.length > 1) { const p = cv.projects.pop(); log.push(`Paso 3 · se retira el proyecto «${p.name}».`); }
      else if (cv.skills.some((g) => g.line.split(", ").length > 3)) { const g = cv.skills.filter((x) => x.line.split(", ").length > 3).pop(); g.line = g.line.replace(/, [^,]+$/, ""); log.push("Paso 3 · se recorta la última habilidad de un grupo."); }
      else break;
    }
    if (total(cv, L) > L.cap) log.push("Paso 5 · FALLA con guía: aún excede el cupo; se pedirá al candidato quitar contenido. No se reduce la fuente bajo 10 pt.");
    else log.push(`Resultado: ${total(cv, L)} LU ≤ ${L.cap} LU. Cupo garantizado${log.length === 1 ? " sin ajustes" : ""}.`);
    return log;
  };

  const atsText = (cv) => [BANK.name, BANK.headline, BANK.contact.join("  |  "), "", "Perfil profesional", cv.summary, "", "Habilidades técnicas", ...cv.skills.map((g) => g.line), "", "Experiencia laboral",
    ...cv.exps.flatMap((e) => [`${e.role}, ${e.company}, ${e.loc}   ${e.dates}`, ...e.bl.map((b) => "• " + b.text), ""]),
    ...(cv.projects.length ? ["Proyectos", ...cv.projects.flatMap((p) => [`${p.name} | ${p.stack}`, ...p.bl.map((b) => "• " + b.text)]), ""] : []),
    "Educación", ...cv.edu.flatMap((e) => [`${e.degree}, ${e.school}   ${e.dates}`, ...(e.detail ? [e.detail] : [])]), "", "Certificaciones e idiomas", ...cv.extras].join("\n");
  const srcNums = (id) => { const a = ACH().find((x) => x.id === id); return new Set(nums(a.short + " " + a.long)); };
  const validate = (text, id, L) => {
    if (text.length > L.bmax) return `Excede el tope duro (${text.length}/${L.bmax} caracteres).`;
    const src = srcNums(id), bad = nums(text).find((n) => !src.has(n)); if (bad) return `Cifra nueva «${bad}» sin respaldo en el banco: agréguela al logro y márquela como verificada.`;
    const b = BANNED.find((x) => fold(text).includes(fold(x))); return b ? `Frase prohibida: «${b}».` : "";
  };
  const checks = (cv, L, map) => {
    const txt = atsText(cv), bl = [...cv.exps.flatMap((e) => e.bl), ...cv.projects.flatMap((p) => p.bl)], tot = total(cv, L);
    return [
      ["Una columna, sin tablas, iconos ni imágenes", true, "garantizado por la plantilla"], ["Encabezados estándar y contacto en el cuerpo", /Experiencia laboral/.test(txt) && txt.includes(BANK.contact[0]), ""],
      ["Fecha en la misma línea que cargo y empresa", cv.exps.every((e) => txt.split("\n").some((l) => l.startsWith(e.role) && l.includes(e.dates))), ""], ["Sin ligaduras Unicode (ﬁ ﬂ ﬀ)", !/[\ufb00-\ufb06]/.test(txt), ""],
      [`Dentro del cupo de páginas (${tot} de ${L.cap} LU)`, tot <= L.cap, ""], [`Ninguna viñeta supera el tope duro (${L.bmax})`, bl.every((b) => b.text.length <= L.bmax), ""],
      ["Sin frases prohibidas", !BANNED.some((b) => fold(txt).includes(fold(b))), ""], ["Cada viñeta cita su logro de origen (sourceIds)", bl.every((b) => b.id), ""],
      ["Todas las cifras existen en el banco", bl.every((b) => nums(b.text).every((n) => srcNums(b.id).has(n))), ""], ["Ninguna habilidad inventada (todas están en el banco)", cv.skills.every((g) => g.line.split(": ")[1].split(", ").every((s) => BANK.skills.some((k) => k.n === s))), ""],
    ];
  };

  const tick = () => new Promise((r) => setTimeout(r, window.__NOWAIT ? 0 : 160));
  const view = $("#view"), toast = (t) => { const n = $("#toast"); n.textContent = t; n.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (n.hidden = true), 2800); };
  const cnt = (n, m) => `<div class="cnt ${n > m ? "over" : ""}">${n}/${m}</div>`;
  const chipRow = (map) => `<div class="chips">${map.terms.map((x) => `<span class="${{ ok: "y", part: "p", gap: "n" }[x.ev.st]}" title="${esc(x.ev.note || "")}">${{ ok: "✓", part: "~", gap: "✕" }[x.ev.st]} ${esc(x.t)}${x.w === 1 ? " (deseable)" : ""}${x.ev.note ? " · " + esc(x.ev.note) : x.ev.st === "ok" ? " · " + x.ev.n + " evid." : " · brecha"}</span>`).join("")}</div>`;

  const V = {
    banco() {
      return `<h1>Banco de evidencia</h1><p class="mut">Cada logro tiene dos variantes para que la escalera de ajuste elija sin pedirle nada más a la IA: corta (1 línea, ≤ 110) y larga (2 líneas, ≤ 170).</p>
      ${[...BANK.exps.map((e) => [e.role + " · " + e.company, e.ach]), ...BANK.projects.map((p) => ["Proyecto · " + p.name, p.ach])].map(([t, as]) => `<h2>${esc(t)}</h2>${as.map((a) => `<div class="ach">
        <label class="f">Corta ${a.id}<textarea data-k="s:${a.id}" style="min-height:3rem">${esc(a.short)}</textarea></label>${cnt(a.short.length, 110)}
        <label class="f">Larga<textarea data-k="l:${a.id}" style="min-height:3.5rem">${esc(a.long)}</textarea></label>${cnt(a.long.length, 170)}
        ${a.skills.map((s) => `<span class="tag">${esc(s)}</span>`).join("")}${nums(a.short + a.long).length ? "" : '<span class="tag w">sin cifra: pregunte «¿cuánto?»</span>'}</div>`).join("")}`).join("")}
      <h2>Habilidades y su respaldo</h2><div class="chips">${BANK.skills.map((s) => { const n = ACH().filter((a) => a.skills.includes(s.n)).length; return `<span class="${n ? "y" : "n"}">${esc(s.n)} · ${n ? n + " evid." : "sin respaldo"}</span>`; }).join("")}</div>`;
    },
    generar() {
      const L = lim(), P = PROV[S.prov], calls = 4 + Math.min(L.entries, 3), secs = P.rpm ? calls * Math.ceil(60 / P.rpm) : 0;
      const contact = S.pii ? "{{EMAIL}} | {{PHONE}} | {{CITY}}" : BANK.contact.join(" | "), payload = JSON.stringify({ tarea: "experience_bullets", contacto: contact, entrada: { rol: BANK.exps[0].role, empresa: BANK.exps[0].company }, logros: BANK.exps[0].ach.slice(0, 2).map((a) => ({ id: a.id, texto: a.short })) }, null, 1);
      const leaks = /[\w.+-]+@[\w-]+\.[\w.]+|\+?\d[\d\s-]{7,}/.test(payload);
      return `<h1>Generar un CV</h1>
      <div class="grid"><div class="box"><b>1 · Nivel y papel</b><div class="seg" role="radiogroup" aria-label="Nivel">${Object.entries(BASE).map(([k, b]) => `<label><input type="radio" name="lv" data-k="level" value="${k}" ${S.level === k ? "checked" : ""}>${b.label}</label>`).join("")}</div>
        <div class="seg" style="margin-top:.5rem">${["letter", "a4"].map((p) => `<label><input type="radio" name="pp" data-k="paper" value="${p}" ${S.paper === p ? "checked" : ""}>${p === "letter" ? "Carta" : "A4"}</label>`).join("")}</div>
        <p class="mut">Cupo: ${L.pages} pág. · ${L.cap} LU · ${L.cpl} caracteres por línea · viñeta máx. ${L.bmax}</p></div>
      <div class="box"><b>2 · Entrada</b><div class="seg">${[["oferta", "Desde una oferta"], ["enfocado", "Perfil enfocado"]].map(([v, t]) => `<label><input type="radio" name="md" data-k="mode" value="${v}" ${S.mode === v ? "checked" : ""}>${t}</label>`).join("")}</div>
        ${S.mode === "oferta" ? `<label class="f">Texto de la oferta (se trata como dato, nunca como instrucciones)<textarea data-k="offer">${esc(S.offer)}</textarea></label>` : `<label class="f">Mini-prompt de enfoque (máx. 200)<textarea data-k="focus" maxlength="200" style="min-height:3.5rem">${esc(S.focus)}</textarea></label>${cnt(S.focus.length, 200)}`}</div>
      <div class="box"><b>3 · Conexión de IA</b><label class="f">Proveedor<select data-k="prov">${Object.entries(PROV).map(([k, p]) => `<option value="${k}" ${S.prov === k ? "selected" : ""}>${p.n}</option>`).join("")}</select></label>
        <label class="f">Nivel de modelo<select data-k="tier">${[["fast", "Rápido"], ["bal", "Equilibrado"], ["best", "Máximo"]].map(([k, t]) => `<option value="${k}" ${P.m[k] ? "" : "disabled"} ${S.tier === k ? "selected" : ""}>${t} · ${P.m[k] || "no disponible en el plan gratuito"}</option>`).join("")}</select></label>
        <label class="seg"><span style="border:0;background:none;padding:0"><input type="checkbox" data-k="pii" ${S.pii || P.free ? "checked" : ""} ${P.free ? "disabled" : ""} style="position:static;opacity:1"> Escudo de datos personales${P.free ? " (obligatorio en el plan gratuito de Gemini)" : ""}</span></label>
        <p class="mut">≈ ${calls} llamadas${secs ? ` · ≈ ${secs} s con el límite gratuito (1 cada ${Math.ceil(60 / P.rpm)} s)` : ""}. Costo estimado: céntimos de dólar en un modelo rápido de pago (verificar precios).</p></div></div>
      <details class="box" style="margin-top:1rem"><summary><b>Lo que se enviaría al proveedor</b> · ${leaks ? "⚠ incluye datos personales" : "✓ sin correo ni teléfono"}</summary><pre>${esc(payload)}</pre>${S.prov === "manual" ? '<p class="mut">Modo manual: copie este paquete en cualquier chat, pegue el JSON de respuesta y pasará por el mismo validador.</p>' : ""}</details>
      <label class="seg" style="margin:.8rem 0"><span style="border:0;background:none;padding:0"><input type="checkbox" data-k="over" ${S.over ? "checked" : ""} style="position:static;opacity:1"> Simular un borrador que se pasa de largo (para ver la escalera de ajuste)</span></label>
      <p><button class="btn" data-a="map">1 · Analizar y mapear evidencia</button> <button class="btn go" data-a="gen" ${S.map ? "" : "disabled"}>2 · Generar CV</button></p>
      ${S.map ? `<h2>Mapa de evidencia · ${esc(S.map.title)}</h2><p class="mut">Cobertura honesta de partida: <b class="num">${S.map.cov} %</b>. Lo que no tiene respaldo se muestra como brecha; nunca se inventa.</p>${chipRow(S.map)}` : ""}
      ${S.steps.length ? `<h2>Proceso</h2>${S.steps.map((s) => `<div class="st ${s[1] ? "done" : ""}"><b>${s[1] ? "✓" : "…"}</b><span>${esc(s[0])}</span></div>`).join("")}` : ""}`;
    },
    resultado() {
      const r = S.res; if (!r) return `<h1>Resultado</h1><p>Aún no hay un CV generado. Vaya a «Generar».</p>`;
      const { cv, L, log } = r, lu = luOf(cv, L), tot = total(cv, L), scale = Math.max(L.cap, tot), ck = checks(cv, L, S.map), txt = atsText(cv);
      const inCV = S.map.terms.map((x) => ({ ...x, in: synOf(x.t).some((s) => fold(txt).includes(s)) }));
      const cov = Math.round((inCV.filter((x) => x.in && x.ev.st === "ok").reduce((a, x) => a + x.w, 0) / S.map.terms.reduce((a, x) => a + x.w, 0)) * 100);
      const bl = (b) => (S.ed === b.id ? `<div class="bl"><span><textarea data-k="edtext">${esc(b.text)}</textarea>${S.edErr ? `<div class="err">${esc(S.edErr)}</div>` : ""}</span><button class="btn sm go" data-a="edsave" data-id="${b.id}">Guardar</button><button class="btn sm" data-a="edx">Cancelar</button></div>`
        : `<div class="bl"><span>• ${esc(b.text)} <small class="mut">[${b.id} · ${b.v} · ${b.text.length} car.]</small></span><button class="btn sm" data-a="ed" data-id="${b.id}">Editar</button></div>`);
      return `<h1>Resultado · ${L.label}</h1>
      <div class="box"><b>Presupuesto de la página:</b> <span class="num">${tot}</span> de <span class="num">${L.cap}</span> LU · ${Math.ceil(tot / (L.cap / L.pages))} de ${L.pages} página(s)
        <div class="m" role="img" aria-label="Uso de la página por sección">${Object.entries(lu).filter(([, v]) => v).map(([k, v]) => `<i style="width:${(v / scale) * 100}%" title="${k}: ${v} LU">${k} ${v}</i>`).join("")}<span class="cap" style="left:calc(${(L.cap / scale) * 100}% - 2px)" title="Cupo"></span></div>
        <p class="mut">La línea roja es el cupo. El conteo definitivo de páginas lo da el compilador; esto es el presupuesto previo.</p></div>
      <h2>Escalera de ajuste</h2><ol>${log.map((l) => `<li>${esc(l)}</li>`).join("")}</ol>
      <h2>Cobertura de la oferta · <span class="num">${cov} %</span> con evidencia en el CV</h2>${chipRow({ terms: inCV })}
      <h2>Vista editable (cada línea se valida)</h2>
      <div class="box"><b>Perfil profesional</b> <small class="mut">${cv.summary.length}/${L.sum}</small><p>${esc(cv.summary)}</p>
      ${cv.exps.map((e) => `<b>${esc(e.role)}, ${esc(e.company)}</b> <span class="mut">${e.dates}</span>${e.bl.map(bl).join("")}`).join("<br>")}
      ${cv.projects.length ? `<br><b>Proyectos</b>${cv.projects.map((p) => `<div>${esc(p.name)} | ${esc(p.stack)}</div>${p.bl.map(bl).join("")}`).join("")}` : ""}</div>
      <h2>Reporte ATS</h2><ul class="chk">${ck.map(([t, ok, n]) => `<li><span class="${ok ? "ok" : "no"}">${ok ? "✓" : "✕"}</span><span>${esc(t)}${n ? ` <span class="mut">· ${n}</span>` : ""}</span></li>`).join("")}</ul>
      <h2>Lo que ve el ATS (texto extraído, en orden de lectura)</h2><pre class="cv" aria-label="Texto extraído">${esc(txt)}</pre>
      <p class="mut">En producción el PDF se compila con Typst desde este mismo contenido y se extrae con dos motores; el prototipo muestra el texto que la plantilla produciría. Un PDF real de ejemplo está en <code>../cv-spec/samples/</code>.</p>`;
    },
  };
  const TABS = [["banco", "Banco"], ["generar", "Generar"], ["resultado", "Resultado"]];
  const render = () => {
    const a = document.activeElement, key = a && a.dataset && a.dataset.k, pos = a && a.selectionStart;
    view.innerHTML = V[S.tab](); $("#tabs").innerHTML = TABS.map(([v, t]) => `<button data-v="${v}" ${v === S.tab ? 'aria-current="page"' : ""}>${t}</button>`).join("");
    if (key) { const n = view.querySelector(`[data-k="${key}"]`); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* radio */ } } }
  };
  const mapIt = () => { const m = analyze(S.mode === "oferta" ? S.offer : S.focus, S.mode !== "oferta"); m.terms.forEach((x) => (x.ev = evid(x.t))); m.cov = Math.round((m.terms.reduce((a, x) => a + x.w * ({ ok: 1, part: 0.5, gap: 0 }[x.ev.st]), 0) / (m.terms.reduce((a, x) => a + x.w, 0) || 1)) * 100); S.map = m; };
  const gen = async () => {
    const L = lim(), names = ["Analizar la oferta (llamada 1)", "Mapear evidencia: cubierto, parcial, brecha", "Planificar el presupuesto de líneas por sección", "Redactar por sección (simulado): perfil, habilidades, cada experiencia, proyectos", "Validar con el guardián de verdad", "Escalera de ajuste a la página", "Renderizar y extraer texto con dos motores"];
    S.steps = []; S.res = null; for (const n of names) { S.steps.push([n, false]); render(); await tick(); S.steps[S.steps.length - 1][1] = true; }
    const cv = draft(L, S.map.terms, S.over), log = ladder(cv, L); S.res = { cv, L, log }; S.tab = "resultado"; render(); window.scrollTo(0, 0);
  };

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-v],[data-a]"); if (!t) return;
    if (t.dataset.v) { S.tab = t.dataset.v; return render(); }
    const a = t.dataset.a, id = t.dataset.id;
    if (a === "map") { mapIt(); S.steps = []; return render(); }
    if (a === "gen") return gen();
    if (a === "ed") { S.ed = id; S.edErr = ""; return render(); }
    if (a === "edx") { S.ed = null; S.edErr = ""; return render(); }
    if (a === "edsave") {
      const text = $('[data-k="edtext"]').value.trim(), err = validate(text, id, S.res.L);
      if (err) { S.edErr = err; return render(); }
      [...S.res.cv.exps.flatMap((x) => x.bl), ...S.res.cv.projects.flatMap((x) => x.bl)].find((b) => b.id === id).text = text; S.ed = null; S.edErr = "";
      render(); if (total(S.res.cv, S.res.L) > S.res.L.cap) toast("Atención: la edición excede el cupo de la página"); else toast("Línea guardada"); return;
    }
  });
  const onChange = (e) => {
    const t = e.target, k = t.dataset && t.dataset.k; if (!k) return;
    if (/^[sl]:/.test(k)) { const a = ACH().find((x) => x.id === k.slice(2)); a[k[0] === "s" ? "short" : "long"] = t.value; S.map = null; S.res = null; return render(); }
    if (k === "level" || k === "paper" || k === "mode") { S[k] = t.value; S.map = null; S.res = null; S.steps = []; }
    else if (k === "prov") { S.prov = t.value; if (!PROV[S.prov].m[S.tier]) S.tier = "fast"; if (PROV[S.prov].free) S.pii = true; }
    else if (k === "tier") S.tier = t.value; else if (k === "pii") S.pii = t.checked; else if (k === "over") S.over = t.checked; else return;
    render();
  };
  document.addEventListener("change", onChange);
  document.addEventListener("input", (e) => {
    const t = e.target, k = t.dataset && t.dataset.k; if (!k) return;
    if (k === "offer") { S.offer = t.value; S.map = null; } else if (k === "focus") { S.focus = t.value.slice(0, 200); S.map = null; }
    else if (/^[sl]:/.test(k)) { const a = ACH().find((x) => x.id === k.slice(2)); a[k[0] === "s" ? "short" : "long"] = t.value; return; } else return;
    render();
  });
  render();
})();
