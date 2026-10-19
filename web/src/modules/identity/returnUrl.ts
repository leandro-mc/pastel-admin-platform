import { routes } from "@/core/routes";

/**
 * Solo se vuelve a rutas internas. El servidor valida de nuevo (`returnUrl` seguro); esta copia evita
 * que la propia página navegue a una dirección externa o con trucos como `//` o `/\`.
 */
export function safeReturnUrl(value: string | null): string {
  if (!value) return routes.home;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return routes.home;
  }
  const internal = (text: string) =>
    text.startsWith("/") &&
    !text.startsWith("//") &&
    !text.startsWith("/\\") &&
    !text.includes("\\");
  return internal(value) && internal(decoded) ? value : routes.home;
}
