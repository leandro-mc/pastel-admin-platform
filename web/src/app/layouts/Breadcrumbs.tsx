import { Link, useMatches } from "react-router";
import { ChevronRight } from "lucide-react";
import { shellStrings } from "../strings";

/** Una ruta aporta su miga con `handle: { crumb: "Usuarios" }`. */
export type CrumbHandle = { crumb?: string };

export default function Breadcrumbs() {
  const crumbs = useMatches().flatMap((match) => {
    const crumb = (match.handle as CrumbHandle | undefined)?.crumb;
    return crumb ? [{ crumb, to: match.pathname, id: match.id }] : [];
  });
  if (crumbs.length < 2) return null;

  return (
    <nav
      aria-label={shellStrings.breadcrumbs}
      className="px-4 pt-4 text-sm text-muted"
    >
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((item, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={item.id} className="flex items-center gap-1">
              {last ? (
                <span aria-current="page" className="text-fg">
                  {item.crumb}
                </span>
              ) : (
                <Link
                  to={item.to}
                  className="underline-offset-2 hover:underline"
                >
                  {item.crumb}
                </Link>
              )}
              {last ? null : (
                <ChevronRight aria-hidden="true" className="size-4" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
