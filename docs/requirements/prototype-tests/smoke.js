// Uso: node smoke.js <carpeta-del-prototipo> <script-de-pruebas.js>
const { JSDOM, VirtualConsole } = require("jsdom");
const path = require("path"), fs = require("fs");
const dir = path.resolve(process.argv[2]), tests = require(path.resolve(process.argv[3]));
const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => { const m = String(e.message || e); if (!/fonts\.(googleapis|gstatic)/.test(m)) errors.push(m); }); // sin Internet no cargan las tipografías: no es un defecto
vc.on("error", (e) => errors.push(String(e)));
(async () => {
  const dom = await JSDOM.fromFile(path.join(dir, "index.html"), { runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, virtualConsole: vc, url: "file://" + dir + "/index.html" });
  await new Promise((r) => dom.window.addEventListener("load", r));
  dom.window.scrollTo = () => {};
  dom.window.Element.prototype.scrollIntoView = () => {}; // jsdom no lo implementa; los navegadores sí
  const w = dom.window, d = w.document;
  const $ = (s) => d.querySelector(s), $$ = (s) => [...d.querySelectorAll(s)];
  const click = (s) => { const n = typeof s === "string" ? $(s) : s; if (!n) throw new Error("no existe: " + s); n.dispatchEvent(new w.MouseEvent("click", { bubbles: true })); };
  const type = (s, v) => { const n = $(s); if (!n) throw new Error("no existe: " + s); n.value = v; n.dispatchEvent(new w.Event("input", { bubbles: true })); n.dispatchEvent(new w.Event("change", { bubbles: true })); };
  const text = () => d.body.textContent.replace(/\s+/g, " ");
  const res = [];
  const t = (name, fn) => { try { fn(); res.push([name, true]); } catch (e) { res.push([name, false, e.message]); } };
  try { await tests({ dir, w, d, $, $$, click, type, text, t, wait: (ms) => new Promise((r) => setTimeout(r, ms)) }); } catch (e) { res.push(["EXCEPCIÓN en la prueba", false, e.message]); console.log("TEXTO ACTUAL:", d.body.textContent.replace(/\s+/g, " ").slice(0, 900)); }
  t("sin errores de JS en la carga ni en el uso", () => { if (errors.length) throw new Error(errors.slice(0, 3).join(" | ")); });
  res.forEach(([n, ok, m]) => console.log((ok ? "OK   " : "FALLA ") + n + (m ? "  -> " + m : "")));
  process.exit(res.every((x) => x[1]) ? 0 : 1);
})();
