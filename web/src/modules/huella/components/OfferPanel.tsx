import { CircleCheck, CircleDashed, CircleX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge, Panel } from "@/core/ui";
import type { BadgeVariant } from "@/core/ui";
import type { Evidence, Offer } from "../api/schemas";
import { strings } from "../strings";

const t = strings.studio.offer;

/** Cada estado lleva color, icono y texto (nunca solo color): verde con evidencia, ámbar parcial, rojo brecha. */
const statusLook: Record<Evidence["status"], { variant: BadgeVariant; Icon: LucideIcon }> = {
  ok: { variant: "success", Icon: CircleCheck },
  partial: { variant: "warning", Icon: CircleDashed },
  gap: { variant: "danger", Icon: CircleX },
};

/**
 * Mapa de evidencia y filtros duros de una oferta. Una brecha se dice como brecha. Arriba, el resumen (cuántos requisitos
 * hay en cada estado) para leer el ajuste de un vistazo; debajo, cada requisito con su estado alineado a la derecha.
 */
export function EvidenceMap({ offer }: { offer: Offer }) {
  return (
    <Panel title={t.map} description={t.mapDescription}>
      <EvidenceSummary items={offer.evidence} />
      <EvidenceList items={offer.evidence} />
      {offer.hardFilters.length > 0 ? (
        <section className="mt-5 border-t border-line pt-4" aria-labelledby="huella-hard-filters">
          <h3 id="huella-hard-filters" className="text-base font-semibold text-fg">
            {t.filters}
          </h3>
          <p className="mt-1 text-sm text-muted">{t.filtersDescription}</p>
          <ul className="mt-3 flex flex-col gap-2">
            {offer.hardFilters.map((f) => {
              const ok = f.status === "ok";
              const look = ok ? statusLook.ok : statusLook.gap;
              return (
                <li
                  key={f.requirement}
                  className="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface-sunken px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-fg">{f.requirement}</p>
                    <p className="text-muted">{f.mine}</p>
                    {ok ? null : <p className="mt-1 text-fg-secondary">{f.advice}</p>}
                  </div>
                  <Badge variant={look.variant} className="shrink-0">
                    <look.Icon aria-hidden="true" className="size-3.5" />
                    {ok ? t.filterOk : t.filterNo}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </Panel>
  );
}

function EvidenceSummary({ items }: { items: readonly Evidence[] }) {
  if (items.length === 0) return null;
  const count = (status: Evidence["status"]) => items.filter((i) => i.status === status).length;
  return (
    <p className="mb-3 flex flex-wrap gap-2" aria-label={t.summaryLabel}>
      {(["ok", "partial", "gap"] as const).map((status) => {
        const n = count(status);
        if (n === 0) return null;
        const look = statusLook[status];
        return (
          <Badge key={status} variant={look.variant}>
            <look.Icon aria-hidden="true" className="size-3.5" />
            {t.summary[status](n)}
          </Badge>
        );
      })}
    </p>
  );
}

export function EvidenceList({ items }: { items: readonly Evidence[] }) {
  return (
    <ul className="flex flex-col divide-y divide-line">
      {items.map((item) => {
        const look = statusLook[item.status];
        const must = item.weight >= 3;
        return (
          <li key={item.term} className="flex items-start justify-between gap-3 py-2.5 text-sm">
            <div className="min-w-0">
              <p className="font-medium break-words text-fg">{item.term}</p>
              <p className="text-xs text-muted">
                <span className={must ? "font-semibold text-fg-secondary" : undefined}>
                  {must ? t.mustHave : t.nice}
                </span>
                {item.note ? ` · ${item.note}` : ""}
              </p>
            </div>
            <Badge variant={look.variant} className="shrink-0">
              <look.Icon aria-hidden="true" className="size-3.5" />
              {t.status[item.status]}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
