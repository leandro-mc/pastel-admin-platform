// Reglas duras de diseño de AGENTS.md §7 aplicadas a los prototipos: sin morado (tono HSL 235°–345° con saturación perceptible) y sin símbolos de IA (✨ 🤖 🪄 🔮).
// Uso: node check-hard-rules.js [carpeta ...]   (por defecto, todas las carpetas de prototipo). Salida != 0 si hay incumplimientos.
const fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
const dirs = process.argv.slice(2).length ? process.argv.slice(2).map((d) => path.resolve(d)) : ["agora/prototype", "cosecha/prototype", "huella/prototype-estudio", "huella/prototype-perfil", "brisa/prototype", "balance/prototype"].map((d) => path.join(root, d));
const HEX = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, AI = /[✨🤖🪄🔮]/u, MIN_SAT = 12;
function hsl(hex) { let h = hex.slice(1); if (h.length === 3) h = [...h].map((c) => c + c).join(""); const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; if (!d) return [0, 0, l * 100]; const s = d / (1 - Math.abs(2 * l - 1)); let hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh = (hh * 60 + 360) % 360; return [hh, s * 100, l * 100]; }
let bad = 0, files = 0;
for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!/\.(css|js|html)$/.test(f) || /\.test\.js$/.test(f)) continue; files++;
    const src = fs.readFileSync(path.join(dir, f), "utf8");
    for (const m of src.matchAll(HEX)) { const [h, s] = hsl(m[0]); if (h >= 235 && h <= 345 && s >= MIN_SAT) { bad++; console.log("MORADO  " + path.relative(root, path.join(dir, f)) + "  " + m[0] + "  (tono " + Math.round(h) + "°)"); } }
    if (AI.test(src)) { bad++; console.log("SÍMBOLO DE IA  " + path.relative(root, path.join(dir, f))); }
  }
}
console.log(bad ? "\n" + bad + " incumplimiento(s) en " + files + " archivos." : "Sin morado ni símbolos de IA en " + files + " archivos de prototipo."); process.exit(bad ? 1 : 0);
