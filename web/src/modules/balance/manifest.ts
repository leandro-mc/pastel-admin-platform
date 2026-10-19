import { Scale } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { strings } from "./strings";

export default {
  code: "balance",
  name: strings.name,
  tagline: strings.tagline,
  icon: Scale,
  order: 20,
  basePath: "/balance",
  access: "permission",
  requiredPermission: "balance.access",
  nav: [],
  routes: [{ index: true, lazy: () => import("./pages/HomePage") }],
} satisfies ModuleManifest;
