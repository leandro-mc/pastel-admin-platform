import type { ReactNode } from "react";

/** Dato destacado (etiqueta y valor) para resúmenes. */
export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "warning" | "danger";
}) {
  const toneClass =
    tone === "danger" ? "text-danger" : tone === "warning" ? "text-fg" : "text-fg";
  return (
    <div className="rounded-xl border border-line bg-surface-raised px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
