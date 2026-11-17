import { isApiError } from "@/core/api";
import { strings } from "../strings";

/**
 * Texto para la persona a partir de un error de la API. Los códigos `brisa.*` traen su mensaje en tuteo desde el servidor;
 * lo demás (red, errores inesperados) usa los textos de Brisa en lugar de los de la plataforma, que tratan de usted.
 */
export function brisaMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.code.startsWith("brisa.")) return error.detail;
    if (error.isNetwork) return strings.errors.network;
  }
  return strings.errors.generic;
}
