#!/usr/bin/env node
// Auditoría estática de fronteras de módulos (sin dependencias adicionales).
// Uso: node scripts/check-module-boundaries.mjs
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = resolve(import.meta.dirname, "..");
const webModulesRoot = join(repoRoot, "web", "src", "modules");
const webSrcRoot = join(repoRoot, "web", "src");
const backendModulesRoot = join(repoRoot, "src", "Modules");
const findings = [];

function walk(dir, predicate, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", "bin", "obj", ".git"].includes(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, predicate, out);
    else if (predicate(full)) out.push(full);
  }
  return out;
}

function within(parent, child) {
  const rel = relative(parent, child);
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(".." + sep));
}

function importedSpecifiers(source) {
  const results = new Set();
  const patterns = [
    /\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\bimport\s*["']([^"']+)["']/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) results.add(match[1]);
  }
  return [...results];
}

function add(file, message) {
  findings.push(`${relative(repoRoot, file).split(sep).join("/")}: ${message}`);
}

function auditFrontend() {
  const files = walk(webSrcRoot, (p) => /\.(?:ts|tsx)$/.test(p));
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const underModule = within(webModulesRoot, file);
    const moduleName = underModule ? relative(webModulesRoot, file).split(sep)[0] : null;
    const moduleRoot = moduleName ? join(webModulesRoot, moduleName) : null;

    for (const specifier of importedSpecifiers(source)) {
      const directModuleImport = specifier === "@/modules" || specifier.startsWith("@/modules/");
      const shellImport = specifier === "@/app" || specifier.startsWith("@/app/");

      if (moduleName) {
        if (shellImport) add(file, `la subapp '${moduleName}' importa del shell (${specifier}); use @/core/*.`);
        if (directModuleImport) add(file, `la subapp '${moduleName}' importa un módulo por alias (${specifier}); los módulos son independientes.`);
        if (specifier.startsWith(".")) {
          const target = resolve(dirname(file), specifier);
          if (!within(moduleRoot, target)) {
            add(file, `el import relativo '${specifier}' sale de la carpeta de la subapp '${moduleName}'.`);
          }
        }
      } else {
        if (directModuleImport) add(file, `core/shell importa directamente una subapp (${specifier}); use los manifiestos generados.`);
        if (specifier.startsWith(".")) {
          const target = resolve(dirname(file), specifier);
          if (within(webModulesRoot, target)) add(file, `core/shell importa una subapp mediante ruta relativa (${specifier}).`);
        }
      }
    }
  }
}

function auditBackend() {
  const moduleDirs = readdirSync(backendModulesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const moduleName of moduleDirs) {
    const moduleRoot = join(backendModulesRoot, moduleName);
    const implementationName = `Pastel.Modules.${moduleName}`;
    const projectDir = join(moduleRoot, implementationName);
    if (!statExists(projectDir)) continue; // Descarta carpetas de contratos u otros artefactos.
    const projectFile = join(projectDir, `${implementationName}.csproj`);
    if (!statExists(projectFile)) {
      add(projectDir, `falta el proyecto ${implementationName}.csproj.`);
      continue;
    }

    const moduleSources = walk(projectDir, (p) => p.endsWith(".cs"));
    const mergedSource = moduleSources.map((p) => readFileSync(p, "utf8")).join("\n");
    if (!/:\s*IPastelModule\b/.test(mergedSource)) add(projectDir, "no se encontró una implementación de IPastelModule.");
    if (!/\[assembly:\s*PastelModule\s*\(/.test(mergedSource)) add(projectDir, "no se encontró el atributo de descubrimiento [assembly: PastelModule(...)] en el ensamblado.");

    const csproj = readFileSync(projectFile, "utf8");
    for (const match of csproj.matchAll(/<ProjectReference\b[^>]*\bInclude=["']([^"']+)["']/g)) {
      const include = match[1].replaceAll("\\", "/");
      const target = resolve(projectDir, include);
      if (!within(backendModulesRoot, target)) continue;
      const targetRelative = relative(backendModulesRoot, target);
      const targetModule = targetRelative.split(sep)[0];
      if (targetModule !== moduleName && !/\.Contracts(?:[/.\\]|$)/i.test(targetRelative)) {
        add(projectFile, `el proyecto de ${moduleName} referencia implementación de otra subapp (${include}); solo se permiten contratos explícitos.`);
      }
    }
  }
}

function statExists(path) {
  try { return statSync(path).isDirectory() || statSync(path).isFile(); }
  catch { return false; }
}

auditFrontend();
auditBackend();
if (findings.length) {
  for (const finding of findings) console.error(`check-module-boundaries: ${finding}`);
  console.error(`check-module-boundaries: ${findings.length} hallazgo(s).`);
  process.exitCode = 1;
} else {
  console.log("check-module-boundaries: sin hallazgos de imports entre subapps ni referencias de proyecto cruzadas.");
}

if (import.meta.url !== pathToFileURL(process.argv[1] ?? "").href) {
  // El módulo también puede importarse en futuras herramientas sin ejecutar el auditor.
}
