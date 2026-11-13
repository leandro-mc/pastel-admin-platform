import { ChevronRight } from "lucide-react";
import { Link } from "react-aria-components";
import { shellStrings } from "../strings";
import type { Crumb } from "./navigation";

/** Migas reales de la ruta. La última es la página actual (texto, no enlace); sin migas no se dibuja nada. */
export default function Breadcrumbs({ trail }: { trail: readonly Crumb[] }) {
  if (trail.length === 0) return null;
  return (
    <nav aria-label={shellStrings.breadcrumbs} className="shell-crumbs min-w-0">
      <ol>
        {trail.map((crumb, index) => {
          const last = index === trail.length - 1;
          return (
            <li key={`${crumb.label}-${index}`}>
              {last || !crumb.to ? (
                <span aria-current={last ? "page" : undefined}>
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.to}>{crumb.label}</Link>
              )}
              {!last ? (
                <ChevronRight
                  aria-hidden="true"
                  className="shell-crumbs-sep size-4"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
