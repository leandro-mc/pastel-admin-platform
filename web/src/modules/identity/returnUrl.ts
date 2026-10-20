import { routes } from "@/core/routes";

const knownFirstSegments = new Set([
  "inicio",
  "configuracion",
  "cuenta",
  "brisa",
  "balance",
  "agora",
  "cosecha",
  "huella",
]);

/**
 * Valida un retorno interno. Rechaza destinos externos, rutas dobles, backslashes
 * y la propia pantalla de login para evitar bucles de navegación.
 */
export function isSafeReturnUrl(value: string | null): value is string {
  if (!value) return false;

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return false;
  }

  const internal = (text: string) =>
    text.startsWith("/") &&
    !text.startsWith("//") &&
    !text.startsWith("/\\") &&
    !text.includes("\\");

  if (!internal(value) || !internal(decoded)) return false;

  const destination = (decoded.split(/[?#]/, 1)[0] || routes.home).replace(/\/+$/, "") || "/";
  if (destination.toLowerCase() === routes.login.toLowerCase()) return false;
  const firstSegment = destination.split("/").filter(Boolean)[0];
  if (firstSegment && !knownFirstSegments.has(firstSegment)) return false;

  return true;
}

/** Compatibilidad para los puntos que necesitan un destino interno de respaldo. */
export function safeReturnUrl(value: string | null): string {
  return isSafeReturnUrl(value) ? value : routes.home;
}
