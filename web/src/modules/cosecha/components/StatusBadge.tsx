import { AlertTriangle, CheckCircle2, Circle, Info, XCircle, type LucideIcon } from "lucide-react";
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

const icons: Record<BadgeVariant, LucideIcon> = {
  neutral: Circle,
  accent: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

/** Estado con icono, texto y color (el color nunca es la única señal). */
export function StatusBadge({ kind, value }: { kind: Kind; value: string }) {
  const labels: Record<string, string> = strings.status[kind];
  const variant = variants[value] ?? "neutral";
  const Icon = icons[variant];
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {labels[value] ?? value}
    </Badge>
  );
}

export function statusLabel(kind: Kind, value: string): string {
  const labels: Record<string, string> = strings.status[kind];
  return labels[value] ?? value;
}
