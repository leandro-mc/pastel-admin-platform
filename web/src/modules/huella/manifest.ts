import { Footprints } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { strings } from "./strings";

export default {
  code: "huella",
  name: strings.name,
  tagline: strings.tagline,
  icon: Footprints,
  order: 50,
  basePath: "/huella",
  access: "public",
  requiredPermission: "huella.access",
  nav: [],
  routes: [{ index: true, lazy: () => import("./pages/HomePage") }],
} satisfies ModuleManifest;
