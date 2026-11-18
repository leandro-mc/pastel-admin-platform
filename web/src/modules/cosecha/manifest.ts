import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Package,
  Settings,
  Sprout,
  Store,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import type { ModuleManifest } from "@/core/modules/types";
import { cosechaPermissions } from "./paths";
import { strings } from "./strings";

const p = cosechaPermissions;

export default {
  code: "cosecha",
  name: strings.name,
  tagline: strings.tagline,
  icon: Sprout,
  order: 40,
  basePath: "/cosecha",
  access: "permission",
  requiredPermission: p.access,
  nav: [
    {
      label: strings.today.title,
      to: "",
      icon: LayoutDashboard,
      requiredPermission: p.shipmentsRead,
    },
    {
      label: strings.orders.mine.title,
      to: "mis-pedidos",
      icon: Package,
      requiredPermission: p.ordersReadOwn,
    },
    {
      label: strings.shipments.title,
      to: "envios",
      icon: Truck,
      requiredPermission: p.shipmentsRead,
      group: strings.nav.operation,
    },
    {
      label: strings.orders.title,
      to: "pedidos",
      icon: ClipboardList,
      requiredPermission: p.ordersRead,
      group: strings.nav.operation,
    },
    {
      label: strings.people.buyers.title,
      to: "compradores",
      icon: Store,
      requiredPermission: p.buyersRead,
      group: strings.nav.people,
    },
    {
      label: strings.people.producers.title,
      to: "productores",
      icon: Users,
      requiredPermission: p.producersRead,
      group: strings.nav.people,
    },
    {
      label: strings.settlements.title,
      to: "liquidacion",
      icon: Wallet,
      requiredPermission: p.settlementsRead,
      group: strings.nav.money,
    },
    {
      label: strings.reports.title,
      to: "reportes",
      icon: BarChart3,
      requiredPermission: p.reportsRead,
      group: strings.nav.money,
    },
    {
      label: strings.settings.title,
      to: "configuracion",
      icon: Settings,
      requiredPermission: p.catalogRead,
      group: strings.nav.admin,
    },
  ],
  routes: [
    { index: true, lazy: () => import("./pages/HomePage") },
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
      path: "liquidacion",
      crumb: strings.settlements.title,
      lazy: () => import("./pages/SettlementPage"),
    },
    {
      path: "liquidacion/:producerId",
      lazy: () => import("./pages/StatementPage"),
    },
    {
      path: "reportes",
      crumb: strings.reports.title,
      lazy: () => import("./pages/ReportsPage"),
    },
    {
      path: "configuracion",
      crumb: strings.settings.title,
      lazy: () => import("./pages/SettingsPage"),
    },
  ],
} satisfies ModuleManifest;
