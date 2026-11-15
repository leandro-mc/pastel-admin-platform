declare module "virtual:pastel-modules" {
  import type { ModuleManifest } from "@/core/modules/types";

  /** Manifiestos de los módulos incluidos en este paquete (`PASTEL_MODULES`). */
  export const modules: readonly ModuleManifest[];
}
