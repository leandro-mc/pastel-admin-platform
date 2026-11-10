/* Balance · pruebas del motor de dinero. Ejecutar: node docs/requirements/balance/prototype/money.test.js
   Los resultados esperados vienen de INVENTARIO-BALANCE.md §9.3 (calculados con las reglas aprobadas D1 y D2), NO del código.
   Además verifica propiedades sobre miles de escenarios aleatorios (partes y saldos exactos, independencia del orden, tope de transferencias). */
const assert = require("node:assert/strict");
const M = require("./money.js");

let ok = 0, bad = 0;
const t = (name, fn) => { try { fn(); ok++; console.log("OK   " + name); } catch (e) { bad++; console.log("FALLA " + name + "  -> " + e.message); } };

const NAMES = ["Ana", "Beto", "Carla", "Diego", "Elena", "Fabio", "Gina", "Hugo", "Irene", "Jorge", "Karla", "Luis", "Marta", "Nora", "Oscar", "Paula", "Raul", "Sara", "Tomas", "Ursula"];
/** Ejecuta un escenario: n participantes en orden de alta, gastos [[índicePagador, "monto"]], moneda. Devuelve partes, saldos y liquidación en texto. */
function run(n, spends, code = "CRC") {
  const ids = NAMES.slice(0, n);
  const r = M.computeShares(ids, spends.map(([i, s]) => ({ payerId: ids[i], units: M.toUnits(s, code) })));
  const f = (u) => M.fromUnits(u, code);
  return {
    total: f(r.total), shares: ids.map((id) => id + " " + f(r.shares[id])), balances: ids.map((id) => id + " " + (r.balances[id] > 0n ? "+" : "") + f(r.balances[id])),
    transfers: M.settle(r.balances, ids).map((x) => x.from + "→" + x.to + " " + f(x.units)), raw: r,
  };
}

// ── Casos dorados de Balance (§9.3) ──
t("G01 · 2 personas, un gasto: 100 → +50 / −50, Beto→Ana 50.00", () => { const r = run(2, [[0, "100.00"]]); assert.deepEqual(r.balances, ["Ana +50.00", "Beto -50.00"]); assert.deepEqual(r.transfers, ["Beto→Ana 50.00"]); });
t("G02 · ₡100,00 entre 3 (caso de la ficha): partes 33.34/33.33/33.33 suman 100.00; saldos suman 0", () => { const r = run(3, [[0, "100.00"]]); assert.deepEqual(r.shares, ["Ana 33.34", "Beto 33.33", "Carla 33.33"]); assert.deepEqual(r.balances, ["Ana +66.66", "Beto -33.33", "Carla -33.33"]); assert.deepEqual(r.transfers, ["Beto→Ana 33.33", "Carla→Ana 33.33"]); });
t("G03 · ₡200,00 entre 3: 66.67/66.67/66.66", () => { const r = run(3, [[0, "200.00"]]); assert.deepEqual(r.shares, ["Ana 66.67", "Beto 66.67", "Carla 66.66"]); assert.deepEqual(r.balances, ["Ana +133.33", "Beto -66.67", "Carla -66.66"]); assert.deepEqual(r.transfers, ["Beto→Ana 66.67", "Carla→Ana 66.66"]); });
t("G04 · dos pagan 100,00 y 100,00 entre 3: Carla→Ana 33.33 y Carla→Beto 33.33", () => { const r = run(3, [[0, "100.00"], [1, "100.00"]]); assert.deepEqual(r.balances, ["Ana +33.33", "Beto +33.33", "Carla -66.66"]); assert.deepEqual(r.transfers, ["Carla→Ana 33.33", "Carla→Beto 33.33"]); });
t("G05 · 4 personas, 3 deudores iguales: orden de alta (Beto, Carla, Diego → Ana)", () => { const r = run(4, [[0, "400.00"]]); assert.deepEqual(r.transfers, ["Beto→Ana 100.00", "Carla→Ana 100.00", "Diego→Ana 100.00"]); });
t("G06 · todos pagan lo mismo: sin saldos ni liquidación", () => { const r = run(4, [[0, "50.00"], [1, "50.00"], [2, "50.00"], [3, "50.00"]]); assert.ok(r.balances.every((b) => /0\.00$/.test(b))); assert.deepEqual(r.transfers, []); });
t("G07 · grupo de 1 persona: saldo 0 y sin liquidación", () => { const r = run(1, [[0, "75.00"]]); assert.deepEqual(r.balances, ["Ana 0.00"]); assert.deepEqual(r.transfers, []); });
t("G08 · grupo sin gastos: todo en cero", () => { const r = run(3, []); assert.equal(r.total, "0.00"); assert.deepEqual(r.transfers, []); });
t("G09 · una persona nunca pagó (Ana 90,00 y Beto 30,00; Carla 0): parte 40.00; Carla→Ana 40.00 y Beto→Ana 10.00", () => { const r = run(3, [[0, "90.00"], [1, "30.00"]]); assert.deepEqual(r.shares, ["Ana 40.00", "Beto 40.00", "Carla 40.00"]); assert.deepEqual(r.balances, ["Ana +50.00", "Beto -10.00", "Carla -40.00"]); assert.deepEqual(r.transfers, ["Carla→Ana 40.00", "Beto→Ana 10.00"]); });
t("G10 · ₡0,05 entre 2: Ana 0.03, Beto 0.02 (el medio centavo se asigna, no se pierde)", () => { const r = run(2, [[0, "0.05"]]); assert.deepEqual(r.shares, ["Ana 0.03", "Beto 0.02"]); assert.deepEqual(r.balances, ["Ana +0.02", "Beto -0.02"]); assert.deepEqual(r.transfers, ["Beto→Ana 0.02"]); });
t("G11 · ₡0,01 entre 3: Ana 0.01, saldo de Ana 0.00 y liquidación vacía (sin residuo sin liquidar)", () => { const r = run(3, [[0, "0.01"]]); assert.deepEqual(r.shares, ["Ana 0.01", "Beto 0.00", "Carla 0.00"]); assert.deepEqual(r.balances, ["Ana 0.00", "Beto 0.00", "Carla 0.00"]); assert.deepEqual(r.transfers, []); });
t("G12 · ₡1000,00 entre 7: 142.86 ×5 y 142.85 ×2 (las últimas); liquidación completa", () => { const r = run(7, [[0, "1000.00"]]); assert.deepEqual(r.shares, ["Ana 142.86", "Beto 142.86", "Carla 142.86", "Diego 142.86", "Elena 142.86", "Fabio 142.85", "Gina 142.85"]); assert.equal(r.balances[0], "Ana +857.14"); assert.deepEqual(r.transfers, ["Beto→Ana 142.86", "Carla→Ana 142.86", "Diego→Ana 142.86", "Elena→Ana 142.86", "Fabio→Ana 142.85", "Gina→Ana 142.85"]); });
t("G13 · monto muy grande: 9 999 999 999,99 entre 2 (sin pérdida)", () => { const r = run(2, [[0, "9999999999.99"]]); assert.deepEqual(r.shares, ["Ana 5000000000.00", "Beto 4999999999.99"]); assert.deepEqual(r.balances, ["Ana +4999999999.99", "Beto -4999999999.99"]); });
t("G14 · editar el monto: de 100.00 a 150.00 recalcula saldos", () => { assert.deepEqual(run(3, [[0, "100.00"]]).balances, ["Ana +66.66", "Beto -33.33", "Carla -33.33"]); assert.deepEqual(run(3, [[0, "150.00"]]).balances, ["Ana +100.00", "Beto -50.00", "Carla -50.00"]); });
t("G15 · editar quién pagó: el saldo pasa de Ana a Beto", () => { assert.deepEqual(run(3, [[1, "90.00"]]).transfers, ["Ana→Beto 30.00", "Carla→Beto 30.00"]); });
t("G16/G17 · borrar el gasto o todos: vuelve a cero", () => { assert.deepEqual(run(3, []).transfers, []); });
t("G18 · reparto retroactivo: agregar a Carla después del gasto de 100.00 le asigna su parte", () => { assert.deepEqual(run(2, [[0, "100.00"]]).balances, ["Ana +50.00", "Beto -50.00"]); assert.deepEqual(run(3, [[0, "100.00"]]).balances, ["Ana +66.66", "Beto -33.33", "Carla -33.33"]); });
t("G19 · quitar a un integrante sin gastos sube la parte de los demás (3 → 2 personas con 100.00)", () => { assert.deepEqual(run(2, [[0, "100.00"]]).shares, ["Ana 50.00", "Beto 50.00"]); });
t("G23 · cinco pagan montos distintos: Elena→Ana 91.15; Diego→Ana 67.69; Diego→Beto 23.45; Carla→Beto 10.90", () => { const r = run(5, [[0, "250.00"], [1, "125.50"], [2, "80.25"], [3, "0.01"]]); assert.equal(r.total, "455.76"); assert.deepEqual(r.shares, ["Ana 91.16", "Beto 91.15", "Carla 91.15", "Diego 91.15", "Elena 91.15"]); assert.deepEqual(r.balances, ["Ana +158.84", "Beto +34.35", "Carla -10.90", "Diego -91.14", "Elena -91.15"]); assert.deepEqual(r.transfers, ["Elena→Ana 91.15", "Diego→Ana 67.69", "Diego→Beto 23.45", "Carla→Beto 10.90"]); });
t("G24 · 13 integrantes y un pagador: 12 transferencias de 10.00 en orden de alta", () => { const r = run(13, [[0, "130.00"]]); assert.equal(r.transfers.length, 12); assert.deepEqual(r.transfers, NAMES.slice(1, 13).map((n) => n + "→Ana 10.00")); });
t("G25 · el mismo caso con identificadores altos da el mismo orden (el orden sale del alta, no del ID)", () => { const ids = Array.from({ length: 13 }, (_, i) => 101 + i); const r = M.computeShares(ids, [{ payerId: 101, units: 13000n }]); assert.deepEqual(M.settle(r.balances, ids).map((x) => x.from), ids.slice(1)); });
t("G26 · 20 integrantes: 15 pagan 3432.27 y 5 pagan 3432.26; liquidación completa de 19 pagos", () => {
  const r = run(20, [[0, "15234.50"], [4, "8900.00"], [6, "1200.75"], [11, "43000.10"], [19, "310.00"]]);
  assert.equal(r.total, "68645.35"); assert.equal(r.shares.filter((s) => / 3432\.27$/.test(s)).length, 15); assert.equal(r.shares.filter((s) => / 3432\.26$/.test(s)).length, 5);
  assert.deepEqual(r.transfers, ["Beto→Luis 3432.27", "Carla→Luis 3432.27", "Diego→Luis 3432.27", "Fabio→Luis 3432.27", "Hugo→Luis 3432.27", "Irene→Luis 3432.27", "Jorge→Luis 3432.27", "Karla→Luis 3432.27", "Marta→Luis 3432.27", "Nora→Ana 3432.27", "Oscar→Luis 3432.27", "Paula→Ana 3432.26", "Raul→Elena 3432.26", "Sara→Luis 3432.26", "Tomas→Ana 3432.26", "Ursula→Elena 2035.47", "Gina→Luis 1812.87", "Ursula→Ana 1086.79", "Gina→Ana 418.65"]);
});
t("G27 · muchos gastos pequeños (3 personas, 1.00 en total): 0.34/0.33/0.33", () => { const r = run(3, Array.from({ length: 10 }, () => [0, "0.10"])); assert.deepEqual(r.shares, ["Ana 0.34", "Beto 0.33", "Carla 0.33"]); assert.deepEqual(r.transfers, ["Beto→Ana 0.33", "Carla→Ana 0.33"]); });
t("G28 · 10.005 no es un monto válido (3 decimales): error de validación, nunca redondeo silencioso", () => { assert.throws(() => M.toUnits("10.005", "CRC"), (e) => e.code === "balance.amount.too_many_decimals"); const p = M.parseInput("10,005", "CRC"); assert.equal(p.ok, false); assert.equal(p.code, "balance.amount.too_many_decimals"); });
t("G29 · tres gastos de 33.34 (total 100.02): partes exactas 33.34", () => { const r = run(3, [[0, "33.34"], [1, "33.34"], [2, "33.34"]]); assert.deepEqual(r.shares, ["Ana 33.34", "Beto 33.34", "Carla 33.34"]); assert.deepEqual(r.transfers, []); });
t("G30 · calculador directo (3 deudores, 3 acreedores): suma exacta y a lo sumo 5 transferencias", () => { const ids = ["a", "b", "c", "d", "e", "f"]; const b = { a: -5000n, b: -3000n, c: -2000n, d: 4000n, e: 3500n, f: 2500n }; const tr = M.settle(b, ids); assert.ok(tr.length <= 5); const net = Object.fromEntries(ids.map((i) => [i, 0n])); tr.forEach((x) => { net[x.from] += x.units; net[x.to] -= x.units; }); ids.forEach((i) => assert.equal(net[i], -b[i])); });
t("G31 · calculador directo: pares exactos (−50, −30, +50, +30) → 2 transferencias", () => { const ids = [1, 2, 3, 4]; const tr = M.settle({ 1: -5000n, 2: -3000n, 3: 5000n, 4: 3000n }, ids); assert.deepEqual(tr.map((x) => x.from + "→" + x.to + " " + x.units), ["1→3 5000", "2→4 3000"]); });
t("G32 · el algoritmo no es mínimo (4 transferencias en lugar de 3) pero es determinista: id3→id5 4; id1→id4 3; id2→id4 1; id2→id5 1", () => { const ids = [1, 2, 3, 4, 5]; const tr = M.settle({ 1: -300n, 2: -200n, 3: -400n, 4: 400n, 5: 500n }, ids); assert.deepEqual(tr.map((x) => "id" + x.from + "→id" + x.to + " " + x.units), ["id3→id5 400", "id1→id4 300", "id2→id4 100", "id2→id5 100"]); });
t("G33 · saldos que no suman cero NO se ignoran: falla con error explícito (invariante)", () => { assert.throws(() => M.settle({ 1: -300n, 2: 299n }, [1, 2]), (e) => e.code === "balance.invariant.broken"); });
// ── Monedas (D8) ──
t("G35 · yenes: ¥100 entre 3 → 34/33/33; Beto→Ana 33; Carla→Ana 33", () => { const r = run(3, [[0, "100"]], "JPY"); assert.deepEqual(r.shares, ["Ana 34", "Beto 33", "Carla 33"]); assert.deepEqual(r.balances, ["Ana +66", "Beto -33", "Carla -33"]); assert.deepEqual(r.transfers, ["Beto→Ana 33", "Carla→Ana 33"]); });
t("G36 · yenes: ¥1000 entre 7 → 143 ×6 y 142; liquidación completa", () => { const r = run(7, [[0, "1000"]], "JPY"); assert.deepEqual(r.transfers, ["Beto→Ana 143", "Carla→Ana 143", "Diego→Ana 143", "Elena→Ana 143", "Fabio→Ana 143", "Gina→Ana 142"]); });
t("G37 · yenes: Ana paga 1001 y Beto 2 entre 4 → Carla→Ana 251; Diego→Ana 250; Beto→Ana 249", () => { const r = run(4, [[0, "1001"], [1, "2"]], "JPY"); assert.deepEqual(r.shares, ["Ana 251", "Beto 251", "Carla 251", "Diego 250"]); assert.deepEqual(r.balances, ["Ana +750", "Beto -249", "Carla -251", "Diego -250"]); assert.deepEqual(r.transfers, ["Carla→Ana 251", "Diego→Ana 250", "Beto→Ana 249"]); });
t("G38 · 100,50 en un grupo en yenes se rechaza (más decimales de los que admite la moneda)", () => { const p = M.parseInput("100,50", "JPY"); assert.equal(p.ok, false); assert.equal(p.code, "balance.amount.too_many_decimals"); assert.match(p.message, /no admite decimales/); });
t("G39 · cambiar EUR → USD sin convertir: partes, saldos y liquidación idénticos; el gasto pasa a ser 100.00 USD", () => { const a = run(3, [[0, "100.00"]], "EUR"), b = run(3, [[0, "100.00"]], "USD"); assert.deepEqual(a.shares, b.shares); assert.deepEqual(a.transfers, b.transfers); assert.deepEqual(M.canChangeCurrency(["100.00"], "USD"), { ok: true }); });
t("G40 · cambiar USD → JPY (100.00 → ¥100): la unidad mínima cambia, por eso cambian partes y saldos", () => { assert.deepEqual(M.canChangeCurrency(["100.00"], "JPY"), { ok: false, code: "balance.group.currency_decimals_incompatible", message: M.canChangeCurrency(["100.00"], "JPY").message, indexes: [0] }); const r = run(3, [[0, "100"]], "JPY"); assert.deepEqual(r.balances, ["Ana +66", "Beto -33", "Carla -33"]); });
t("G41 · 10.50 → yenes se rechaza con código balance.group.currency_decimals_incompatible y no cambia nada", () => { const r = M.canChangeCurrency(["10.50"], "JPY"); assert.equal(r.ok, false); assert.equal(r.code, "balance.group.currency_decimals_incompatible"); assert.deepEqual(r.indexes, [0]); });
// ── Entrada de dinero (D4) ──
t("D4 · se aceptan 12.50, 12,50, 0.01 y el máximo; se rechazan 12.505, 0, −5, vacío y texto", () => {
  for (const [s, v] of [["12.50", "12.50"], ["12,50", "12.50"], ["0.01", "0.01"], ["0,01", "0.01"], ["9999999999999999.99", "9999999999999999.99"], ["1500", "1500.00"]]) assert.deepEqual(M.parseInput(s, "CRC"), { ok: true, value: v }, s);
  for (const s of ["12.505", "0", "0,00", "-5", "", "  ", "abc", "12 5x", "1.234,50", "10000000000000000"]) assert.equal(M.parseInput(s, "CRC").ok, false, "debía rechazar «" + s + "»");
  assert.deepEqual(M.parseInput("1500", "JPY"), { ok: true, value: "1500" });
});
t("Formato es-CR: miles con espacio fino, coma decimal, símbolo y signo explícito (no solo color)", () => { assert.equal(M.format(123456n, "CRC"), "₡1\u202f234,56"); assert.equal(M.format(-3333n, "CRC", { sign: true }), "\u2212₡33,33"); assert.equal(M.format(6666n, "USD", { sign: true, code: true }), "+$66,66 USD"); assert.equal(M.format(1500n, "JPY"), "¥1\u202f500"); });
// HALLAZGO: INVENTARIO-BALANCE.md §12.8 dice «los 41 códigos de la lista», pero su tabla trae 40 (se contó por programa). Se implementan los 40 de la tabla; falta confirmar con el propietario si falta uno.
t("Catálogo: los 40 códigos de la tabla del inventario, únicos; decimales 0 solo en CLP, JPY, KRW y PYG; todos con símbolo y nombre", () => { assert.equal(M.CURRENCIES.length, 40); assert.equal(new Set(M.CURRENCIES.map((c) => c.code)).size, 40); assert.deepEqual(M.CURRENCIES.filter((c) => c.decimals === 0).map((c) => c.code).sort(), ["CLP", "JPY", "KRW", "PYG"]); assert.ok(M.CURRENCIES.every((c) => c.symbol && c.name)); });
t("Zona horaria (D9): 23:30 del 18 en Costa Rica es 05:30 UTC del 19; «hoy» del grupo sigue siendo el 18", () => { const now = new Date("2026-10-19T05:30:00Z"); assert.equal(M.todayInZone("America/Costa_Rica", now), "2026-10-18"); assert.equal(M.todayInZone("UTC", now), "2026-10-19"); });

// ── Propiedades sobre escenarios aleatorios (PRNG con semilla fija: reproducible) ──
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function scenario(R, code) { const n = 1 + Math.floor(R() * 25); const ids = Array.from({ length: n }, (_, i) => "p" + i); const k = Math.floor(R() * 12); const dec = M.currency(code).decimals; const ex = Array.from({ length: k }, () => ({ payerId: ids[Math.floor(R() * n)], units: BigInt(1 + Math.floor(R() * 5e7)) / (dec ? 1n : 100n) || 1n })); return { ids, ex }; }
for (const code of ["CRC", "JPY"]) t("Propiedades (" + code + ", 3 000 escenarios): Σpartes = total, Σsaldos = 0, partes difieren ≤ 1 unidad, ≤ deudores+acreedores−1 pagos, independiente del orden de entrada, todos quedan en cero", () => {
  const R = rng(code === "CRC" ? 42 : 7);
  for (let k = 0; k < 3000; k++) {
    const { ids, ex } = scenario(R, code); const r = M.computeShares(ids, ex);
    assert.equal(ids.reduce((a, id) => a + r.shares[id], 0n), r.total); assert.equal(ids.reduce((a, id) => a + r.balances[id], 0n), 0n);
    const sh = ids.map((id) => r.shares[id]); const mx = sh.reduce((a, b) => (a > b ? a : b)), mn = sh.reduce((a, b) => (a < b ? a : b)); assert.ok(mx - mn <= 1n);
    const tr = M.settle(r.balances, ids); const nd = ids.filter((i) => r.balances[i] < 0n).length, nc = ids.filter((i) => r.balances[i] > 0n).length;
    assert.ok(tr.length <= Math.max(0, nd + nc - 1)); const net = Object.fromEntries(ids.map((i) => [i, r.balances[i]])); tr.forEach((x) => { net[x.from] += x.units; net[x.to] -= x.units; }); ids.forEach((i) => assert.equal(net[i], 0n));
    const shuffled = [...ids].sort(() => R() - 0.5); const bal2 = Object.fromEntries(shuffled.map((i) => [i, r.balances[i]]));
    assert.deepEqual(M.settle(bal2, ids), tr);
  }
});

console.log("\n" + ok + " pruebas en verde, " + bad + " con fallas."); process.exit(bad ? 1 : 0);
