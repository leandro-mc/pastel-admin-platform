import { common } from "./text/common";
import { orders } from "./text/orders";
import { people } from "./text/people";
import { settings } from "./text/settings";
import { reports } from "./text/reports";
import { settlements } from "./text/settlements";
import { shipments } from "./text/shipments";
import { status } from "./text/status";
import { today } from "./text/today";

export const strings = {
  name: "Cosecha",
  tagline: "De la finca al comprador",
  nav: {
    operation: "Operación",
    people: "Personas",
    money: "Dinero",
    admin: "Administración",
  },
  common,
  status,
  settings,
  people,
  orders,
  shipments,
  settlements,
  reports,
  today,
} as const;
