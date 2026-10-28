// Ejecutar: node allocation.test.js   (casos 1–5 del plan de pruebas de COSECHA.md + propiedades)
const assert = require("node:assert/strict");
const { allocate } = require("./allocation.js");
const P = (w, cap) => [{ id: "A", weight: w[0], cap: cap?.[0] }, { id: "B", weight: w[1], cap: cap?.[1] }, { id: "C", weight: w[2], cap: cap?.[2] }];
const kg = (r) => Object.fromEntries(r.rows.map((x) => [x.id, x.kg]));
const t = [];
const test = (n, f) => { try { f(); t.push([n, true]); } catch (e) { t.push([n, false, e.message]); } };

test("1. T=100 50/30/20 -> 50/30/20", () => assert.deepEqual(kg(allocate(100, P([50, 30, 20]))), { A: 50, B: 30, C: 20 }));
test("2. T=101 -> 51/30/20 (mayor resto, suma 101)", () => {
  const r = allocate(101, P([50, 30, 20])); assert.deepEqual(kg(r), { A: 51, B: 30, C: 20 }); assert.equal(r.assignedKg, 101);
});
test("3. T=100, A con tope 20 -> 20/48/32", () => assert.deepEqual(kg(allocate(100, P([50, 30, 20], [20]))), { A: 20, B: 48, C: 32 }));
test("4. topes 10/10/10 -> asignado 30, faltante 70", () => {
  const r = allocate(100, P([50, 30, 20], [10, 10, 10])); assert.equal(r.assignedKg, 30); assert.equal(r.shortfallKg, 70);
});
test("5. excluido o capacidad 0 recibe 0 y el orden no importa", () => {
  const a = [{ id: "A", weight: 50 }, { id: "B", weight: 30, include: false }, { id: "C", weight: 0 }, { id: "D", weight: 20 }];
  const r1 = allocate(70, a), r2 = allocate(70, a.slice().reverse());
  assert.deepEqual(kg(r1), { A: 50, B: 0, C: 0, D: 20 }); assert.deepEqual(kg(r1), kg(r2));
});
test("propiedad: suma exacta y sin negativos en 500 casos aleatorios con topes", () => {
  let s = 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 500; i++) {
    const n = 2 + Math.floor(rnd() * 8), T = Math.floor(rnd() * 900);
    const ps = Array.from({ length: n }, (_, j) => ({ id: "P" + j, weight: 1 + Math.floor(rnd() * 100), cap: rnd() < 0.4 ? Math.floor(rnd() * 120) : null }));
    const r = allocate(T, ps), capSum = ps.reduce((a, p) => a + (p.cap ?? Infinity), 0);
    assert.ok(r.rows.every((x) => x.kg >= 0)); assert.ok(r.rows.every((x, j) => ps[j].cap == null || x.kg <= ps[j].cap));
    assert.equal(r.assignedKg + r.shortfallKg, T); if (capSum >= T) assert.equal(r.shortfallKg, 0);
  }
});
test("equidad: quien quedó corto recibe un poco más; la suma no cambia", () => {
  const ps = [{ id: "A", weight: 50, deficit: 0.3 }, { id: "B", weight: 50, deficit: -0.3 }];
  const r = allocate(100, ps, { equityK: 0.5 }); assert.ok(kg(r).A > kg(r).B); assert.equal(r.assignedKg, 100);
  assert.deepEqual(kg(allocate(100, ps)), { A: 50, B: 50 });
});
t.forEach(([n, ok, m]) => console.log((ok ? "OK   " : "FALLA ") + n + (m ? "  -> " + m : "")));
process.exit(t.every((x) => x[1]) ? 0 : 1);
