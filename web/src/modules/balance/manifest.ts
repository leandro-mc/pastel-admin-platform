import { CircleHelp, Scale, UserPlus, Users } from "lucide-react";
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
  nav: [
    { label: strings.nav.groups, to: "/balance", icon: Users, alsoActiveOn: ["/balance/grupos"] },
    { label: strings.nav.join, to: "/balance/unirse", icon: UserPlus },
    { label: strings.nav.help, to: "/balance/ayuda", icon: CircleHelp },
  ],
  routes: [
    { index: true, lazy: () => import("./pages/GroupsPage") },
    { path: "grupos/nuevo", crumb: strings.newGroup.title, lazy: () => import("./pages/NewGroupPage") },
    { path: "unirse", crumb: strings.join.title, lazy: () => import("./pages/JoinPage") },
    { path: "ayuda", crumb: strings.help.title, lazy: () => import("./pages/HelpPage") },
    { path: "grupos/:groupId", lazy: () => import("./pages/SummaryPage") },
    { path: "grupos/:groupId/gastos", lazy: () => import("./pages/ExpensesPage") },
    { path: "grupos/:groupId/saldos", lazy: () => import("./pages/BalancesPage") },
    { path: "grupos/:groupId/liquidar", lazy: () => import("./pages/SettlePage") },
    { path: "grupos/:groupId/personas", lazy: () => import("./pages/PeoplePage") },
    { path: "grupos/:groupId/gestion", lazy: () => import("./pages/SheetPage") },
    { path: "grupos/:groupId/ajustes", lazy: () => import("./pages/SettingsPage") },
  ],
} satisfies ModuleManifest;
