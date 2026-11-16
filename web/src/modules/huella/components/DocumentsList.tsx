import { useMemo, useState } from "react";
import { useNotify } from "@/core/notifications";
import { Badge, Button, ConfirmDialog, Panel, SelectField } from "@/core/ui";
import {
  useDeleteVersion,
  useOffers,
  useSetSentVersion,
  useVersions,
} from "../api/hooks";
import { formatDateTime } from "../lib/format";
import { usePaging } from "../lib/usePaging";
import { strings } from "../strings";
import { ErrorNotice, Loaded } from "./Form";
import { Pager } from "./Pager";
import { SearchField, fold } from "./SearchField";

const t = strings.studio.docs;
const v = strings.studio.versions;

type SortKey = keyof typeof t.sorts;
const sortKeys = Object.keys(t.sorts) as SortKey[];
type SentFilter = keyof typeof t.sentFilters;
const sentKeys = Object.keys(t.sentFilters) as SentFilter[];

type Doc = {
  kind: "cv";
  id: string;
  name: string;
  offerId: string | null;
  createdAt: string;
  sentAt: string | null;
  meta: string;
  source: string;
};

type Props = {
  /** Oferta seleccionada: por defecto solo se listan sus documentos. */
  offerId: string | null;
  onOpen: (id: string) => void;
  onDeleted: (id: string) => void;
};

/** Documentos generados: buscador, filtros (envío, oferta), orden y páginas de 5. Cada tarjeta dice de qué oferta es y si se envió. */
export function DocumentsList({ offerId, onOpen, onDeleted }: Props) {
  const notify = useNotify();
  const versions = useVersions();
  const offers = useOffers();
  const sent = useSetSentVersion();
  const remove = useDeleteVersion();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [sentFilter, setSentFilter] = useState<SentFilter>("all");
  const [showAll, setShowAll] = useState(false);
  const [toDelete, setToDelete] = useState<Doc | null>(null);

  const offerById = useMemo(
    () => new Map((offers.data ?? []).map((offer) => [offer.id, offer])),
    [offers.data],
  );
  const scoped = offerId !== null && !showAll;

  const docs = useMemo<Doc[]>(
    () =>
      (versions.data ?? []).map((item) => ({
        kind: "cv" as const,
        id: item.id,
        name: item.name,
        offerId: item.offerId,
        createdAt: item.createdAt,
        sentAt: item.sentAt,
        meta: [
          item.language.toUpperCase(),
          strings.studio.generate.levels[item.level as "junior" | "mid" | "senior"] ?? item.level,
          t.pagesShort(item.pages),
        ].join(" · "),
        source: strings.studio.versions.source[item.source as "rules" | "manual" | "ai"] ?? item.source,
      })),
    [versions.data],
  );

  const filtered = useMemo(() => {
    const q = fold(query.trim());
    return docs
      .filter((d) => !scoped || d.offerId === offerId)
      .filter((d) => sentFilter === "all" || (sentFilter === "sent") === (d.sentAt !== null))
      .filter((d) => {
        if (q === "") return true;
        const offer = d.offerId ? offerById.get(d.offerId) : undefined;
        return fold(`${d.name} ${offer?.title ?? ""} ${offer?.company ?? ""}`).includes(q);
      })
      .sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name, "es")
          : sort === "old"
            ? a.createdAt.localeCompare(b.createdAt)
            : b.createdAt.localeCompare(a.createdAt),
      );
  }, [docs, scoped, offerId, sentFilter, query, sort, offerById]);
  const paging = usePaging(filtered, `${query}|${sentFilter}|${sort}|${scoped}|${offerId}`);
  const scopeOffer = offerId ? offerById.get(offerId) : undefined;

  return (
    <Panel title={t.title}>
      <div className="flex flex-col gap-4">
        {scoped ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-accent-soft px-3 py-2 text-sm">
            <span className="font-medium text-fg">
              {t.onlyOffer(scopeOffer?.title ?? "…")}
            </span>
            <Button variant="link" type="button" onClick={() => setShowAll(true)}>
              {t.showAll}
            </Button>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem_12rem]">
          <SearchField
            label={t.searchLabel}
            placeholder={t.searchPlaceholder}
            value={query}
            onChange={setQuery}
          />
          <SelectField
            label={t.sentFilter}
            options={sentKeys.map((value) => ({ value, label: t.sentFilters[value] }))}
            value={sentFilter}
            onChange={(e) => setSentFilter(e.target.value as SentFilter)}
          />
          <SelectField
            label={t.sort}
            options={sortKeys.map((value) => ({ value, label: t.sorts[value] }))}
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          />
        </div>

        <Loaded query={versions}>
          {(all) =>
            all.length === 0 ? (
              <p className="text-sm text-muted">{t.none}</p>
            ) : paging.total === 0 ? (
              <p className="text-sm text-muted">{t.noMatch}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {paging.slice.map((doc) => {
                  const offer = doc.offerId ? offerById.get(doc.offerId) : undefined;
                  return (
                    <li key={doc.id} className="flex flex-col gap-3 rounded-xl border border-line p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2">
                            <Badge variant="neutral">{t.cvKind}</Badge>
                            <span className="text-base font-semibold break-words text-fg">
                              {doc.name}
                            </span>
                          </p>
                          <p className="text-sm text-fg-secondary">
                            {t.forOffer}:{" "}
                            {offer ? `${offer.title}${offer.company ? ` · ${offer.company}` : ""}` : t.general}
                          </p>
                          <p className="text-sm text-muted">
                            {doc.meta} · {doc.source}
                          </p>
                          <p className="text-sm text-muted">
                            {v.createdAt}{" "}
                            <time dateTime={doc.createdAt}>{formatDateTime(doc.createdAt)}</time>
                          </p>
                        </div>
                        {doc.sentAt ? (
                          <Badge variant="success">
                            {t.sentOn} {formatDateTime(doc.sentAt)}
                          </Badge>
                        ) : (
                          <Badge variant="neutral">{t.unsent}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="primary" type="button" onClick={() => onOpen(doc.id)}>
                          {t.open}
                        </Button>
                        <Button
                          variant="secondary"
                          type="button"
                          loading={sent.isPending && sent.variables?.id === doc.id}
                          onClick={() =>
                            sent.mutate(
                              { id: doc.id, vars: doc.sentAt === null },
                              {
                                onSuccess: () =>
                                  notify(doc.sentAt === null ? t.markedSent : strings.common.saved),
                              },
                            )
                          }
                        >
                          {doc.sentAt ? t.unmarkSent : t.markSent}
                        </Button>
                        <Button
                          variant="ghost"
                          type="button"
                          aria-label={`${v.delete}: ${doc.name}`}
                          onClick={() => setToDelete(doc)}
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
        <ErrorNotice error={sent.error} />
        <Pager paging={paging} />
      </div>

      {toDelete ? (
        <ConfirmDialog
          title={v.deleteTitle}
          message={`«${toDelete.name}»: ${v.deleteMessage}`}
          confirmLabel={strings.common.delete}
          cancelLabel={strings.common.cancel}
          pending={remove.isPending}
          onClose={() => setToDelete(null)}
          onConfirm={() =>
            remove.mutate(toDelete.id, {
              onSuccess: () => {
                onDeleted(toDelete.id);
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
