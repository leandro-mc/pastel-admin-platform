import { common } from "./text/common";
import { people } from "./text/people";
import { settings } from "./text/settings";
import { status } from "./text/status";

export const strings = {
  name: "Cosecha",
  tagline: "De la finca al comprador",
  common,
  status,
  settings,
  people,
} as const;
