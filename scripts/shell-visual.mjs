#!/usr/bin/env node
// Verificación visual y de accesibilidad del shell compartido, en un navegador real y sin backend (la API se simula).
//
//   node scripts/shell-visual.mjs gallery [carpeta]   capturas: 6 apps x 2 temas, anchos estrechos y menús
//   node scripts/shell-visual.mjs audit               axe (WCAG 2.2 A/AA) solo del shell, contraste medido y desbordes
//
// Requisitos: `npm ci` en web/ y el servidor de desarrollo en marcha (`npm run dev` en web/, puerto 5173 o BASE_URL).
// Navegador: el de Playwright, o el indicado en CHROME_PATH. Sale con código 1 si `audit` encuentra incumplimientos.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const require = createRequire(join(root, "web", "package.json"));
const { chromium } = require("playwright-core");
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5173";

const ALL = ["dashboard.view", "settings.users.read", "settings.users.update", "settings.roles.read", "settings.modules.read", "settings.audit.read", "platform.workspace.access", "platform.owner", "platform.developer.mode", "brisa.access", "balance.access", "cosecha.access", "huella.access"];
const APPS = [["agora", "/agora"], ["brisa", "/brisa"], ["balance", "/balance"], ["cosecha", "/cosecha"], ["huella", "/huella"], ["identity", "/configuracion/usuarios"]];
const SHELL = ".shell-sidebar-wrap, .shell-header, .shell-bottomnav, .shell-footer, .shell-popover";

const me = (perms = ALL, roles = ["Owner/Superuser"]) => ({
  user: { id: "11111111-1111-1111-1111-111111111111", email: "mariana@pastel.test", displayName: "Mariana Solano", isActive: true, mustChangePassword: false, accessFailedCount: 0, lockoutEnd: null, createdAt: "2026-01-01T00:00:00Z", roles },
  permissions: perms,
});

async function open({ width = 1440, height = 900, theme = "light", anonymous = false, profile = me(), extra } = {}) {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width, height }, locale: "es-CR" });
  await context.addInitScript((t) => { try { localStorage.setItem("pastel-theme", t); } catch {} }, theme);
  const page = await context.newPage();
  await page.route((u) => u.pathname.startsWith("/api/"), async (route) => {
    const url = new URL(route.request().url());
    const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (extra && (await extra(url, json))) return;
    if (url.pathname === "/api/auth/me") return anonymous ? json({ status: 401 }, 401) : json(profile);
    if (url.pathname === "/api/auth/options") return json({ google: false, localLogin: true, localRegistration: true, passwordPolicy: { minLength: 12, maxLength: 128, description: "x" } });
    return json([]);
  });
  return { browser, page };
}

async function go(page, path) {
  await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForSelector(".shell", { timeout: 15000 });
  await page.waitForTimeout(400);
}

async function gallery(outDir) {
  mkdirSync(outDir, { recursive: true });
  const shots = [];
  const snap = async (name, caption, opts, path, act) => {
    const { browser, page } = await open(opts);
    await go(page, path);
    if (act) await act(page);
    await page.screenshot({ path: join(outDir, `${name}.png`) });
    shots.push([name, caption]);
    await browser.close();
  };
  for (const theme of ["light", "dark"])
    for (const [app, path] of APPS) await snap(`${app}-1440-${theme}`, `${app} · escritorio · ${theme}`, { theme }, path);
  for (const width of [1024, 768, 390, 320])
    for (const [app, path] of [APPS[1], APPS[5]]) await snap(`${app}-${width}`, `${app} · ${width} px`, { width, height: width >= 768 ? 900 : 700 }, path);
  await snap("menu-apps", "menú de aplicaciones", {}, "/brisa", (p) => p.getByRole("button", { name: /Cambiar de aplicación/ }).first().click().then(() => p.waitForTimeout(300)));
  await snap("menu-cuenta", "menú de cuenta", {}, "/brisa", (p) => p.getByRole("button", { name: /Cuenta:/ }).click().then(() => p.waitForTimeout(300)));
  await snap("riel-plegado", "barra lateral plegada", {}, "/configuracion/usuarios", (p) => p.getByRole("button", { name: "Contraer menú" }).click().then(() => p.waitForTimeout(300)));
  const html = `<!doctype html><meta charset="utf-8"><title>Shell de Pastel</title><style>body{font:14px system-ui;margin:24px;background:#777;color:#fff}figure{margin:0 0 24px}img{max-width:100%;border:1px solid #444}</style>${shots.map(([n, c]) => `<figure><figcaption>${c}</figcaption><img src="${n}.png" alt="${c}"></figure>`).join("")}`;
  writeFileSync(join(outDir, "index.html"), html);
  console.log(`Galería: ${join(outDir, "index.html")} (${shots.length} capturas)`);
}

const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
const rgba = (s) => { const m = s.match(/rgba?\(([^)]+)\)/) ?? s.match(/color\(srgb ([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); const k = s.startsWith("color(") ? 255 : 1; return { r: p[0] * k, g: p[1] * k, b: p[2] * k, a: p[3] ?? 1 }; };
const blend = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
const ratio = (f, b) => { const x = lum(blend(f, b)), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

async function pairRatio(page, sel) {
  const r = await page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const stack = []; for (let n = el; n; n = n.parentElement) stack.push(getComputedStyle(n).backgroundColor); return { color: getComputedStyle(el).color, stack }; }, sel);
  if (!r) return null;
  let bg = { r: 255, g: 255, b: 255, a: 1 };
  for (const c of r.stack.reverse()) { const p = rgba(c); if (p && p.a > 0) bg = blend(p, bg); }
  return ratio(rgba(r.color), bg);
}

async function audit() {
  const problems = [];
  const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
  const states = [
    ["escritorio claro · Workspace", {}, "/configuracion/usuarios"],
    ["escritorio oscuro · Brisa", { theme: "dark" }, "/brisa"],
    ["móvil 390 · Workspace", { width: 390, height: 844 }, "/configuracion/usuarios"],
    ["móvil 320 · Brisa", { width: 320, height: 640 }, "/brisa"],
    ["menú de apps abierto", {}, "/brisa", (p) => p.getByRole("button", { name: /Cambiar de aplicación/ }).first().click()],
    ["menú de cuenta abierto", {}, "/brisa", (p) => p.getByRole("button", { name: /Cuenta:/ }).click()],
    ["barra lateral plegada", {}, "/configuracion/usuarios", (p) => p.getByRole("button", { name: "Contraer menú" }).click()],
    ["visitante anónimo · Ágora", { anonymous: true }, "/agora"],
  ];
  for (const [label, opts, path, act] of states) {
    const { browser, page } = await open(opts);
    await go(page, path);
    if (act) { await act(page); await page.waitForTimeout(300); }
    await page.evaluate(AXE);
    const res = await page.evaluate((t) => window.axe.run(document, { runOnly: { type: "tag", values: t } }), tags);
    let shellNodes = 0;
    for (const v of res.violations) for (const n of v.nodes) {
      const inShell = await page.evaluate(({ s, shell }) => !!document.querySelector(s)?.closest(shell), { s: n.target[0], shell: SHELL }).catch(() => false);
      if (inShell) { shellNodes++; problems.push(`axe · ${label}: ${v.id} ${n.target.join(" ")}`); }
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) problems.push(`desborde horizontal · ${label}: ${overflow}px`);
    console.log(`${shellNodes === 0 && overflow <= 0 ? "ok " : "FALLA"} ${label}`);
    await browser.close();
  }
  const pairs = [["ítem inactivo", ".shell-nav-item:not([aria-current])", 4.5], ["ítem activo", ".shell-nav-item[aria-current]", 4.5], ["descripción de app", ".shell-sidebar .shell-app-tagline", 4.5], ["miga actual", ".shell-crumbs [aria-current]", 4.5], ["pie", ".shell-footer", 4.5], ["avatar", ".shell-avatar", 4.5], ["marca", ".shell-brand svg", 3]];
  const worst = {};
  for (const theme of ["light", "dark"]) for (const [app, path] of APPS) {
    const { browser, page } = await open({ theme });
    await go(page, path);
    for (const [name, sel, min] of pairs) {
      const v = await pairRatio(page, sel);
      if (v === null) continue;
      worst[name] = Math.min(worst[name] ?? 99, v);
      if (v < min) problems.push(`contraste · ${theme} ${app} ${name}: ${v.toFixed(2)} < ${min}`);
    }
    await browser.close();
  }
  console.log("Peor caso de contraste (6 apps x 2 temas):", Object.entries(worst).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(" · "));
  if (problems.length) { console.error(`\n${problems.length} incumplimiento(s):\n- ${problems.join("\n- ")}`); process.exit(1); }
  console.log("shell-visual audit: sin incumplimientos.");
}

const [command, arg] = process.argv.slice(2);
if (!existsSync(join(root, "web", "node_modules"))) { console.error("Falta `npm ci` en web/."); process.exit(2); }
if (command === "gallery") await gallery(resolve(arg ?? join(root, "web", "test-results", "shell-visual")));
else if (command === "audit") await audit();
else { console.error("Uso: node scripts/shell-visual.mjs gallery [carpeta] | audit"); process.exit(2); }
