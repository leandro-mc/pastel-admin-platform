/* Huella · motor del Estudio (extraído de la v1 sin cambios de lógica; límites de cv-spec/limits.json).
   Depende de dos globales que define app.js: S (estado de la pantalla) y BANK (banco derivado de lo escrito). */
  const fold = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const ln = (n, c) => Math.max(1, Math.ceil(n / c));
  // ── Límites verificados (docs/requirements/huella/cv-spec/limits.json) ──
  const BASE = {
    junior: { label: "Junior (0–3 años)", pages: 1, sum: 270, groups: 4, gchars: 90, skills: 22, entries: 3, lines: [5, 3, 0], bmax: 170, proj: 2, pl: [2, 2] },
    mid: { label: "Mid-level (3–8 años)", pages: 2, sum: 270, groups: 5, gchars: 180, skills: 30, entries: 5, lines: [9, 8, 6, 4, 2], bmax: 175, proj: 2, pl: [3, 3] },
    senior: { label: "Senior (8+ años)", pages: 2, sum: 380, groups: 6, gchars: 180, skills: 38, entries: 6, lines: [11, 9, 7, 5, 3, 0], bmax: 180, proj: 1, pl: [3] },
  };
  const PAPER = { letter: { junior: [50, 93, 91], mid: [97, 93, 91], senior: [101, 98, 95] }, a4: { junior: [53, 90, 88], mid: [103, 90, 88], senior: [109, 95, 92] } };
  const BANNED = ["profesional apasionado", "orientado a resultados", "proactivo", "responsable de", "results-driven", "team player", "dinámico"];

  const KNOWN = [["Playwright", ["playwright"]], ["Cypress", ["cypress"]], ["E2E", ["e2e", "end-to-end"]], ["CI/CD", ["ci/cd", "github actions", "pipeline"]], ["GitHub Actions", ["github actions"]], ["API", ["api", "endpoints"]], ["k6", ["k6"]], ["JMeter", ["jmeter"]], ["Docker", ["docker"]], ["Kubernetes", ["kubernetes", "k8s"]], ["TypeScript", ["typescript"]], ["C#", ["c#"]], ["React", ["react"]], ["Python", ["python"]], ["SQL", ["sql", "postgres"]], ["Mentoría", ["mentoria", "mentor"]], ["Estrategia de pruebas", ["estrategia de pruebas", "estrategia de regresion"]], ["Inglés", ["ingles", "english"]]];
  const ADJ = { Kubernetes: "Docker", JMeter: "k6", Cypress: "Playwright" };
  const PROV = { gemini: { n: "Gemini", m: { fast: "Flash-Lite (gratuito)", bal: "Flash (gratuito)", best: null }, rpm: 10, free: true }, openai: { n: "OpenAI", m: { fast: "mini (vigente)", bal: "estándar (vigente)", best: "superior (vigente)" }, rpm: 60 }, anthropic: { n: "Anthropic (Claude)", m: { fast: "claude-haiku-5-5", bal: "claude-sonnet-5-5", best: "claude-opus-5-5" }, rpm: 50 }, manual: { n: "Modo manual (copiar y pegar)", m: { fast: "cualquier chat", bal: "cualquier chat", best: "cualquier chat" }, rpm: 0 } };
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

  const atsText = (cv) => [BANK.name, BANK.headline, [...BANK.contact_l1, ...BANK.contact_l2].join(" · "), "", "Perfil profesional", cv.summary, "", "Habilidades técnicas", ...cv.skills.map((g) => g.line), "", "Experiencia laboral",
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
      ["Una columna, sin tablas, iconos ni imágenes", true, "garantizado por la plantilla"], ["Encabezados estándar y contacto en el cuerpo", /Experiencia laboral/.test(txt) && txt.includes(BANK.contact_l1[1]), ""],
      ["Fecha en la misma línea que cargo y empresa", cv.exps.every((e) => txt.split("\n").some((l) => l.startsWith(e.role) && l.includes(e.dates))), ""], ["Sin ligaduras Unicode (ﬁ ﬂ ﬀ)", !/[\ufb00-\ufb06]/.test(txt), ""],
      [`Dentro del cupo de páginas (${tot} de ${L.cap} LU)`, tot <= L.cap, ""], [`Ninguna viñeta supera el tope duro (${L.bmax})`, bl.every((b) => b.text.length <= L.bmax), ""],
      ["Sin frases prohibidas", !BANNED.some((b) => fold(txt).includes(fold(b))), ""], ["Cada viñeta cita su logro de origen (sourceIds)", bl.every((b) => b.id), ""],
      ["Todas las cifras existen en el banco", bl.every((b) => nums(b.text).every((n) => srcNums(b.id).has(n))), ""], ["Ninguna habilidad inventada (todas están en el banco)", cv.skills.every((g) => g.line.split(": ")[1].split(", ").every((s) => BANK.skills.some((k) => k.n === s))), ""],
    ];
  };

