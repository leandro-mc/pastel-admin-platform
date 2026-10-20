import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
  className?: string;
};

/** Encabezado principal de página con título, contexto opcional y acciones. */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className = "",
}: PageHeaderProps) {
  return (
    <header className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`.trim()}>
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent-strong">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
