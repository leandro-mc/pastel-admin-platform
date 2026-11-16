import { isApiError } from "@/core/api";
import { strings } from "../strings";

/** Texto para mostrar de un fallo de la API. El servidor ya responde en español con el motivo y a quién pedirlo. */
export function messageFor(error: unknown): string {
  if (!isApiError(error)) return strings.errors.generic;
  if (error.isNetwork) return strings.errors.network;
  if (error.isNotFound) return strings.errors.notFound;
  return error.detail || strings.errors.generic;
}

/** Primer mensaje de un campo, si el servidor devolvió errores de validación. */
export function fieldError(error: unknown, field: string): string | undefined {
  return isApiError(error) ? error.errors[field]?.[0] : undefined;
}
