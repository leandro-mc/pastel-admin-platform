/** Tokens y utilidades compartidas del kit de interfaz. */
export const focusClass =
  "outline-none focus-visible:ring-3 focus-visible:ring-accent-strong/45";

export const labelClass = "text-sm font-medium text-fg";

export const inputClass = `min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-base text-fg placeholder:text-muted aria-[invalid=true]:border-danger ${focusClass}`;

export const selectClass = `min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-base text-fg aria-[invalid=true]:border-danger ${focusClass}`;

export const checkboxClass =
  "size-5 shrink-0 accent-accent-strong focus-visible:ring-3 focus-visible:ring-accent-strong/45 focus-visible:outline-none";

export const primaryButton = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60 ${focusClass}`;

export const secondaryButton = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-medium text-fg hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60 ${focusClass}`;

export const dangerButton = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-danger bg-danger-soft px-4 text-sm font-semibold text-danger hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60 ${focusClass}`;

export const ghostButton = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium text-fg-secondary hover:bg-accent-soft hover:text-fg disabled:cursor-not-allowed disabled:opacity-60 ${focusClass}`;

export const linkButton = `inline-flex min-h-11 items-center justify-center rounded-lg px-2 text-sm font-medium text-accent-strong underline-offset-4 hover:underline ${focusClass}`;

export const iconButton = `inline-grid size-11 shrink-0 place-items-center rounded-xl text-fg-secondary hover:bg-accent-soft hover:text-fg ${focusClass}`;

export const panelClass =
  "rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6";

export const errorAlert =
  "rounded-xl border border-danger bg-danger-soft px-4 py-3 text-sm text-fg";
