/* Balance · motor de dinero (prototipo). Implementa las decisiones aprobadas D1, D2, D4 y D8 del inventario
   (docs/requirements/balance/INVENTARIO-BALANCE.md §12). Todo en UNIDADES MÍNIMAS ENTERAS con BigInt: nunca coma flotante.
   Los montos se guardan como cadena decimal con punto («100.50»); se interpretan con los decimales de la moneda del grupo,
   de modo que cambiar la moneda «reexpresa» los gastos sin convertir (D8). Funciona en navegador (window.BalanceMoney) y en Node. */
(function (root) {
  "use strict";

  // Catálogo inicial aprobado (D8 §12.8): 40 códigos ISO 4217 con 0 o 2 decimales (el inventario dice 41; su tabla trae 40: pendiente de confirmar). En producción: datos versionados + prueba contra ISO.
  const C = (code, name, symbol, decimals) => ({ code, name, symbol, decimals });
  const CURRENCIES = [
    C("CRC", "Colón costarricense", "₡", 2), C("USD", "Dólar estadounidense", "$", 2), C("EUR", "Euro", "€", 2), C("MXN", "Peso mexicano", "$", 2),
    C("COP", "Peso colombiano", "$", 2), C("ARS", "Peso argentino", "$", 2), C("CLP", "Peso chileno", "$", 0), C("UYU", "Peso uruguayo", "$U", 2),
    C("DOP", "Peso dominicano", "RD$", 2), C("CUP", "Peso cubano", "$", 2), C("PHP", "Peso filipino", "₱", 2), C("JPY", "Yen japonés", "¥", 0),
    C("CNY", "Yuan renminbi chino", "¥", 2), C("KRW", "Won surcoreano", "₩", 0), C("PEN", "Sol peruano", "S/", 2), C("BRL", "Real brasileño", "R$", 2),
    C("GTQ", "Quetzal guatemalteco", "Q", 2), C("HNL", "Lempira hondureño", "L", 2), C("NIO", "Córdoba nicaragüense", "C$", 2), C("PAB", "Balboa panameño", "B/.", 2),
    C("PYG", "Guaraní paraguayo", "₲", 0), C("BOB", "Boliviano", "Bs.", 2), C("VES", "Bolívar venezolano", "Bs.S", 2), C("CAD", "Dólar canadiense", "$", 2),
    C("GBP", "Libra esterlina", "£", 2), C("CHF", "Franco suizo", "CHF", 2), C("SEK", "Corona sueca", "kr", 2), C("NOK", "Corona noruega", "kr", 2),
    C("DKK", "Corona danesa", "kr", 2), C("PLN", "Esloti polaco", "zł", 2), C("AUD", "Dólar australiano", "$", 2), C("NZD", "Dólar neozelandés", "$", 2),
    C("SGD", "Dólar singapurense", "$", 2), C("HKD", "Dólar de Hong Kong", "$", 2), C("INR", "Rupia india", "₹", 2), C("THB", "Baht tailandés", "฿", 2),
    C("TRY", "Lira turca", "₺", 2), C("ZAR", "Rand sudafricano", "R", 2), C("AED", "Dírham de los Emiratos Árabes Unidos", "AED", 2), C("ILS", "Nuevo shéquel israelí", "₪", 2),
  ];
  const BY_CODE = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]));
  const currency = (code) => { const c = BY_CODE[code]; if (!c) throw new MoneyError("balance.currency.unknown", "Moneda no admitida: " + code); return c; };

  class MoneyError extends Error { constructor(code, message) { super(message); this.code = code; } }

  // numeric(18,2): 16 dígitos enteros como máximo (también en monedas de 0 decimales, donde se guardan enteros).
  const MAX_INTEGER_DIGITS = 16;
  const pow10 = (n) => 10n ** BigInt(n);

  /** Cadena decimal canónica («12.50», «1500») → unidades mínimas (BigInt). Lanza MoneyError si no es válida para la moneda. */
  function toUnits(str, code) {
    const dec = currency(code).decimals;
    const m = /^(\d{1,16})(?:\.(\d+))?$/.exec(String(str));
    if (!m) throw new MoneyError("balance.amount.invalid", "Monto no válido.");
    const frac = m[2] || "";
    if (frac.length > dec) throw new MoneyError("balance.amount.too_many_decimals", dec === 0 ? "Esta moneda no admite decimales." : "Esta moneda admite hasta " + dec + " decimales.");
    return BigInt(m[1]) * pow10(dec) + BigInt((frac + "0".repeat(dec)).slice(0, dec) || "0");
  }
  /** Unidades mínimas (BigInt) → cadena decimal canónica con punto. */
  function fromUnits(units, code) {
    const dec = currency(code).decimals; const neg = units < 0n; const u = neg ? -units : units;
    const s = u.toString().padStart(dec + 1, "0"); const int = s.slice(0, s.length - dec), frac = s.slice(s.length - dec);
    return (neg ? "-" : "") + int + (dec ? "." + frac : "");
  }
  /** Lo que la persona escribe (coma o punto decimal, sin separador de miles) → { ok, value | code, message }. Validación D4 en el cliente. */
  function parseInput(text, code) {
    const dec = currency(code).decimals;
    const t = String(text == null ? "" : text).replace(/[\s\u00a0]/g, "");
    if (t === "") return { ok: false, code: "balance.amount.required", message: "Escriba el monto." };
    if (/[^\d.,]/.test(t) && !/^-/.test(t)) return { ok: false, code: "balance.amount.invalid", message: "Use solo números, con coma o punto para los decimales." };
    if (/^-/.test(t)) return { ok: false, code: "balance.amount.not_positive", message: "El monto debe ser mayor que cero." };
    const seps = (t.match(/[.,]/g) || []).length;
    if (seps > 1) return { ok: false, code: "balance.amount.invalid", message: "Escriba el monto sin separador de miles (por ejemplo 12500,50)." };
    const norm = t.replace(",", ".");
    if (!/^\d+(\.\d*)?$/.test(norm) && !/^\.\d+$/.test(norm)) return { ok: false, code: "balance.amount.invalid", message: "Use solo números, con coma o punto para los decimales." };
    const [i, f = ""] = norm.split(".");
    if (f.length > dec) return { ok: false, code: "balance.amount.too_many_decimals", message: dec === 0 ? "Esta moneda no admite decimales." : "Esta moneda admite hasta " + dec + " decimales." };
    const int = (i || "0").replace(/^0+(?=\d)/, "");
    if (int.length > MAX_INTEGER_DIGITS) return { ok: false, code: "balance.amount.too_large", message: "El monto es demasiado grande." };
    const value = int + (f ? "." + f : "");
    let units; try { units = toUnits(value, code); } catch (e) { return { ok: false, code: e.code, message: e.message }; }
    if (units <= 0n) return { ok: false, code: "balance.amount.not_positive", message: "El monto debe ser mayor que cero." };
    return { ok: true, value: fromUnits(units, code) };
  }

  /** Formato es-CR: miles con espacio fino sin corte, coma decimal, símbolo delante. `sign` fuerza «+»/«−» (los saldos nunca dependen solo del color). */
  function format(units, code, o) {
    o = o || {}; const c = currency(code); const neg = units < 0n; const u = neg ? -units : units;
    const s = u.toString().padStart(c.decimals + 1, "0"); let int = s.slice(0, s.length - c.decimals); const frac = s.slice(s.length - c.decimals);
    int = int.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
    const body = (o.symbol === false ? "" : c.symbol) + int + (c.decimals ? "," + frac : "");
    const sign = neg ? "\u2212" : o.sign && u > 0n ? "+" : "";
    return sign + body + (o.code ? " " + code : "");
  }

  /** D1. participants: ids en ORDEN DE ALTA. expenses: [{payerId, units:BigInt}]. Devuelve total, partes (suman el total EXACTO) y saldos (suman 0 EXACTO). */
  function computeShares(participants, expenses) {
    const n = participants.length; if (!n) return { total: 0n, shares: {}, paid: {}, balances: {}, extraUnits: 0n };
    const paid = Object.fromEntries(participants.map((id) => [id, 0n]));
    let total = 0n; for (const e of expenses) { if (!(e.payerId in paid)) throw new MoneyError("balance.expense.payer_not_member", "El pagador no pertenece al grupo."); paid[e.payerId] += e.units; total += e.units; }
    const N = BigInt(n), base = total / N, r = total % N;
    const shares = {}, balances = {}; let sumB = 0n, sumS = 0n;
    participants.forEach((id, i) => { shares[id] = base + (BigInt(i) < r ? 1n : 0n); balances[id] = paid[id] - shares[id]; sumB += balances[id]; sumS += shares[id]; });
    if (sumS !== total || sumB !== 0n) throw new MoneyError("balance.invariant.broken", "Invariante roto: las partes o los saldos no cuadran.");
    return { total, shares, paid, balances, extraUnits: r };
  }

  /** D2. Liquidación determinista: mayor monto primero y, en empate, orden de alta; se reordena con la MISMA clave tras cada pago.
      balances: { id: BigInt }, order: ids en orden de alta. Devuelve [{from,to,units}]. Falla si queda saldo sin liquidar (G33). */
  function settle(balances, order) {
    const pos = Object.fromEntries(order.map((id, i) => [id, i]));
    const debt = [], cred = [];
    for (const id of order) { const b = balances[id] || 0n; if (b < 0n) debt.push({ id, v: -b }); else if (b > 0n) cred.push({ id, v: b }); }
    const key = (a, b) => (a.v === b.v ? pos[a.id] - pos[b.id] : a.v > b.v ? -1 : 1);
    const out = [];
    while (debt.length && cred.length) {
      debt.sort(key); cred.sort(key);
      const d = debt[0], c = cred[0], m = d.v < c.v ? d.v : c.v;
      out.push({ from: d.id, to: c.id, units: m }); d.v -= m; c.v -= m;
      if (d.v === 0n) debt.shift(); if (c.v === 0n) cred.shift();
    }
    if (debt.length || cred.length) throw new MoneyError("balance.invariant.broken", "Quedó saldo sin liquidar: los saldos no suman cero.");
    return out;
  }

  /** D8 §12.8.5. ¿Se puede reexpresar el grupo en otra moneda sin convertir? Rechaza si algún monto tiene más decimales de los admitidos. */
  function canChangeCurrency(expenseStrings, newCode) {
    const c = currency(newCode); const bad = [];
    expenseStrings.forEach((s, i) => { const f = (String(s).split(".")[1] || ""); if (f.length > c.decimals) bad.push(i); });
    return bad.length ? { ok: false, code: "balance.group.currency_decimals_incompatible", message: "No se puede cambiar a " + newCode + ": hay montos con más decimales de los que esa moneda admite.", indexes: bad } : { ok: true };
  }

  /** Fecha del gasto (D7): fecha de calendario sin hora. «Hoy» se toma de la zona IANA del grupo (D9). */
  function todayInZone(zone, now) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now || new Date());
    const o = Object.fromEntries(parts.map((p) => [p.type, p.value])); return o.year + "-" + o.month + "-" + o.day;
  }

  const api = { CURRENCIES, currency, MoneyError, toUnits, fromUnits, parseInput, format, computeShares, settle, canChangeCurrency, todayInZone, MAX_INTEGER_DIGITS };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.BalanceMoney = api;
})(typeof window !== "undefined" ? window : globalThis);
