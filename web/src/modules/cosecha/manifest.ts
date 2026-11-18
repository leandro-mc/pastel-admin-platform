import { ClipboardList, Package, Settings, Sprout, Store, Truck, Users, Wallet } from "lucide-react";
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
      label: strings.settlements.title,
      to: "liquidacion",
      icon: Wallet,
      requiredPermission: cosechaPermissions.settlementsRead,
    },
    {
      label: strings.shipments.title,
      to: "envios",
      icon: Truck,
      requiredPermission: cosechaPermissions.shipmentsRead,
      alsoActiveOn: ["envios/nuevo"],
    },
    {
      label: strings.orders.title,
      to: "pedidos",
      icon: ClipboardList,
      requiredPermission: cosechaPermissions.ordersRead,
      alsoActiveOn: ["pedidos/nuevo"],
    },
    {
      label: strings.orders.mine.title,
      to: "mis-pedidos",
      icon: Package,
      requiredPermission: cosechaPermissions.ordersReadOwn,
    },
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
      path: "liquidacion",
      crumb: strings.settlements.title,
      lazy: () => import("./pages/SettlementPage"),
    },
    { path: "liquidacion/:producerId", lazy: () => import("./pages/StatementPage") },
    {
      path: "envios",
      crumb: strings.shipments.title,
      lazy: () => import("./pages/ShipmentsPage"),
    },
    {
      path: "envios/nuevo",
      crumb: strings.shipments.plan.title,
      lazy: () => import("./pages/NewShipmentPage"),
    },
    { path: "envios/:id", lazy: () => import("./pages/ShipmentPage") },
    {
      path: "pedidos",
      crumb: strings.orders.title,
      lazy: () => import("./pages/OrdersPage"),
    },
    {
      path: "pedidos/nuevo",
      crumb: strings.orders.newTitle,
      lazy: () => import("./pages/NewOrderPage"),
    },
    { path: "pedidos/:id", lazy: () => import("./pages/OrderPage") },
    {
      path: "mis-pedidos",
      crumb: strings.orders.mine.title,
      lazy: () => import("./pages/MyOrdersPage"),
    },
    { path: "mis-pedidos/:id", lazy: () => import("./pages/MyOrderPage") },
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
