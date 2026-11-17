export {
  checkboxClass,
  dangerButton,
  errorAlert,
  ghostButton,
  inputClass,
  labelClass,
  linkButton,
  panelClass,
  primaryButton,
  secondaryButton,
  selectClass,
} from "@/core/ui/styles";

/** Clases de tablas del módulo (solo tokens del sistema de diseño). */
export const tableScroll = "overflow-x-auto";
export const table = "w-full min-w-[40rem] border-collapse text-left text-sm";
export const th =
  "border-b border-line px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted";
export const td = "border-b border-line px-3 py-3 align-middle text-fg";
export const tdNumber = `${td} text-right tabular-nums`;
export const thNumber = `${th} text-right`;
export const pageClass =
  "mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6";
export const statGrid = "grid gap-3 sm:grid-cols-2 lg:grid-cols-4";
