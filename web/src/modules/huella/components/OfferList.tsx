import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import { useNotify } from "@/core/notifications";
import {
  Badge,
  Button,
  ConfirmDialog,
  Dialog,
  Panel,
  SelectField,
  TextField,
} from "@/core/ui";
import {
  useCreateOffer,
  useDeleteOffer,
  useEmails,
  useLetters,
  useOffer,
  useOffers,
  useVersions,
} from "../api/hooks";
import type { OfferSummary } from "../api/schemas";
import { formatDateTime } from "../lib/format";
import { markedBadge, markedSurface, nestedCard } from "../lib/marker";
import { safeHref } from "../lib/safeHref";
import {
  documentsOf,
  followUpState,
  matchesStatus,
  needsFollowUp,
  statusFilters,
  type StatusFilter,
} from "../lib/tracking";
import { usePaging } from "../lib/usePaging";
import { strings } from "../strings";
import { ErrorNotice, Loaded, TextAreaField, fieldError } from "./Form";
import { Pager } from "./Pager";
import { SearchField, fold } from "./SearchField";
import { StatusBadge } from "./StatusBadge";

const t = strings.studio.offers;
const o = strings.studio.offer;

type SortKey = keyof typeof t.sorts;
const sortKeys = Object.keys(t.sorts) as SortKey[];

const ratio = (offer: OfferSummary) =>
  offer.coverage.total === 0 ? -1 : offer.coverage.covered / offer.coverage.total;

const comparators: Record<SortKey, (a: OfferSummary, b: OfferSummary) => number> = {
  recent: (a, b) => b.createdAt.localeCompare(a.createdAt),
  old: (a, b) => a.createdAt.localeCompare(b.createdAt),
  name: (a, b) => a.title.localeCompare(b.title, "es"),
  match: (a, b) => ratio(b) - ratio(a) || b.createdAt.localeCompare(a.createdAt),
};

type Props = {
  selectedId: string | null;
  /** Elegir la oferta para generar documentos. */
  onUse: (id: string) => void;
  /** Elegir la oferta y ver sus documentos. */
  onDocuments: (id: string) => void;
  /** Se quitó la oferta seleccionada (o se eliminó). */
  onClear: () => void;
};

/** Ofertas guardadas: buscador, filtros por estado, orden y páginas de 5. Cada tarjeta dice qué hay hecho con esa oferta. */
export function OfferList({ selectedId, onUse, onDocuments, onClear }: Props) {
  const notify = useNotify();
  const offers = useOffers();
  const versions = useVersions();
  const letters = useLetters();
  const emails = useEmails();
  const remove = useDeleteOffer();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<OfferSummary | null>(null);
  const [reading, setReading] = useState<OfferSummary | null>(null);

  const filtered = useMemo(() => {
    const q = fold(query.trim());
    return (offers.data ?? [])
      .filter((offer) => matchesStatus(offer.status, status))
      .filter((offer) => q === "" || fold(`${offer.title} ${offer.company ?? ""}`).includes(q))
      .sort(comparators[sort]);
  }, [offers.data, query, status, sort]);
  const paging = usePaging(filtered, `${query}|${status}|${sort}`);

  return (
    <Panel
      title={strings.studio.tabs.offers}
      description={o.description}
      actions={
        <Button variant="primary" type="button" onClick={() => setCreating(true)}>
          {t.new}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem_12rem]">
          <SearchField
            label={t.searchLabel}
            placeholder={t.searchPlaceholder}
            value={query}
            onChange={setQuery}
          />
          <SelectField
            label={t.statusFilter}
            options={statusFilters.map((value) => ({
              value,
              label: t.statusFilters[value],
            }))}
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          />
          <SelectField
            label={t.sort}
            options={sortKeys.map((value) => ({ value, label: t.sorts[value] }))}
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          />
        </div>

        <Loaded query={offers}>
          {(all) =>
            all.length === 0 ? (
              <p className="text-sm text-muted">{t.none}</p>
            ) : paging.total === 0 ? (
              <p className="text-sm text-muted">{t.noMatch}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {paging.slice.map((offer) => {
                  const { docs, sent } = documentsOf(offer.id, versions.data ?? [], letters.data ?? [], emails.data ?? []);
                  const follow = needsFollowUp(offer) ? followUpState(offer.followUpAt) : null;
                  const isSelected = selectedId === offer.id;
                  return (
                    <li
                      key={offer.id}
                      className={`flex flex-col gap-3 rounded-xl border p-4 ${isSelected ? markedSurface : nestedCard}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold break-words text-fg">
                            {offer.title}
                          </h3>
                          {offer.company ? (
                            <p className="text-sm text-fg-secondary">{offer.company}</p>
                          ) : null}
                          <p className="text-sm text-muted">
                            {t.savedOn}{" "}
                            <time dateTime={offer.createdAt}>
                              {formatDateTime(offer.createdAt)}
                            </time>
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {isSelected ? (
                            <span className={markedBadge}>
                              <Check aria-hidden="true" className="size-3.5" />
                              {t.selected}
                            </span>
                          ) : null}
                          <StatusBadge status={offer.status} />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {offer.coverage.total > 0 ? (
                          <Badge
                            variant={
                              offer.coverage.covered === offer.coverage.total
                                ? "success"
                                : offer.coverage.covered === 0
                                  ? "danger"
                                  : "warning"
                            }
                          >
                            <span title={t.coverageTitle}>
                              {t.coverage(offer.coverage.covered, offer.coverage.total)}
                            </span>
                          </Badge>
                        ) : null}
                        <span className="text-muted">{t.docCount(docs.length, sent)}</span>
                        {follow ? (
                          <Badge variant="danger">
                            {follow.kind === "overdue"
                              ? strings.history.followUp.overdue(follow.days)
                              : strings.history.followUp.today}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="tonal"
                          type="button"
                          onClick={() => onUse(offer.id)}
                        >
                          {t.use}
                        </Button>
                        <Button
                          variant="secondary"
                          type="button"
                          onClick={() => onDocuments(offer.id)}
                        >
                          {t.documents}
                        </Button>
                        <Button
                          variant="secondary"
                          type="button"
                          aria-label={`${t.read}: ${offer.title}`}
                          onClick={() => setReading(offer)}
                        >
                          {t.read}
                        </Button>
                        <Button
                          variant="quietDanger"
                          type="button"
                          aria-label={`${o.delete}: ${offer.title}`}
                          onClick={() => setToDelete(offer)}
                        >
                          {strings.common.delete}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )
          }
        </Loaded>
        <Pager paging={paging} />
      </div>

      {reading ? (
        <OfferTextDialog offer={reading} onClose={() => setReading(null)} />
      ) : null}

      {creating ? (
        <NewOfferDialog
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            onUse(id);
          }}
        />
      ) : null}
      {toDelete ? (
        <ConfirmDialog
          title={o.deleteTitle}
          message={`«${toDelete.title}»: ${o.deleteMessage}`}
          confirmLabel={strings.common.delete}
          cancelLabel={strings.common.cancel}
          pending={remove.isPending}
          onClose={() => setToDelete(null)}
          onConfirm={() =>
            remove.mutate(toDelete.id, {
              onSuccess: () => {
                if (selectedId === toDelete.id) onClear();
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

/** Alta de una oferta: el texto pegado es solo un dato; se analiza contra el banco y queda en el historial. */
function NewOfferDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const create = useCreateOffer();
  const [rawText, setRawText] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  return (
    <Dialog
      title={t.new}
      description={t.newDescription}
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
    >
      <div className="flex flex-col gap-4">
        <TextAreaField
          label={o.text}
          rows={9}
          value={rawText}
          error={fieldError(create.error, "rawText")}
          onChange={(e) => setRawText(e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label={o.titleField}
            value={title}
            error={fieldError(create.error, "title")}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            label={o.company}
            value={company}
            error={fieldError(create.error, "company")}
            onChange={(e) => setCompany(e.target.value)}
          />
          <TextField
            label={o.url}
            value={sourceUrl}
            error={fieldError(create.error, "sourceUrl")}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
        </div>
        <ErrorNotice error={create.error} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            {strings.common.cancel}
          </Button>
          <Button
            variant="primary"
            type="button"
            disabled={rawText.trim() === ""}
            loading={create.isPending}
            loadingLabel={o.analyzing}
            onClick={() =>
              create.mutate(
                {
                  title: title || null,
                  company: company || null,
                  sourceUrl: sourceUrl || null,
                  rawText,
                },
                { onSuccess: (offer) => onCreated(offer.id) },
              )
            }
          >
            {o.analyze}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/** El texto original de la oferta, para leerlo cuando haga falta (con el enlace a la publicación si lo tiene). */
function OfferTextDialog({ offer, onClose }: { offer: OfferSummary; onClose: () => void }) {
  const detail = useOffer(offer.id);
  const href = offer.sourceUrl ? safeHref(offer.sourceUrl) : null;
  return (
    <Dialog
      title={offer.title}
      description={offer.company ?? undefined}
      onClose={onClose}
      maxWidthClassName="max-w-3xl"
    >
      <div className="flex flex-col gap-4">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-accent-strong underline-offset-4 hover:underline"
          >
            {t.openSource}
          </a>
        ) : null}
        <Loaded query={detail}>
          {(data) => (
            <div className="max-h-[65vh] overflow-y-auto rounded-xl border border-line bg-surface p-4 text-sm leading-relaxed whitespace-pre-wrap text-fg">
              {data.rawText}
            </div>
          )}
        </Loaded>
      </div>
    </Dialog>
  );
}
