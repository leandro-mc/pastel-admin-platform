/* Huella · perfil público (prototipo). Sin red: el resaltador se calcula en el navegador. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ── Huella generativa: identidad sin foto, determinista por snapshot ──
  const prng = (seed) => { let h = 1779033703 ^ seed.length; for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; };
  const fingerprint = (seed, size = 220) => {
    const r = prng(seed), c = size / 2, n = 21, ph = [r() * 6.28, r() * 6.28, r() * 6.28], fr = [2 + Math.floor(r() * 2), 3 + Math.floor(r() * 3), 5 + Math.floor(r() * 3)];
    const dx = (r() - 0.5) * 14, dy = (r() - 0.5) * 18, id = Math.floor(r() * 0xffffff).toString(16).toUpperCase().padStart(6, "0");
    let d = "";
    for (let k = 1; k <= n; k++) {
      const rad = (k * (size / 2 - 5)) / n, sh = (1 - k / n) * 0.9, path = [];
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2, w = Math.sin(fr[0] * a + ph[0] + k * 0.31) * 2.2 + Math.sin(fr[1] * a + ph[1] - k * 0.2) * 1.4 + Math.sin(fr[2] * a + ph[2]) * 0.8;
        const rr = rad + w * (0.4 + k / n), x = c + dx * sh + rr * Math.cos(a) * 0.9, y = c + dy * sh + rr * Math.sin(a) * 1.08;
        path.push((i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1));
      }
      const gap = k < 6 ? ` stroke-dasharray="${(6 + r() * 30).toFixed(0)} ${(2 + r() * 6).toFixed(0)}"` : "";
      d += `<path d="${path.join("")}" fill="none" stroke="currentColor" stroke-width="${(1.1 + r() * 0.5).toFixed(2)}"${gap}/>`;
    }
    return { id, svg: `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Huella generativa ${id}">${d}</svg>` };
  };
  const f = fingerprint("marta-solis|2026-10-23|v3");
  $("#fp").innerHTML = f.svg;
  $("#fpcap").textContent = `Huella n.º ${f.id}. Cambia en cada publicación.`;

  // ── Resaltador: marca dónde hay evidencia; dice sin adornos lo que no la tiene ──
  const fold = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const SYN = { "ci/cd": ["github actions", "pipeline", "integracion continua"], js: ["javascript", "typescript"], e2e: ["end-to-end", "playwright", "cypress"], "pruebas automatizadas": ["playwright", "cypress", "automatizad"], api: ["endpoints", "postman"], carga: ["k6"], qa: ["pruebas", "calidad"] };
  const isW = (ch) => /[a-z0-9]/.test(ch || "");
  const clear = () => { $$("mark.hl").forEach((m) => m.replaceWith(document.createTextNode(m.textContent))); $$("[data-hl]").forEach((n) => n.normalize()); };
  const run = (terms) => {
    clear();
    const res = terms.map((t) => ({ t, n: 0 })), pats = [];
    terms.forEach((t, i) => [t, ...(SYN[fold(t)] || [])].forEach((p) => { p = fold(p).trim(); if (p.length > 1) pats.push({ p, i }); }));
    pats.sort((a, b) => b.p.length - a.p.length);
    $$("[data-hl]").forEach((root) => {
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
      nodes.forEach((node) => {
        const txt = node.nodeValue, fx = fold(txt), rs = [];
        pats.forEach(({ p, i }) => { let from = 0, ix; while ((ix = fx.indexOf(p, from)) > -1) { const end = ix + p.length; if (!isW(fx[ix - 1]) && (p.length > 3 || !isW(fx[end]))) rs.push([ix, end, i]); from = end; } });
        if (!rs.length) return;
        rs.sort((a, b) => a[0] - b[0] || b[1] - a[1]); const keep = []; let end = -1; rs.forEach((x) => { if (x[0] >= end) { keep.push(x); end = x[1]; } });
        const frag = document.createDocumentFragment(); let pos = 0;
        keep.forEach(([s, e, i]) => { if (s > pos) frag.append(txt.slice(pos, s)); const m = document.createElement("mark"); m.className = "hl"; m.dataset.t = i; m.textContent = txt.slice(s, e); frag.append(m); res[i].n++; pos = e; });
        frag.append(txt.slice(pos)); node.replaceWith(frag);
      });
    });
    const ok = res.filter((x) => x.n).length;
    $("#sum").textContent = terms.length ? `${ok} de ${terms.length} términos con evidencia${ok < terms.length ? "; los demás no figuran en este perfil." : "."}` : "";
    $("#hlres").innerHTML = res.map((x, i) => `<li class="${x.n ? "ok" : "no"}"><button type="button" data-i="${i}" ${x.n ? "" : "disabled"}>${x.n ? "✓" : "✕"} ${x.t.replace(/[<>&]/g, "")} · ${x.n ? x.n + (x.n > 1 ? " lugares" : " lugar") : "sin evidencia"}</button></li>`).join("");
  };
  const parse = (v) => v.split(/[,\n;]/).map((s) => s.trim()).filter(Boolean).slice(0, 12);
  $("#kw").addEventListener("input", (e) => run(parse(e.target.value)));
  $("#ex").addEventListener("click", () => { $("#kw").value = "Playwright, CI/CD, API, k6, Kubernetes"; run(parse($("#kw").value)); });
  $("#cl").addEventListener("click", () => { $("#kw").value = ""; run([]); });
  $("#hlres").addEventListener("click", (e) => { const b = e.target.closest("button[data-i]"); if (!b) return; const m = $(`mark.hl[data-t="${b.dataset.i}"]`); if (m) m.scrollIntoView({ block: "center" }); });
  $$("[data-s]").forEach((b) => b.addEventListener("click", () => { $("#kw").value = b.dataset.s; run([b.dataset.s]); $("#trayectoria").scrollIntoView(); }));

  // ── Contacto, tema, impresión, navegación por sección ──
  $("#reveal").addEventListener("click", (e) => { const m = $("#mail"); m.hidden = false; e.currentTarget.setAttribute("aria-expanded", "true"); e.currentTarget.hidden = true; });
  $("#prn").addEventListener("click", () => window.print());
  const THEMES = [["auto", "auto"], ["claro", "light"], ["oscuro", "dark"]];
  $("#theme").addEventListener("click", () => { const cur = document.documentElement.dataset.theme || "auto", n = (THEMES.findIndex((x) => x[1] === cur) + 1) % 3; DevKit.applyTheme(THEMES[n][1]); $("#theme").textContent = "Tema: " + THEMES[n][0]; $$("#devbar [data-t]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.t === THEMES[n][1]))); });
  if ("IntersectionObserver" in window) {
    const links = $$(".rail nav a"), io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) links.forEach((a) => a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + en.target.id))); }), { rootMargin: "-30% 0px -60% 0px" });
    $$("main section").forEach((s) => io.observe(s));
  }

  // ── Vistas por rol (solo desarrollo) ──
  const ROLES = [
    { id: "visitante", label: "Reclutadora (enlace vigente)", desc: "Ve la página pública: ficha, resaltador, trayectoria. Nunca ve el banco ni los filtros privados." },
    { id: "owner", label: "Propietaria (vista previa)", desc: "Ve la página como publicada, controla el enlace y cuántas veces se abrió (sin IP). El banco y el Estudio están en otra pantalla." },
    { id: "revocado", label: "Enlace revocado o vencido", desc: "Lo que ve quien abre un enlace que ya no existe: nada del perfil." },
    { id: "ats", label: "Sistema de lectura (ATS)", desc: "Texto plano que extrae una máquina, en orden de lectura." } ];
  const atsText = () => $$("#main h1, #main h2, #main h3, #main p:not(.actions), #main li, #main dt, #main dd").filter((n) => !n.closest("#resaltador") && !n.closest("footer")).map((n) => n.textContent.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
  const apply = (id) => {
    $("#wrap").hidden = id === "revocado" || id === "ats"; $("#revoked").hidden = id !== "revocado"; $("#atsview").hidden = id !== "ats"; $("#ownerbar").hidden = id !== "owner";
    if (id === "ats") { $("#atspre").textContent = atsText(); }
    document.title = id === "revocado" ? "Enlace no disponible" : "Marta Solís Araya · QA Engineer y desarrolladora fullstack";
  };
  $("#revoke").addEventListener("click", () => { DevKit.setRole("revocado"); });
  $("#copy").addEventListener("click", (e) => { e.currentTarget.textContent = "Enlace copiado"; });
  $("#showmail").addEventListener("change", (e) => { $("#contacto").hidden = !e.target.checked; $$('.rail nav a[href="#contacto"]').forEach((x) => (x.hidden = !e.target.checked)); $$('.actions a[href="#contacto"]').forEach((x) => (x.hidden = !e.target.checked)); });
  $("#showavail").addEventListener("change", (e) => { const dd = $$(".fact dt").find((x) => x.textContent === "Disponible"); if (dd) { dd.hidden = !e.target.checked; dd.nextElementSibling.hidden = !e.target.checked; } });
  DevKit.init({ app: "huella-perfil", roles: ROLES, role: "visitante", onRole: apply });
})();
