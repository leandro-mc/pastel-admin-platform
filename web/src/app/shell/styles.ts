/** Clases compartidas por los menús del shell (se convierten en componentes del kit de UI en WP8). */
export const focusRing =
  "outline-none data-[focus-visible]:ring-3 data-[focus-visible]:ring-accent-strong/45 focus-visible:ring-3 focus-visible:ring-accent-strong/45";

export const barButton = `inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium text-fg hover:bg-accent-soft ${focusRing}`;

export const popover =
  "min-w-56 rounded-xl border border-line bg-surface-raised p-1 text-fg shadow-lg";

export const menuItem = `flex min-h-11 cursor-default items-center justify-between gap-3 rounded-lg px-3 text-sm data-[focused]:bg-accent-soft ${focusRing}`;

export const menuHeader =
  "px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted";
