import { Settings, Sprout } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { cosechaPermissions } from "./paths";
import { strings } from "./strings";

export default {
  code: "cosecha",
  name: strings.name,
  tagline: strings.tagline,
  icon: Sprout,
  order: 40,
  basePath: "/cosecha",
  access: "permission",
  requiredPermission: cosechaPermissions.access,
  nav: [
    {
      label: strings.settings.title,
      to: "configuracion",
      icon: Settings,
      requiredPermission: cosechaPermissions.catalogRead,
    },
  ],
  routes: [
    { index: true, lazy: () => import("./pages/HomePage") },
    {
      path: "configuracion",
      crumb: strings.settings.title,
      lazy: () => import("./pages/SettingsPage"),
    },
  ],
} satisfies ModuleManifest;
