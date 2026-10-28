// Verifica que cada «captura» (iframe) de las guías abra el prototipo en el rol, módulo y estado indicados, sin errores.
const { JSDOM, VirtualConsole } = require("jsdom"), fs = require("fs"), path = require("path");
const dir = path.resolve(__dirname, "../cosecha/manuales/html"); let fail = 0, total = 0;
(async () => {
  for (const f of fs.readdirSync(dir).filter((x) => /^\d/.test(x))) {
    const src = fs.readFileSync(path.join(dir, f), "utf8"), shots = [...src.matchAll(/<iframe src="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
    for (const s of shots) {
      total++; const [rel, qs] = s.split("?"), file = path.resolve(dir, rel), q = new URLSearchParams(qs), errs = [];
      const vc = new VirtualConsole(); vc.on("jsdomError", (e) => { if (!/fonts\./.test(String(e.message))) errs.push(String(e.message).slice(0, 120)); });
      const dom = await JSDOM.fromFile(file, { runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, virtualConsole: vc, url: "file://" + file + "?" + qs });
      await new Promise((r) => dom.window.addEventListener("load", r)); await new Promise((r) => setTimeout(r, 30)); const d = dom.window.document, why = [];
      if (d.documentElement.dataset.role !== q.get("role")) why.push(`rol ${d.documentElement.dataset.role} ≠ ${q.get("role")}`);
      if (d.getElementById("devbar")) why.push("la barra de desarrollo no debería verse en una captura");
      if (q.get("view") && q.get("role") !== "productor") { const cur = d.querySelector("#side [aria-current=page]"); if (!cur || cur.dataset.nav !== q.get("view")) why.push(`módulo ${cur && cur.dataset.nav} ≠ ${q.get("view")}`); }
      if (!d.getElementById("view").textContent.trim()) why.push("vista vacía");
      if (errs.length) why.push("errores JS: " + errs.join(" | "));
      if (why.length) { fail++; console.log("FALLA " + f + " :: " + decodeURIComponent(qs).slice(0, 110) + "\n      -> " + why.join("; ")); }
    }
  }
  console.log(`${total - fail}/${total} capturas de las guías abren correctamente`); process.exit(fail ? 1 : 0);
})();
