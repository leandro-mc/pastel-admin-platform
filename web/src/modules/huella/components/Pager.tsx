import { Button } from "@/core/ui";
import type { Paging } from "../lib/usePaging";
import { strings } from "../strings";

const t = strings.common.pager;

/** «Mostrando 1–5 de 12» con anterior y siguiente. No se dibuja si todo cabe en una página. */
export function Pager<T>({ paging }: { paging: Paging<T> }) {
  if (paging.total === 0) return null;
  return (
    <nav
      aria-label={t.label}
      className="flex flex-wrap items-center justify-between gap-2 pt-1"
    >
      <p className="text-sm text-muted" aria-live="polite">
        {t.range(paging.from, paging.to, paging.total)}
        {paging.pages > 1 ? ` · ${t.page(paging.page + 1, paging.pages)}` : ""}
      </p>
      {paging.pages > 1 ? (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            type="button"
            disabled={paging.page === 0}
            onClick={() => paging.setPage(paging.page - 1)}
          >
            {t.prev}
          </Button>
          <Button
            variant="secondary"
            type="button"
            disabled={paging.page >= paging.pages - 1}
            onClick={() => paging.setPage(paging.page + 1)}
          >
            {t.next}
          </Button>
        </div>
      ) : null}
    </nav>
  );
}
