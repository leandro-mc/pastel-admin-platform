import { Outlet } from "react-router";
import type { ModuleManifest } from "@/core/modules/types";

/** Marco del módulo: la navegación compartida vive en RootLayout; el módulo conserva su ámbito visual. */
export default function ModuleLayout({
  manifest,
}: {
  manifest: ModuleManifest;
}) {
  return (
    <div data-module={manifest.code} className="module-route min-w-0">
      <Outlet />
    </div>
  );
}
