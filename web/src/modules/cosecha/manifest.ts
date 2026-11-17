import { Settings, Sprout, Store, Users } from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { cosechaPermissions } from "./paths";
import { strings } from "./strings";

export default {
  code: "cosecha",
  name: strings.name,
  tagline: strings.tagline,
  icon: Sprout,
  order: 40,
  basePath: "/cosecha",
  access: "permission",
  requiredPermission: cosechaPermissions.access,
  nav: [
    {
      label: strings.people.buyers.title,
      to: "compradores",
      icon: Store,
      requiredPermission: cosechaPermissions.buyersRead,
      alsoActiveOn: ["compradores/nuevo"],
    },
    {
      label: strings.people.producers.title,
      to: "productores",
      icon: Users,
      requiredPermission: cosechaPermissions.producersRead,
      alsoActiveOn: ["productores/nuevo"],
    },
    {
      label: strings.settings.title,
      to: "configuracion",
      icon: Settings,
      requiredPermission: cosechaPermissions.catalogRead,
    },
  ],
  routes: [
    { index: true, lazy: () => import("./pages/HomePage") },
    {
      path: "compradores",
      crumb: strings.people.buyers.title,
      lazy: () => import("./pages/BuyersPage"),
    },
    {
      path: "compradores/nuevo",
      crumb: strings.people.buyers.newTitle,
      lazy: () => import("./pages/BuyerPage"),
    },
    { path: "compradores/:id", lazy: () => import("./pages/BuyerPage") },
    {
      path: "productores",
      crumb: strings.people.producers.title,
      lazy: () => import("./pages/ProducersPage"),
    },
    {
      path: "productores/nuevo",
      crumb: strings.people.producers.newTitle,
      lazy: () => import("./pages/ProducerPage"),
    },
    { path: "productores/:id", lazy: () => import("./pages/ProducerPage") },
    {
      path: "configuracion",
      crumb: strings.settings.title,
      lazy: () => import("./pages/SettingsPage"),
    },
  ],
} satisfies ModuleManifest;
