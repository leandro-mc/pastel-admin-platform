/** Claves de TanStack Query de Brisa. Invalidar `brisaKeys.all` refresca todo el módulo. */
export const brisaKeys = {
  all: ["brisa"] as const,
  tasks: ["brisa", "tasks"] as const,
  settings: ["brisa", "settings"] as const,
  imports: ["brisa", "imports"] as const,
};

/** Arma `?a=1&b=2` omitiendo los valores vacíos. */
export function toQuery(
  params: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text.length > 0 ? `?${text}` : "";
}
