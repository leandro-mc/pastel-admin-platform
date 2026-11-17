import { isApiError } from "@/core/api";

export type ShownError = { message: string; traceId: string | undefined };

/**
 * Mensaje para mostrar. Los errores esperables (4xx) usan el texto en español del servidor; los inesperados (5xx)
 * usan el texto de respaldo y el código de soporte (`traceId`) para poder rastrearlos.
 */
export function describeError(error: unknown, fallback: string): ShownError {
  if (!isApiError(error)) return { message: fallback, traceId: undefined };
  const unexpected = error.status >= 500 && !error.isNetwork;
  return {
    message: unexpected ? fallback : error.detail,
    traceId: error.traceId,
  };
}

/** Primer mensaje del servidor para un campo (por ejemplo `phones[0]` o `lines[0].kilograms`), o `undefined`. */
export function fieldMessage(error: unknown, field: string): string | undefined {
  return isApiError(error) ? error.errors[field]?.[0] : undefined;
}

export function isConflict(error: unknown): boolean {
  return isApiError(error) && error.isConflict;
}
