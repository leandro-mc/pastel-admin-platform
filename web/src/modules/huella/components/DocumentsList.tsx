import { CircleCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useNotify } from "@/core/notifications";
import { Badge, Button, ConfirmDialog, Panel, SelectField } from "@/core/ui";
import { secondaryButton } from "@/core/ui/styles";
import {
  useDeleteLetter,
  useDeleteVersion,
  useLetters,
  useOffers,
  useSetSentLetter,
  useSetSentVersion,
  useVersions,
} from "../api/hooks";
import { formatDateTime } from "../lib/format";
import { nestedCard } from "../lib/marker";
import type { DocKind } from "../lib/studioState";
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
type TypeFilter = keyof typeof t.types;
const typeKeys = Object.keys(t.types) as TypeFilter[];

type Doc = {
  kind: "cv" | "letter";
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
  onOpen: (kind: DocKind, id: string) => void;
  onDeleted: (kind: DocKind, id: string) => void;
};

/**
 * Documentos generados (CV y cartas): buscador, filtros (tipo, envío, oferta), orden y páginas de 5. Cada tarjeta dice de qué
 * oferta es, de qué tipo y si se envió.
 */
export function DocumentsList({ offerId, onOpen, onDeleted }: Props) {
  const notify = useNotify();
  const versions = useVersions();
  const letters = useLetters();
  const offers = useOffers();
  const sentCv = useSetSentVersion();
  const sentLetter = useSetSentLetter();
  const removeCv = useDeleteVersion();
  const removeLetter = useDeleteLetter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [sentFilter, setSentFilter] = useState<SentFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [showAll, setShowAll] = useState(false);
  const [toDelete, setToDelete] = useState<Doc | null>(null);

  const offerById = useMemo(
    () => new Map((offers.data ?? []).map((offer) => [offer.id, offer])),
    [offers.data],
  );
  const scoped = offerId !== null && !showAll;

  const docs = useMemo<Doc[]>(
    () => [
      ...(versions.data ?? []).map((item) => ({
        kind: "cv" as const,
        id: item.id,
        name: item.name,
        offerId: item.offerId,
        createdAt: item.createdAt,
        sentAt: item.sentAt,
        meta: [
          item.language.toUpperCase(),
          item.format === "competencies"
            ? strings.studio.generate.competencies.badge
            : item.format === "combined"
              ? strings.studio.generate.combined.badge
              : null,
          strings.studio.generate.levels[item.level as "junior" | "mid" | "senior"] ?? item.level,
          t.pagesShort(item.pages),
        ]
          .filter(Boolean)
          .join(" · "),
        source: v.source[item.source as "rules" | "manual" | "ai"] ?? item.source,
      })),
      ...(letters.data ?? []).map((item) => ({
        kind: "letter" as const,
        id: item.id,
        name: item.name,
        offerId: item.offerId,
        createdAt: item.createdAt,
        sentAt: item.sentAt,
        meta: [
          item.language.toUpperCase(),
          strings.studio.letter.tones[item.tone as "formal" | "cercano"] ?? item.tone,
        ].join(" · "),
        source: v.source[item.source as "ai" | "manual"] ?? item.source,
      })),
    ],
    [versions.data, letters.data],
  );

  const filtered = useMemo(() => {
    const q = fold(query.trim());
    return docs
      .filter((d) => !scoped || d.offerId === offerId)
      .filter((d) => typeFilter === "all" || d.kind === typeFilter)
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
  }, [docs, scoped, offerId, typeFilter, sentFilter, query, sort, offerById]);
  const paging = usePaging(filtered, `${query}|${typeFilter}|${sentFilter}|${sort}|${scoped}|${offerId}`);
  const scopeOffer = offerId ? offerById.get(offerId) : undefined;

  const toggleSent = (doc: Doc) => {
    const options = {
      onSuccess: () => notify(doc.sentAt === null ? t.markedSent : strings.common.saved),
    };
    const vars = { id: doc.id, vars: doc.sentAt === null };
    if (doc.kind === "cv") sentCv.mutate(vars, options);
    else sentLetter.mutate(vars, options);
  };
  const sending = (doc: Doc) =>
    (doc.kind === "cv" ? sentCv : sentLetter).isPending &&
    (doc.kind === "cv" ? sentCv : sentLetter).variables?.id === doc.id;

  return (
    <Panel title={t.title}>
      <div className="flex flex-col gap-4">
        {scoped ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-accent-soft px-3 py-2 text-sm">
            <span className="font-medium text-fg">{t.onlyOffer(scopeOffer?.title ?? "…")}</span>
            <Button variant="link" type="button" onClick={() => setShowAll(true)}>
              {t.showAll}
            </Button>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_11rem_11rem_11rem]">
          <div className="sm:col-span-2 lg:col-span-1">
            <SearchField
              label={t.searchLabel}
              placeholder={t.searchPlaceholder}
              value={query}
              onChange={setQuery}
            />
          </div>
          <SelectField
            label={t.typeFilter}
            options={typeKeys.map((value) => ({ value, label: t.types[value] }))}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
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
          {() =>
            docs.length === 0 ? (
              <p className="text-sm text-muted">{t.none}</p>
            ) : paging.total === 0 ? (
              <p className="text-sm text-muted">{t.noMatch}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {paging.slice.map((doc) => {
                  const offer = doc.offerId ? offerById.get(doc.offerId) : undefined;
                  return (
                    <li key={`${doc.kind}-${doc.id}`} className={`flex flex-col gap-3 rounded-xl border p-4 ${nestedCard}`}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2">
                            <Badge variant={doc.kind === "cv" ? "neutral" : "accent"}>
                              {doc.kind === "cv" ? t.cvKind : t.letterKind}
                            </Badge>
                            <span className="text-base font-semibold break-words text-fg">{doc.name}</span>
                          </p>
                          <p className="text-sm text-fg-secondary">
                            {t.forOffer}:{" "}
                            {offer ? `${offer.title}${offer.company ? ` · ${offer.company}` : ""}` : t.general}
                          </p>
                          <p className="text-sm text-muted">
                            {doc.meta} · {doc.source}
                          </p>
                          <p className="text-sm text-muted">
                            {v.createdAt} <time dateTime={doc.createdAt}>{formatDateTime(doc.createdAt)}</time>
                          </p>
                        </div>
                        {doc.sentAt ? (
                          <Badge variant="success">
                            <CircleCheck aria-hidden="true" className="size-3.5" />
                            {t.sentOn} {formatDateTime(doc.sentAt)}
                          </Badge>
                        ) : (
                          <Badge variant="neutral">{t.unsent}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="tonal"
                          type="button"
                          onClick={() => onOpen(doc.kind === "cv" ? "cv" : "carta", doc.id)}
                        >
                          {t.open}
                        </Button>
                        <a
                          className={`${secondaryButton} no-underline`}
                          href={`/huella/pdf/${doc.kind === "cv" ? "cv" : "carta"}/${doc.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={strings.studio.preview.openPdfLabel(doc.name)}
                        >
                          {strings.studio.preview.openPdf}
                        </a>
                        <Button
                          variant="secondary"
                          type="button"
                          loading={sending(doc)}
                          onClick={() => toggleSent(doc)}
                        >
                          {doc.sentAt ? t.unmarkSent : t.markSent}
                        </Button>
                        <Button
                          variant="quietDanger"
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
        <ErrorNotice error={sentCv.error ?? sentLetter.error} />
        <Pager paging={paging} />
      </div>

      {toDelete ? (
        <ConfirmDialog
          title={v.deleteTitle}
          message={`«${toDelete.name}»: ${v.deleteMessage}`}
          confirmLabel={strings.common.delete}
          cancelLabel={strings.common.cancel}
          pending={removeCv.isPending || removeLetter.isPending}
          onClose={() => setToDelete(null)}
          onConfirm={() =>
            (toDelete.kind === "cv" ? removeCv : removeLetter).mutate(toDelete.id, {
              onSuccess: () => {
                onDeleted(toDelete.kind === "cv" ? "cv" : "carta", toDelete.id);
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
