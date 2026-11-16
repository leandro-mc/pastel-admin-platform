import {
  BookOpenText,
  ClipboardList,
  FileText,
  Footprints,
  Globe,
  KeyRound,
  MessagesSquare,
} from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { strings } from "./strings";

/**
 * Huella es exclusiva de la persona dueña de la cuenta: todo el panel exige `huella.access`.
 * La única superficie sin sesión es `/huella/p/:token`, que solo muestra lo publicado.
 */
export default {
  code: "huella",
  name: strings.name,
  tagline: strings.tagline,
  icon: Footprints,
  order: 50,
  basePath: "/huella",
  access: "permission",
  requiredPermission: "huella.access",
  nav: [
    {
      label: strings.nav.bank,
      to: "banco",
      icon: BookOpenText,
      alsoActiveOn: [""],
    },
    { label: strings.nav.studio, to: "cv", icon: FileText },
    { label: strings.nav.profile, to: "perfil", icon: Globe },
    { label: strings.nav.history, to: "historial", icon: ClipboardList },
    { label: strings.nav.ai, to: "ia", icon: KeyRound },
    {
      label: strings.nav.interview,
      to: "pronto/entrevistas",
      icon: MessagesSquare,
      group: strings.nav.soon,
    },
  ],
  routes: [
    { index: true, lazy: () => import("./pages/HomePage") },
    {
      path: "banco",
      crumb: strings.nav.bank,
      lazy: () => import("./pages/BankPage"),
    },
    {
      path: "cv",
      crumb: strings.nav.studio,
      lazy: () => import("./pages/StudioPage"),
    },
    {
      path: "perfil",
      crumb: strings.nav.profile,
      lazy: () => import("./pages/PublicationPage"),
    },
    {
      path: "historial",
      crumb: strings.nav.history,
      lazy: () => import("./pages/HistoryPage"),
    },
    {
      path: "ia",
      crumb: strings.nav.ai,
      lazy: () => import("./pages/AiPage"),
    },
    {
      path: "pronto",
      crumb: strings.soon.title,
      lazy: () => import("./pages/SoonPage"),
    },
  ],
  platformRoutes: [
    {
      path: "/huella/vista-previa",
      session: true,
      bare: true,
      lazy: () => import("./pages/PreviewPage"),
    },
    {
      path: "/huella/p/:token",
      session: false,
      bare: true,
      lazy: () => import("./pages/PublicPage"),
    },
  ],
} satisfies ModuleManifest;
