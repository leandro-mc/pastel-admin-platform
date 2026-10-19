/** Clases comunes de los formularios de Identity. Pasan a componentes del kit de UI (`core/ui`) en WP8. */
const focus =
  "outline-none focus-visible:ring-3 focus-visible:ring-accent-strong/45";

export const labelClass = "text-sm font-medium text-fg";

export const inputClass = `min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-base text-fg placeholder:text-muted aria-[invalid=true]:border-danger ${focus}`;

export const primaryButton = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60 ${focus}`;

export const secondaryButton = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-medium text-fg hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60 ${focus}`;

export const linkButton = `min-h-11 rounded-lg px-2 text-sm font-medium text-accent-strong underline-offset-4 hover:underline ${focus}`;

export const card =
  "w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8";

export const errorAlert =
  "rounded-xl border border-danger bg-danger-soft px-4 py-3 text-sm text-fg";
