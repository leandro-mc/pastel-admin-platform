/* Cosecha · reparto proporcional a la capacidad (MVP §5) + balance de equidad (v2 §8.2).
   Función pura y determinista: mismo resultado para la misma entrada, sin importar el orden. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Alloc = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

  /** @param {number} T kg objetivo
   *  @param {{id:string, weight:number, cap?:number|null, include?:boolean, deficit?:number}[]} ps
   *  @param {{step?:number, equityK?:number, equityClamp?:number}} opt */
  function allocate(T, ps, opt = {}) {
    const step = opt.step || 1, k = opt.equityK || 0, lim = opt.equityClamp ?? 0.3;
    const units = Math.round(T / step);
    const act = ps
      .filter((p) => p.include !== false && p.weight > 0)
      .map((p) => ({
        id: p.id, base: p.weight,
        w: p.weight * (1 + k * clamp(p.deficit || 0, -lim, lim)),
        cap: p.cap == null || p.cap === "" ? Infinity : Math.max(0, Math.floor(p.cap / step)),
        adj: k ? clamp(p.deficit || 0, -lim, lim) : 0,
      }))
      .sort((a, b) => (a.id < b.id ? -1 : 1)); // orden estable: independiente del orden de entrada

    const out = new Map(), capped = new Set();
    let free = act.slice(), remaining = units;
    for (;;) { // fijar en el tope a quienes lo superan y redistribuir el sobrante
      const W = free.reduce((s, p) => s + p.w, 0);
      const over = free.filter((p) => W > 0 && (remaining * p.w) / W > p.cap);
      if (!over.length) break;
      for (const p of over) { out.set(p.id, p.cap); capped.add(p.id); remaining -= p.cap; }
      free = free.filter((p) => !capped.has(p.id));
    }
    if (free.length && remaining > 0) { // mayor resto para que la suma sea exacta
      const W = free.reduce((s, p) => s + p.w, 0);
      const parts = free.map((p) => { const x = (remaining * p.w) / W; return { p, f: Math.floor(x), r: x - Math.floor(x) }; });
      let left = remaining - parts.reduce((s, q) => s + q.f, 0);
      parts.slice().sort((a, b) => b.r - a.r || b.p.w - a.p.w || (a.p.id < b.p.id ? -1 : 1))
        .forEach((q) => { if (left > 0 && q.f + 1 <= q.p.cap) { q.f += 1; left -= 1; } });
      parts.forEach((q) => out.set(q.p.id, q.f));
      remaining = left;
    } else if (!free.length) { /* todos topados: el resto es faltante */ }
    const assigned = [...out.values()].reduce((s, v) => s + v, 0);
    const rows = ps.map((p) => {
      const a = act.find((x) => x.id === p.id), kg = (out.get(p.id) || 0) * step;
      let why = "No participa en este envío.";
      if (a) {
        why = `Capacidad ${a.base} kg.`;
        if (capped.has(p.id)) why += ` Tope de ${kg} kg para este envío.`;
        if (a.adj) why += ` ${a.adj > 0 ? "+" : ""}${Math.round(a.adj * 100 * k)} % de ajuste de equidad (${a.adj > 0 ? "quedó corto" : "recibió de más"} en envíos anteriores).`;
      }
      return { id: p.id, kg, why };
    });
    return { rows, assignedKg: assigned * step, shortfallKg: Math.max(0, units - assigned) * step };
  }
  return { allocate };
});
