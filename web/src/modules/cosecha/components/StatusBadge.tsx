import { Badge, type BadgeVariant } from "@/core/ui";
import { strings } from "../strings";

type Kind = keyof typeof strings.status;

const variants: Record<string, BadgeVariant> = {
  Draft: "neutral",
  Confirmed: "accent",
  Cancelled: "danger",
  PartiallyDelivered: "warning",
  Delivered: "success",
  Planned: "neutral",
  Collecting: "accent",
  Collected: "accent",
  Closed: "neutral",
  Requested: "neutral",
  Received: "success",
  NoDelivery: "danger",
  Good: "success",
  WithObservations: "warning",
  Bad: "danger",
  Pending: "warning",
  Partial: "warning",
  Paid: "success",
  Active: "success",
};

/** Estado con texto y color (el color nunca es la única señal). */
export function StatusBadge({ kind, value }: { kind: Kind; value: string }) {
  const labels: Record<string, string> = strings.status[kind];
  return <Badge variant={variants[value] ?? "neutral"}>{labels[value] ?? value}</Badge>;
}

export function statusLabel(kind: Kind, value: string): string {
  const labels: Record<string, string> = strings.status[kind];
  return labels[value] ?? value;
}
