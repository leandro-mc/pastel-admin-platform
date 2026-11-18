import { Badge, type BadgeVariant } from "@/core/ui";
import type { OfferStatus } from "../api/schemas";
import { strings } from "../strings";

const variants: Record<OfferStatus, BadgeVariant> = {
  saved: "neutral",
  applied: "info",
  interview: "success",
  offer: "success",
  rejected: "danger",
  no_response: "warning",
  discarded: "neutral",
};

/** Estado de una oferta en su seguimiento. */
export function StatusBadge({ status }: { status: OfferStatus }) {
  return <Badge variant={variants[status]}>{strings.studio.status[status]}</Badge>;
}
