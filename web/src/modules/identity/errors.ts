import { isApiError } from "@/core/api";

export type ShownError = { message: string; traceId: string | undefined };

/**
 * Mensaje para mostrar en un formulario. Los errores esperables (4xx) usan el texto en español del servidor;
 * los inesperados (5xx) usan el texto del formulario y el código de soporte (`traceId`) para que se pueda rastrear.
 */
export function describeError(error: unknown, fallback: string): ShownError {
  if (!isApiError(error)) return { message: fallback, traceId: undefined };
  const unexpected = error.status >= 500 && !error.isNetwork;
  return {
    message: unexpected ? fallback : error.detail,
    traceId: error.traceId,
  };
}
