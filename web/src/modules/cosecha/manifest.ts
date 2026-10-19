import { Sprout } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { strings } from "./strings";

export default {
  code: "cosecha",
  name: strings.name,
  tagline: strings.tagline,
  icon: Sprout,
  basePath: "/cosecha",
  access: "permission",
  requiredPermission: "cosecha.access",
  nav: [],
  routes: [{ index: true, lazy: () => import("./pages/HomePage") }],
} satisfies ModuleManifest;
