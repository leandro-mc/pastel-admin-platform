import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

export const VIRTUAL_MODULE_ID = "virtual:pastel-modules";
const RESOLVED_ID = `\0${VIRTUAL_MODULE_ID}`;

/** Módulos de plataforma que siempre entran al paquete, igual que Identity en el backend. */
const ALWAYS_INCLUDED = ["identity"];

export type PastelModulesOptions = {
  /** Carpeta con `<codigo>/manifest.ts`. Por defecto `src/modules`, relativa a donde se ejecuta Vite. */
  modulesDir?: string;
  /** Códigos separados por coma o punto y coma, o `*` para todos. Por defecto, `PASTEL_MODULES`. */
  filter?: string;
};

/** Interpreta `PASTEL_MODULES` igual que el backend (`PastelModules`): vacío o `*` significa todos. */
export function parseModuleFilter(
  raw: string | undefined,
): readonly string[] | "all" {
  const codes = (raw ?? "")
    .split(/[;,]/)
    .map((code) => code.trim().toLowerCase())
    .filter((code) => code.length > 0);
  return codes.length === 0 || codes.includes("*") ? "all" : codes;
}

/** Códigos de las carpetas que tienen `manifest.ts`, en orden alfabético. */
export function listModuleCodes(modulesDir: string): string[] {
  if (!existsSync(modulesDir)) {
    return [];
  }
  return readdirSync(modulesDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(resolve(modulesDir, entry.name, "manifest.ts")),
    )
    .map((entry) => entry.name)
    .sort();
}

/** Aplica el filtro. Un código sin manifiesto es un error: es preferible fallar a publicar un paquete sin el módulo. */
export function selectModules(
  available: readonly string[],
  filter: readonly string[] | "all",
): string[] {
  if (filter === "all") {
    return [...available];
  }
  const unknown = filter.filter(
    (code) => !available.includes(code) && !ALWAYS_INCLUDED.includes(code),
  );
  if (unknown.length > 0) {
    throw new Error(
      `PASTEL_MODULES incluye módulos sin manifiesto: ${unknown.join(", ")}. Disponibles: ${available.join(", ") || "(ninguno)"}.`,
    );
  }
  return available.filter(
    (code) => filter.includes(code) || ALWAYS_INCLUDED.includes(code),
  );
}

/** Código fuente del módulo virtual: un `import` estático por manifiesto y la lista `modules`. */
export function renderModulesSource(codes: readonly string[]): string {
  const imports = codes
    .map((code, index) => `import m${index} from "@/modules/${code}/manifest";`)
    .join("\n");
  const list = codes.map((_, index) => `m${index}`).join(", ");
  return `${imports}\nexport const modules = [${list}];\n`;
}

/**
 * Genera `virtual:pastel-modules`: recorre `src/modules/*\/manifest.ts` y filtra por `PASTEL_MODULES`.
 * El shell nunca importa un módulo directamente (docs/ARCHITECTURE.md §9.3).
 */
export function pastelModules(options: PastelModulesOptions = {}): Plugin {
  const modulesDir = resolve(options.modulesDir ?? "src/modules");

  return {
    name: "pastel-modules",
    resolveId(id) {
      return id === VIRTUAL_MODULE_ID ? RESOLVED_ID : null;
    },
    load(id) {
      if (id !== RESOLVED_ID) {
        return null;
      }
      const filter = parseModuleFilter(
        options.filter ?? process.env.PASTEL_MODULES,
      );
      try {
        return renderModulesSource(
          selectModules(listModuleCodes(modulesDir), filter),
        );
      } catch (error) {
        return this.error(
          error instanceof Error ? error.message : String(error),
        );
      }
    },
    configureServer(server) {
      // En desarrollo, agregar o quitar un manifiesto recarga la lista de módulos.
      const refresh = (file: string) => {
        const absolute = resolve(file);
        if (
          !absolute.startsWith(modulesDir) ||
          !absolute.endsWith("manifest.ts")
        ) {
          return;
        }
        const module = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (module) {
          server.moduleGraph.invalidateModule(module);
          server.ws.send({ type: "full-reload" });
        }
      };
      server.watcher.on("add", refresh);
      server.watcher.on("unlink", refresh);
    },
  };
}
