import { Link } from "react-router";
import { Button } from "@/core/ui";
import { secondaryButton } from "@/core/ui/styles";
import { useLetters, useOffers, useVersions } from "../api/hooks";
import { markedSurface } from "../lib/marker";
import { documentsOf } from "../lib/tracking";
import { strings } from "../strings";
import { StatusBadge } from "./StatusBadge";

const t = strings.studio.context;

type Props = {
  offerId: string | null;
  onPick: () => void;
  onClear: () => void;
};

/**
 * Barra que dice siempre con qué oferta se está trabajando (y cuánto hay hecho con ella), sea cual sea la pestaña: así
 * nunca se pierde de qué oferta es lo que se ve.
 */
export function StudioContextBar({ offerId, onPick, onClear }: Props) {
  const offers = useOffers();
  const versions = useVersions();
  const letters = useLetters();
  const offer = offers.data?.find((x) => x.id === offerId) ?? null;

  if (!offer) {
    return (
      <div
        role="status"
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-line-strong bg-surface p-4"
      >
        <div>
          <p className="text-sm font-semibold text-fg">{t.none}</p>
          <p className="text-sm text-muted">{t.noneHint}</p>
        </div>
        <Button variant="secondary" type="button" onClick={onPick}>
          {t.pick}
        </Button>
      </div>
    );
  }

  const { docs, sent } = documentsOf(offer.id, versions.data ?? [], letters.data ?? []);
  return (
    <div
      role="status"
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 p-4 ${markedSurface}`}
    >
      <div className="min-w-0">
        <p className="text-sm text-muted">{t.working}</p>
        <p className="flex flex-wrap items-center gap-2 text-base font-semibold text-fg">
          <span className="break-words">
            {offer.title}
            {offer.company ? ` · ${offer.company}` : ""}
          </span>
          <StatusBadge status={offer.status} />
        </p>
        <p className="text-sm text-fg-secondary">{t.docs(docs.length, sent)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" type="button" onClick={onPick}>
          {t.change}
        </Button>
        <Button variant="ghost" type="button" onClick={onClear}>
          {t.clear}
        </Button>
        <Link
          to="/huella/historial"
          className={`${secondaryButton} no-underline`}
        >
          {t.history}
        </Link>
      </div>
    </div>
  );
}
