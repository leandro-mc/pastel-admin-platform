import { inputClass } from "../styles";

/** Clases de las tablas y filtros de Configuración. Pasan a componentes del kit de UI en WP8. */
export const panel = "rounded-2xl border border-line bg-surface shadow-sm";
export const tableScroll = "overflow-x-auto";
export const table = "w-full min-w-[40rem] border-collapse text-left text-sm";
export const th =
  "border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted";
export const td = "border-b border-line px-4 py-3 align-middle text-fg";
export const mutedCell = "px-4 py-3 text-muted border-b border-line";
export const chip =
  "inline-flex rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-strong";
export const chipNeutral =
  "inline-flex rounded-full bg-app px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-line";
export const chipDanger =
  "inline-flex rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-medium text-danger";
export const selectClass = `${inputClass} appearance-auto`;
export const iconButton =
  "inline-flex size-11 items-center justify-center rounded-xl text-fg hover:bg-accent-soft focus-visible:ring-3 focus-visible:ring-accent-strong/45 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60";
