import { ApiError } from "@/core/api";
import { strings } from "../strings";

const dateFormat = new Intl.DateTimeFormat("es-CR", { dateStyle: "long" });

/** Fecha larga en español de Costa Rica a partir de un instante ISO. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : dateFormat.format(date);
}

/** Fecha sin hora (`2026-11-01`), sin desplazarla por la zona horaria. */
export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "";
  return dateFormat.format(new Date(year, month - 1, day));
}

/** Mensaje para mostrar de un error: el del servidor (ya en español) o uno genérico. */
export function describeError(error: unknown): string {
  return error instanceof ApiError && error.detail
    ? error.detail
    : strings.common.errorFallback;
}
