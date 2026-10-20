import { useId, type ReactNode } from "react";
import { panelClass } from "./styles";

type PanelProps = {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  headingLevel?: "h2" | "h3";
};

/** Panel con encabezado opcional, descripción y acciones alineadas. */
export function Panel({
  title,
  description,
  actions,
  children,
  className = "",
  headingLevel = "h2",
}: PanelProps) {
  const titleId = useId();
  const Heading = headingLevel;
  const hasHeader = title != null || description != null || actions != null;
  return (
    <section
      className={`${panelClass} ${className}`.trim()}
      aria-labelledby={title != null ? titleId : undefined}
    >
      {hasHeader ? (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title != null ? <Heading id={titleId} className="text-lg font-semibold text-fg">{title}</Heading> : null}
            {description != null ? <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      {children}
    </section>
  );
}
