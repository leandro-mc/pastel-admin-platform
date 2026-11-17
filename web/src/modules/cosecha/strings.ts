import { common } from "./text/common";
import { orders } from "./text/orders";
import { people } from "./text/people";
import { settings } from "./text/settings";
import { shipments } from "./text/shipments";
import { status } from "./text/status";

export const strings = {
  name: "Cosecha",
  tagline: "De la finca al comprador",
  common,
  status,
  settings,
  people,
  orders,
  shipments,
} as const;
