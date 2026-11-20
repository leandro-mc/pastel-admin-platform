import type { ReactNode } from "react";

export type BadgeVariant =
  "neutral" | "accent" | "info" | "success" | "warning" | "danger";
type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  showDot?: boolean;
  className?: string;
};

const variants: Record<BadgeVariant, string> = {
  // Neutro: dato informativo (contorno, sin relleno de color). El resto lleva el color de su estado (texto ≥ 4,5:1).
  neutral: "border-line-strong/60 bg-surface text-fg-secondary",
  accent: "border-transparent bg-accent-soft text-accent-strong",
  info: "border-info/30 bg-info-soft text-info",
  success: "border-success/30 bg-success-soft text-success",
  warning: "border-warning/40 bg-warning-soft text-warning",
  danger: "border-danger/40 bg-danger-soft text-danger",
};

/** Etiqueta de estado con texto legible; el significado no depende solo del color. */
export function Badge({
  children,
  variant = "neutral",
  showDot = false,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${variants[variant]} ${className}`.trim()}
    >
      {showDot ? (
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full bg-current"
        />
      ) : null}
      {children}
    </span>
  );
}
