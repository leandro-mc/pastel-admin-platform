import { useState } from "react";
import { useNotify } from "@/core/notifications";
import { Badge, Button, ConfirmDialog, Panel, TextField } from "@/core/ui";
import { useCreateOffer, useDeleteOffer, useOffers } from "../api/hooks";
import type { Evidence, Offer } from "../api/schemas";
import { strings } from "../strings";
import { ErrorNotice, Loaded, TextAreaField, fieldError } from "./Form";

const t = strings.studio.offer;

type Props = {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

/** Alta de ofertas (texto pegado, tratado solo como dato) y lista de las guardadas. */
export function OfferPanel({ selectedId, onSelect }: Props) {
  const notify = useNotify();
  const offers = useOffers();
  const create = useCreateOffer();
  const remove = useDeleteOffer();
  const [rawText, setRawText] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [toDelete, setToDelete] = useState<string | null>(null);

  const submit = () =>
    create.mutate(
      {
        title: title || null,
        company: company || null,
        sourceUrl: sourceUrl || null,
        rawText,
      },
      {
        onSuccess: (offer) => {
          setRawText("");
          setTitle("");
          setCompany("");
          setSourceUrl("");
          onSelect(offer.id);
        },
      },
    );

  return (
    <Panel title={t.title} description={t.description}>
      <div className="flex flex-col gap-4">
        <TextAreaField
          label={t.text}
          rows={8}
          value={rawText}
          error={fieldError(create.error, "rawText")}
          onChange={(e) => setRawText(e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label={t.titleField}
            value={title}
            error={fieldError(create.error, "title")}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            label={t.company}
            value={company}
            error={fieldError(create.error, "company")}
            onChange={(e) => setCompany(e.target.value)}
          />
          <TextField
            label={t.url}
            value={sourceUrl}
            error={fieldError(create.error, "sourceUrl")}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
        </div>
        <div>
          <Button
            variant="primary"
            type="button"
            disabled={rawText.trim() === ""}
            loading={create.isPending}
            loadingLabel={t.analyzing}
            onClick={submit}
          >
            {t.analyze}
          </Button>
        </div>
        <ErrorNotice error={create.error} />

        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <h3 className="text-base font-semibold text-fg">{t.saved}</h3>
          <Loaded query={offers}>
            {(list) =>
              list.length === 0 ? (
                <p className="text-sm text-muted">{t.none}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {list.map((offer) => (
                    <li
                      key={offer.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-fg">
                          {offer.title}
                        </p>
                        {offer.company ? (
                          <p className="text-sm text-muted">{offer.company}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={
                            selectedId === offer.id ? "primary" : "secondary"
                          }
                          type="button"
                          aria-pressed={selectedId === offer.id}
                          onClick={() =>
                            onSelect(selectedId === offer.id ? null : offer.id)
                          }
                        >
                          {selectedId === offer.id ? "Seleccionada" : "Usar"}
                        </Button>
                        <Button
                          variant="ghost"
                          type="button"
                          aria-label={`${t.delete}: ${offer.title}`}
                          onClick={() => setToDelete(offer.id)}
                        >
                          {strings.common.delete}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            }
          </Loaded>
        </div>
      </div>
      {toDelete ? (
        <ConfirmDialog
          title={t.deleteTitle}
          message={t.deleteMessage}
          confirmLabel={strings.common.delete}
          cancelLabel={strings.common.cancel}
          pending={remove.isPending}
          onClose={() => setToDelete(null)}
          onConfirm={() =>
            remove.mutate(toDelete, {
              onSuccess: () => {
                if (selectedId === toDelete) onSelect(null);
                setToDelete(null);
                notify(strings.common.saved);
              },
            })
          }
        />
      ) : null}
    </Panel>
  );
}

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
