import { CalendarDays, ListChecks } from "lucide-react";
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
  nav: [{ label: strings.nav.week, to: "", icon: CalendarDays }],
  routes: [{ index: true, lazy: () => import("./pages/WeekPage") }],
} satisfies ModuleManifest;
