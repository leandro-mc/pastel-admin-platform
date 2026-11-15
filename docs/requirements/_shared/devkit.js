/* DevKit · barra SOLO PARA DESARROLLO (no es parte del producto).
   - Selector de rol: cambia lo que ve y puede hacer cada persona. - Tema: Auto / Claro / Oscuro (además de la preferencia del sistema).
   - Parámetros de URL (para manuales y capturas): ?role=acopio&theme=dark&view=recepcion&dev=0 (dev=0 oculta la barra).
   Uso: DevKit.init({ app, roles:[{id,label,desc}], role, onRole(id) }) */
(function () {
  const mem = {};
  const st = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return mem[k] ?? null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } } };
  const q = new URLSearchParams(location.search);
  const DevKit = {
    role: null, param: (k) => q.get(k),
    applyTheme(t) { const r = document.documentElement; if (t === "light" || t === "dark") r.dataset.theme = t; else delete r.dataset.theme; st.set("devkit.theme", t || "auto"); },
    init(o) {
      const key = "devkit." + o.app + ".role", ids = o.roles.map((r) => r.id);
      const pick = (v) => (ids.includes(v) ? v : null);
      this.role = pick(q.get("role")) || pick(st.get(key)) || o.role || ids[0];
      this.applyTheme(q.get("theme") || st.get("devkit.theme") || "auto");
      const set = (id) => { this.role = id; st.set(key, id); o.onRole && o.onRole(id); const r = o.roles.find((x) => x.id === id); const d = document.getElementById("dk-desc"); if (d) d.textContent = r.desc || ""; document.documentElement.dataset.role = id; };
      if (q.get("dev") !== "0") {
        const bar = document.createElement("div"); bar.id = "devbar"; bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "Barra de desarrollo");
        const cur = st.get("devkit.theme") || "auto";
        bar.innerHTML = `<span class="dk-tag">Solo desarrollo</span><label>Ver como <select id="dk-role" aria-label="Rol">${o.roles.map((r) => `<option value="${r.id}">${r.label}</option>`).join("")}</select></label>
          <span id="dk-desc" class="dk-desc"></span><span class="dk-grp" role="group" aria-label="Tema">${[["auto", "Auto"], ["light", "Claro"], ["dark", "Oscuro"]].map(([v, t]) => `<button type="button" data-t="${v}" aria-pressed="${cur === v}">${t}</button>`).join("")}</span>`;
        document.body.prepend(bar);
        const sel = bar.querySelector("#dk-role"); sel.value = this.role;
        sel.addEventListener("change", () => set(sel.value));
        bar.addEventListener("click", (e) => { const b = e.target.closest("[data-t]"); if (!b) return; this.applyTheme(b.dataset.t); bar.querySelectorAll("[data-t]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); });
      }
      this.setRole = (id) => { const sl = document.getElementById("dk-role"); if (sl) sl.value = id; set(id); };
      set(this.role);
    },
  };
  window.DevKit = DevKit;
})();
