import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { isApiError } from "@/core/api";
import { log } from "@/core/log";

/**
 * Solo se reporta lo inesperado: 5xx, respuestas con formato inválido y errores de programación.
 * Validación, permisos, no encontrado, conflictos, límites y falta de red son parte del flujo normal.
 */
function reportUnexpected(error: unknown): void {
  if (isApiError(error)) {
    if (error.isUnexpected || error.code === "client.invalid_response") {
      log.error("Fallo inesperado de la API", error);
    }
    return;
  }
  if (error instanceof DOMException && error.name === "AbortError") return;
  log.error("Error no controlado en una consulta o acción", error);
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: reportUnexpected }),
    mutationCache: new MutationCache({ onError: reportUnexpected }),
    defaultOptions: {
      // core/api ya reintenta las lecturas idempotentes; no se duplica aquí.
      queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}
