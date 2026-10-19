import { Link, useSearchParams } from "react-router";
import { secondaryButton } from "../styles";
import { settingsStrings } from "./strings";

const t = settingsStrings.common;

/** Paginación con enlaces: conserva los demás parámetros de la URL. */
export function Pager({
  page,
  pageSize,
  totalCount,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
}) {
  const [params] = useSearchParams();
  const pages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hrefFor = (target: number) => {
    const next = new URLSearchParams(params);
    if (target <= 1) next.delete("page");
    else next.set("page", String(target));
    const text = next.toString();
    return text ? `?${text}` : "?";
  };
  const disabled = "pointer-events-none opacity-50";

  return (
    <nav
      aria-label={t.page(page, pages)}
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
    >
      <p role="status" className="text-sm text-muted">
        {t.total(totalCount)} · {t.page(page, pages)}
      </p>
      <div className="flex gap-2">
        <Link
          to={hrefFor(page - 1)}
          replace
          aria-disabled={page <= 1}
          tabIndex={page <= 1 ? -1 : undefined}
          className={`${secondaryButton} ${page <= 1 ? disabled : ""}`}
        >
          {t.previous}
        </Link>
        <Link
          to={hrefFor(page + 1)}
          replace
          aria-disabled={page >= pages}
          tabIndex={page >= pages ? -1 : undefined}
          className={`${secondaryButton} ${page >= pages ? disabled : ""}`}
        >
          {t.next}
        </Link>
      </div>
    </nav>
  );
}
