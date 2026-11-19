import { Clock, FilePenLine, ShieldCheck } from "lucide-react";
import { Badge } from "@/core/ui";
import { formatDate } from "../lib/format";
import type { Seal } from "../api/schemas";
import { strings } from "../strings";

/** Texto del sello: el estado nunca se comunica solo con color. */
export function sealLabel(seal: Seal, compact = false): string {
  switch (seal.state) {
    case "verified":
      return compact || seal.verifiers.length === 0
        ? strings.seal.verified
        : strings.seal.verifiedBy(
            seal.verifiers.map((v) => v.name).join(", "),
            formatDate(seal.verifiers[seal.verifiers.length - 1]?.verifiedAt),
          );
    case "modifiedAfterVerification":
      return strings.seal.modified;
    case "pending":
      return strings.seal.pending;
  }
}

const icons = {
  verified: ShieldCheck,
  pending: Clock,
  modifiedAfterVerification: FilePenLine,
} as const;

const variants = {
  verified: "success",
  pending: "neutral",
  modifiedAfterVerification: "warning",
} as const;

/** Sello de verificación: ícono y texto, con tres estados (Verificado, Pendiente, Modificada tras la verificación). */
export function SealBadge({
  seal,
  compact = false,
}: {
  seal: Seal;
  compact?: boolean;
}) {
  const Icon = icons[seal.state];
  return (
    <Badge variant={variants[seal.state]}>
      <Icon aria-hidden="true" size={14} />
      {sealLabel(seal, compact)}
    </Badge>
  );
}

/** Explicación del estado y quién verificó, para la página de la pieza («Cómo sabemos esto»). */
export function SealExplanation({ seal }: { seal: Seal }) {
  const explanation = {
    verified: strings.seal.explainVerified,
    pending: strings.seal.explainPending,
    modifiedAfterVerification: strings.seal.explainModified,
  }[seal.state];
  return (
    <div className="flex flex-col gap-2">
      <SealBadge seal={seal} />
      <p className="text-sm leading-relaxed text-fg-secondary">
        {explanation}
      </p>
      {seal.requiredReviews > 1 && seal.state !== "verified" ? (
        <p className="text-sm text-muted">
          {strings.seal.progress(seal.activeReviews, seal.requiredReviews)}
        </p>
      ) : null}
    </div>
  );
}
