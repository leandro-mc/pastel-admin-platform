import { Calendar, CalendarClock, CalendarDays, Clock, ListChecks, Settings } from "lucide-react";
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
  nav: [
    { label: strings.nav.week, to: "", icon: CalendarDays },
    { label: strings.nav.month, to: "mes", icon: Calendar },
    { label: strings.nav.overdue, to: "vencidas", icon: Clock },
    { label: strings.nav.deadlines, to: "fechas-limite", icon: CalendarClock },
    { label: strings.nav.settings, to: "configuracion", icon: Settings },
  ],
  routes: [
    { index: true, lazy: () => import("./pages/WeekPage") },
    { path: "mes", crumb: strings.nav.month, lazy: () => import("./pages/MonthPage") },
    { path: "vencidas", crumb: strings.nav.overdue, lazy: () => import("./pages/OverduePage") },
    { path: "fechas-limite", crumb: strings.nav.deadlines, lazy: () => import("./pages/DeadlinesPage") },
    { path: "configuracion", crumb: strings.nav.settings, lazy: () => import("./pages/SettingsPage") },
  ],
} satisfies ModuleManifest;
