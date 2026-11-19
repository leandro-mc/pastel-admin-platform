import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNotify } from "@/core/notifications";
import { Alert, Badge, Button, Panel, SelectField } from "@/core/ui";
import { useReplaceDailyPicks } from "../../api/mutations";
import { useDailyPicks, useEditorialArticles } from "../../api/queries";
import type { ArticleCard } from "../../api/schemas";
import { EditorialShell } from "../../components/EditorialShell";
import { LoadError, LoadingState } from "../../components/Feedback";
import { describeError } from "../../lib/format";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import { agoraPermissions } from "../../permissions";
import { strings } from "../../strings";

const MAX = 5;
const p = strings.editorial.picks;

/** «Hoy en 5 minutos»: el equipo elige, en orden, hasta 5 piezas publicadas. */
export function Component() {
  useDocumentTitle(strings.editorial.nav.picks);
  return (
    <EditorialShell
      permission={agoraPermissions.manage}
      title={strings.editorial.nav.picks}
      description={p.description}
    >
      <PicksLoader />
    </EditorialShell>
  );
}

function PicksLoader() {
  const current = useDailyPicks();
  const published = useEditorialArticles({ status: "published", q: "", page: 1 });

  if (current.isPending || published.isPending) return <LoadingState />;
  if (current.isError)
    return <LoadError error={current.error} onRetry={() => void current.refetch()} />;
  if (published.isError)
    return <LoadError error={published.error} onRetry={() => void published.refetch()} />;

  return (
    <PicksEditor
      key={current.data.map((card) => card.id).join(",")}
      initial={current.data}
      candidates={published.data.items.map((item) => item.card)}
    />
  );
}

function PicksEditor({
  initial,
  candidates,
}: {
  initial: ArticleCard[];
  candidates: ArticleCard[];
}) {
  const notify = useNotify();
  const replace = useReplaceDailyPicks();
  const [picks, setPicks] = useState<ArticleCard[]>(initial);
  const [toAdd, setToAdd] = useState("");

  const available = candidates.filter((card) => !picks.some((pick) => pick.id === card.id));
  const full = picks.length >= MAX;
  const dirty = picks.map((c) => c.id).join(",") !== initial.map((c) => c.id).join(",");

  const move = (index: number, delta: -1 | 1) =>
    setPicks((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });

  return (
    <Panel title={p.current}>
      <div className="flex flex-col gap-5">
        {picks.length === 0 ? <p className="text-fg-secondary">{p.empty}</p> : null}
        <ol className="flex flex-col gap-3">
          {picks.map((card, index) => (
            <li
              key={card.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Badge variant="accent">{index + 1}</Badge>
                <span className="font-semibold text-fg">{card.title}</span>
              </span>
              <span className="flex gap-1">
                <Button
                  variant="ghost"
                  aria-label={p.up(card.title)}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp aria-hidden="true" size={16} />
                </Button>
                <Button
                  variant="ghost"
                  aria-label={p.down(card.title)}
                  disabled={index === picks.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown aria-hidden="true" size={16} />
                </Button>
                <Button
                  variant="ghost"
                  aria-label={p.remove(card.title)}
                  onClick={() => setPicks((current) => current.filter((c) => c.id !== card.id))}
                >
                  <Trash2 aria-hidden="true" size={16} />
                </Button>
              </span>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <SelectField
              label={p.add}
              placeholder={p.addPlaceholder}
              value={toAdd}
              disabled={full || available.length === 0}
              hint={full ? p.full : available.length === 0 ? p.noneToAdd : undefined}
              options={available.map((card) => ({ value: card.id, label: card.title }))}
              onChange={(event) => setToAdd(event.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            disabled={toAdd === "" || full}
            onClick={() => {
              const card = available.find((c) => c.id === toAdd);
              if (card) setPicks((current) => [...current, card]);
              setToAdd("");
            }}
          >
            {strings.editorial.common.add}
          </Button>
        </div>

        {replace.isError ? <Alert variant="error" message={describeError(replace.error)} /> : null}
        <div>
          <Button
            loading={replace.isPending}
            loadingLabel={strings.editorial.common.saving}
            disabled={!dirty}
            onClick={() =>
              replace.mutate(
                picks.map((card) => card.id),
                { onSuccess: () => notify(p.saved) },
              )
            }
          >
            {p.save}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
