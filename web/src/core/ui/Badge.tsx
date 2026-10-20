import type { ReactNode } from "react";

export type BadgeVariant = "neutral" | "accent" | "success" | "warning" | "danger";
type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  showDot?: boolean;
  className?: string;
};

const variants: Record<BadgeVariant, string> = {
  neutral: "border-line bg-surface-raised text-fg-secondary",
  accent: "border-transparent bg-accent-soft text-accent-strong",
  success: "border-line bg-accent-soft text-accent-strong",
  warning: "border-line-strong bg-surface-raised text-fg",
  danger: "border-danger bg-danger-soft text-danger",
};

/** Etiqueta de estado con texto legible; el significado no depende solo del color. */
export function Badge({ children, variant = "neutral", showDot = false, className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${variants[variant]} ${className}`.trim()}>
      {showDot ? <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
