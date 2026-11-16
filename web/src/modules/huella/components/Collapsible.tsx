import { ChevronDown } from "lucide-react";
import { useId, type ReactNode } from "react";
import { focusClass } from "@/core/ui/styles";

type Props = {
  /** Texto del encabezado; es lo único visible mientras el bloque está cerrado. */
  title: ReactNode;
  /** Controles que quedan visibles aunque el bloque esté cerrado (casilla de visibilidad, quitar…). */
  actions?: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  heading?: "h3" | "h4" | "h5";
  children: ReactNode;
};

/**
 * Bloque expandible: el encabezado es un botón con `aria-expanded` y los controles rápidos viven fuera de él, así no hay
 * controles interactivos anidados. El contenido solo se monta mientras está abierto (pantallas ligeras).
 */
export function Collapsible({
  title,
  actions,
  expanded,
  onToggle,
  heading: Heading = "h3",
  children,
}: Props) {
  const panelId = useId();
  return (
    <article className="rounded-xl border border-line">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-2 py-1">
        <Heading className="min-w-0 flex-1 text-base font-semibold text-fg">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={expanded ? panelId : undefined}
            onClick={onToggle}
            className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-1 text-left ${focusClass}`}
          >
            <ChevronDown
              aria-hidden="true"
              className={`size-4 shrink-0 text-muted transition-transform ${expanded ? "" : "-rotate-90"}`}
            />
            <span className="min-w-0 truncate">{title}</span>
          </button>
        </Heading>
        {actions ? (
          <div className="flex flex-wrap items-center gap-1">{actions}</div>
        ) : null}
      </div>
      {expanded ? (
        <div id={panelId} className="border-t border-line p-4">
          {children}
        </div>
      ) : null}
    </article>
  );
}
