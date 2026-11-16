import { Badge, Panel } from "@/core/ui";
import type { Evidence, Offer } from "../api/schemas";
import { strings } from "../strings";

const t = strings.studio.offer;

const statusVariant = {
  ok: "success",
  partial: "warning",
  gap: "danger",
} as const;

/** Mapa de evidencia y filtros duros de una oferta. Una brecha se dice como brecha. */
export function EvidenceMap({ offer }: { offer: Offer }) {
  return (
    <Panel title={t.map} description={t.mapDescription}>
      <EvidenceList items={offer.evidence} />
      {offer.hardFilters.length > 0 ? (
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="text-base font-semibold text-fg">{t.filters}</h3>
          <p className="mt-1 text-sm text-muted">{t.filtersDescription}</p>
          <ul className="mt-3 flex flex-col gap-3">
            {offer.hardFilters.map((f) => (
              <li key={f.requirement} className="flex flex-col gap-1 text-sm">
                <p className="font-medium text-fg">{f.requirement}</p>
                <p className="text-muted">{f.mine}</p>
                <p className="text-fg-secondary">{f.advice}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  );
}

export function EvidenceList({ items }: { items: readonly Evidence[] }) {
  return (
    <ul className="flex flex-col divide-y divide-line">
      {items.map((item) => (
        <li
          key={item.term}
          className="flex flex-wrap items-center gap-3 py-2 text-sm"
        >
          <span className="min-w-32 font-medium text-fg">{item.term}</span>
          <Badge variant={statusVariant[item.status]}>
            {t.status[item.status]}
          </Badge>
          <span className="text-muted">
            {item.weight >= 3 ? t.mustHave : t.nice}
          </span>
          {item.note ? <span className="text-muted">{item.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}
