import {
  Bookmark,
  BookOpenText,
  Compass,
  Landmark,
  Newspaper,
  ScrollText,
} from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { agoraPermissions } from "./permissions";
import { strings } from "./strings";

export default {
  code: "agora",
  name: strings.name,
  tagline: strings.tagline,
  icon: Landmark,
  order: 30,
  basePath: "/agora",
  access: "public",
  requiredPermission: agoraPermissions.access,
  nav: [
    { label: strings.nav.home, to: "", icon: BookOpenText },
    {
      label: strings.nav.explore,
      to: "explorar",
      icon: Compass,
      alsoActiveOn: ["p"],
    },
    { label: strings.nav.news, to: "actualidad", icon: Newspaper },
    {
      label: strings.nav.saved,
      to: "guardados",
      icon: Bookmark,
      requiredPermission: agoraPermissions.saved,
    },
    { label: strings.nav.standards, to: "estandares", icon: ScrollText },
  ],
  routes: [
    { index: true, lazy: () => import("./pages/HomePage") },
    {
      path: "explorar",
      crumb: strings.nav.explore,
      lazy: () => import("./pages/ExplorePage"),
    },
    { path: "p/:slug", crumb: "Pieza", lazy: () => import("./pages/ArticlePage") },
    {
      path: "actualidad",
      crumb: strings.nav.news,
      lazy: () => import("./pages/NewsPage"),
    },
    {
      path: "guardados",
      crumb: strings.nav.saved,
      lazy: () => import("./pages/SavedPage"),
    },
    {
      path: "estandares",
      crumb: strings.nav.standards,
      lazy: () => import("./pages/StandardsPage"),
    },
  ],
} satisfies ModuleManifest;
