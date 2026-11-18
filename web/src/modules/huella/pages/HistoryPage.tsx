import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useNotify } from "@/core/notifications";
import { Badge, Button, PageHeader, Panel, SelectField, TextField } from "@/core/ui";
import { secondaryButton } from "@/core/ui/styles";
import {
  useLetters,
  useOffers,
  useUpdateTracking,
  useVersions,
} from "../api/hooks";
import type {
  LetterSummary,
  OfferStatus,
  OfferSummary,
  VersionSummary,
} from "../api/schemas";
import { offerStatusValues } from "../api/schemas";
import { ErrorNotice, Loaded, TextAreaField } from "../components/Form";
import { Pager } from "../components/Pager";
import { SearchField, fold } from "../components/SearchField";
import { StatusBadge } from "../components/StatusBadge";
import { formatDate, formatDateTime } from "../lib/format";
import { chipClass, pageCard } from "../lib/marker";
import { safeHref } from "../lib/safeHref";
import {
  documentsOf,
  followUpState,
  inDays,
  matchesStatus,
  needsFollowUp,
  toDateInput,
  type StatusFilter,
} from "../lib/tracking";
import { usePaging } from "../lib/usePaging";
import { strings } from "../strings";

const t = strings.history;
const PAGE = 6;

type Filter = StatusFilter | "followUp";
const filterKeys: readonly Filter[] = [
  "all",
  "saved",
  "applied",
  "interview",
  "offer",
  "closed",
  "followUp",
];

type SortKey = keyof typeof t.sorts;
const sortKeys = Object.keys(t.sorts) as SortKey[];

const statusRank = (s: OfferStatus) => offerStatusValues.indexOf(s);
const followUpKey = (o: OfferSummary) => o.followUpAt ?? "9999-12-31";

const comparators: Record<SortKey, (a: OfferSummary, b: OfferSummary) => number> = {
  recent: (a, b) => b.createdAt.localeCompare(a.createdAt),
  old: (a, b) => a.createdAt.localeCompare(b.createdAt),
  followUp: (a, b) => followUpKey(a).localeCompare(followUpKey(b)),
  status: (a, b) => statusRank(a.status) - statusRank(b.status) || b.createdAt.localeCompare(a.createdAt),
};

const matchesFilter = (offer: OfferSummary, filter: Filter) =>
  filter === "followUp" ? needsFollowUp(offer) : matchesStatus(offer.status, filter);

/**
 * Historial de postulaciones: cada oferta con su estado, lo que hay generado para ella y lo que ya se envió. Es el lugar
 * donde se actualiza cómo avanza cada proceso; los documentos se trabajan en «Crear CV».
 */
export function Component() {
  const offers = useOffers();
  const versions = useVersions();
  const letters = useLetters();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const list = offers.data ?? [];
    return Object.fromEntries(
      filterKeys.map((key) => [key, list.filter((o) => matchesFilter(o, key)).length]),
    ) as Record<Filter, number>;
  }, [offers.data]);

  const filtered = useMemo(() => {
    const q = fold(query.trim());
    return (offers.data ?? [])
      .filter((o) => matchesFilter(o, filter))
      .filter((o) => q === "" || fold(`${o.title} ${o.company ?? ""} ${o.notes}`).includes(q))
      .sort(comparators[sort]);
  }, [offers.data, filter, query, sort]);
  const paging = usePaging(filtered, `${query}|${filter}|${sort}`, PAGE);

  return (
    <div
      data-module="huella"
      className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 sm:p-6"
    >
      <PageHeader title={t.title} description={t.description} />

      <Loaded query={offers}>
        {(all) =>
          all.length === 0 ? (
            <Panel title={t.title}>
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-muted">{t.empty}</p>
                <Link to="/huella/cv" className={`${secondaryButton} no-underline`}>
                  {t.goStudio}
                </Link>
              </div>
            </Panel>
          ) : (
            <>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t.searchLabel}>
                {filterKeys.map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={filter === key}
                    onClick={() => setFilter(key)}
                    className={chipClass(filter === key)}
                  >
                    {filter === key ? <Check aria-hidden="true" className="size-4" /> : null}
                    {t.summary[key]}
                    <span className="rounded-full bg-surface/70 px-2 text-xs font-semibold text-fg ring-1 ring-line">{counts[key]}</span>
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_16rem]">
                <SearchField
                  label={t.searchLabel}
                  placeholder={t.searchPlaceholder}
                  value={query}
                  onChange={setQuery}
                />
                <SelectField
                  label={t.sort}
                  options={sortKeys.map((value) => ({ value, label: t.sorts[value] }))}
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                />
              </div>
              {paging.total === 0 ? (
                <p className="text-sm text-muted">{t.noMatch}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {paging.slice.map((offer) => (
                    <HistoryRow
                      key={offer.id}
                      offer={offer}
                      versions={versions.data ?? []}
                      letters={letters.data ?? []}
                    />
                  ))}
                </ul>
              )}
              <Pager paging={paging} />
            </>
          )
        }
      </Loaded>
    </div>
  );
}

function FollowUpBadge({ offer }: { offer: OfferSummary }) {
  const state = followUpState(offer.followUpAt);
  if (!state || !(offer.status === "applied" || offer.status === "interview")) return null;
  const label =
    state.kind === "overdue"
      ? t.followUp.overdue(state.days)
      : state.kind === "today"
        ? t.followUp.today
        : t.followUp.soon(state.days);
  return <Badge variant={state.kind === "soon" ? "neutral" : "danger"}>{label}</Badge>;
}

function HistoryRow({
  offer,
  versions,
  letters,
}: {
  offer: OfferSummary;
  versions: readonly VersionSummary[];
  letters: readonly LetterSummary[];
}) {
  const [open, setOpen] = useState(false);
  const { docs, sent } = documentsOf(offer.id, versions, letters);
  const sentDocs = docs.filter((d) => d.sentAt !== null);
  const url = offer.sourceUrl ? safeHref(offer.sourceUrl) : null;
  const target = `/huella/cv?oferta=${offer.id}`;
  return (
    <li className={`flex flex-col gap-3 rounded-xl border p-4 ${pageCard}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold break-words text-fg">{offer.title}</h2>
          {offer.company ? <p className="text-sm text-fg-secondary">{offer.company}</p> : null}
          <p className="text-sm text-muted">
            {t.savedOn} <time dateTime={offer.createdAt}>{formatDate(offer.createdAt)}</time>
            {offer.appliedAt ? (
              <>
                {" · "}
                {t.appliedOn} <time dateTime={offer.appliedAt}>{formatDate(offer.appliedAt)}</time>
              </>
            ) : null}
          </p>
        </div>
        <StatusBadge status={offer.status} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <FollowUpBadge offer={offer} />
        {offer.coverage.total > 0 ? (
          <Badge variant={offer.coverage.covered === offer.coverage.total ? "success" : "warning"}>
            {strings.studio.offers.coverage(offer.coverage.covered, offer.coverage.total)}
          </Badge>
        ) : null}
        {docs.length === 0 ? (
          <span className="text-muted">{t.noDocs}</span>
        ) : (
          <span className="text-muted">
            {[sent > 0 ? t.docsSent(sent) : null, docs.length - sent > 0 ? t.docsReady(docs.length - sent) : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
      </div>

      {sentDocs.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm text-fg-secondary">
          {sentDocs.map((d) => (
            <li key={d.id}>
              <span className="font-medium text-fg">{d.name}</span> ·{" "}
              {d.kind === "cv" ? strings.studio.docs.cvKind : strings.studio.docs.letterKind} · {d.language.toUpperCase()} ·{" "}
              {formatDateTime(d.sentAt ?? d.createdAt)}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="tonal" type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? t.hideDetails : t.details}
        </Button>
        <Link to={`${target}&vista=documentos`} className={`${secondaryButton} no-underline`}>
          {t.openDocs}
        </Link>
        <Link to={`${target}&vista=generar`} className={`${secondaryButton} no-underline`}>
          {t.generate}
        </Link>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className={`${secondaryButton} no-underline`}>
            {t.viewOffer}
          </a>
        ) : null}
      </div>

      {open ? <TrackingEditor key={`${offer.id}-${offer.status}-${offer.followUpAt}-${offer.appliedAt}`} offer={offer} /> : null}
    </li>
  );
}

/** Estado, fechas y notas de una oferta. Al pasar a «postulada» propone la fecha de hoy y un seguimiento a 7 días. */
function TrackingEditor({ offer }: { offer: OfferSummary }) {
  const notify = useNotify();
  const update = useUpdateTracking();
  const [status, setStatus] = useState<OfferStatus>(offer.status);
  const [appliedAt, setAppliedAt] = useState(toDateInput(offer.appliedAt));
  const [followUpAt, setFollowUpAt] = useState(offer.followUpAt ?? "");
  const [notes, setNotes] = useState(offer.notes);

  const changeStatus = (next: OfferStatus) => {
    setStatus(next);
    if (next === "saved") {
      setAppliedAt("");
      return;
    }
    if (next !== "discarded" && appliedAt === "") setAppliedAt(inDays(0));
    if (next === "applied" && followUpAt === "") setFollowUpAt(inDays(7));
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-surface-raised p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label={t.status}
          options={offerStatusValues.map((value) => ({
            value,
            label: strings.studio.status[value],
          }))}
          value={status}
          onChange={(e) => changeStatus(e.target.value as OfferStatus)}
        />
        <TextField
          type="date"
          label={t.appliedAt}
          value={appliedAt}
          disabled={status === "saved"}
          onChange={(e) => setAppliedAt(e.target.value)}
        />
        <TextField
          type="date"
          label={t.followUpAt}
          hint={t.followUpHint}
          value={followUpAt}
          onChange={(e) => setFollowUpAt(e.target.value)}
        />
      </div>
      <TextAreaField
        label={t.notes}
        hint={t.notesHint}
        rows={3}
        maxLength={1000}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div>
        <Button
          variant="primary"
          type="button"
          loading={update.isPending}
          loadingLabel={strings.common.saving}
          onClick={() =>
            update.mutate(
              {
                id: offer.id,
                body: {
                  status,
                  appliedAt: appliedAt ? new Date(`${appliedAt}T12:00:00`).toISOString() : null,
                  followUpAt: followUpAt || null,
                  notes,
                },
              },
              { onSuccess: () => notify(t.saved) },
            )
          }
        >
          {t.save}
        </Button>
      </div>
      <ErrorNotice error={update.error} />
    </div>
  );
}
