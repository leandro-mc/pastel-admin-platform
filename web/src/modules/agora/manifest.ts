import {
  Bookmark,
  BookOpenText,
  Compass,
  Landmark,
  Newspaper,
  ScrollText,
  SquarePen,
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
    {
      label: strings.nav.editorial,
      to: "editorial",
      icon: SquarePen,
      requiredPermission: agoraPermissions.access,
    },
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
    {
      path: "editorial",
      crumb: strings.nav.editorial,
      lazy: () => import("./pages/editorial/EditorialListPage"),
    },
    {
      path: "editorial/piezas/nueva",
      crumb: strings.editorial.editor.newTitle,
      lazy: () => import("./pages/editorial/ArticleEditorPage"),
    },
    {
      path: "editorial/piezas/:id",
      crumb: strings.editorial.editor.editTitle,
      lazy: () => import("./pages/editorial/ArticleEditorPage"),
    },
    {
      path: "editorial/hoy",
      crumb: strings.editorial.nav.picks,
      lazy: () => import("./pages/editorial/DailyPicksPage"),
    },
    {
      path: "editorial/revision",
      crumb: strings.editorial.nav.review,
      lazy: () => import("./pages/editorial/ReviewPage"),
    },
    {
      path: "editorial/actualidad",
      crumb: strings.editorial.nav.news,
      lazy: () => import("./pages/editorial/NewsAdminPage"),
    },
    {
      path: "editorial/errores",
      crumb: strings.editorial.nav.reports,
      lazy: () => import("./pages/editorial/ErrorReportsPage"),
    },
    {
      path: "editorial/organizacion",
      crumb: strings.editorial.nav.organization,
      lazy: () => import("./pages/editorial/OrganizationPage"),
    },
  ],
} satisfies ModuleManifest;
