import { Landmark } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { strings } from "./strings";

export default {
  code: "agora",
  name: strings.name,
  tagline: strings.tagline,
  icon: Landmark,
  order: 30,
  basePath: "/agora",
  access: "public",
  requiredPermission: "agora.access",
  nav: [],
  routes: [{ index: true, lazy: () => import("./pages/HomePage") }],
} satisfies ModuleManifest;
