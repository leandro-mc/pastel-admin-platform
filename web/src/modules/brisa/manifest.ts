import { ListChecks } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { strings } from "./strings";

export default {
  code: "brisa",
  name: strings.name,
  tagline: strings.tagline,
  icon: ListChecks,
  order: 10,
  basePath: "/brisa",
  access: "permission",
  requiredPermission: "brisa.access",
  nav: [],
  routes: [{ index: true, lazy: () => import("./pages/HomePage") }],
} satisfies ModuleManifest;
