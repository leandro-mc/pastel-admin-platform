import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

export const DEFAULT_PAGE_SIZE = 20;

type Defaults = Record<string, string>;

/**
 * Filtros y paginación en la URL (`?q=…&page=2`): se pueden compartir y sobreviven a recargar.
 * Cambiar un filtro vuelve a la página 1. Los valores iguales a su valor por defecto no se escriben.
 */
export function useUrlFilters<T extends Defaults>(defaults: T) {
  const [params, setParams] = useSearchParams();
  const values = useMemo(() => {
    const entries = Object.keys(defaults).map(
      (key) => [key, params.get(key) ?? defaults[key]] as const,
    );
    return Object.fromEntries(entries) as T;
  }, [params, defaults]);
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);

  const update = useCallback(
    (changes: Partial<T> & { page?: number }) => {
      const next = new URLSearchParams(params);
      for (const [key, value] of Object.entries(changes)) {
        if (key === "page") continue;
        if (value === undefined || value === "" || value === defaults[key]) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      }
      const targetPage = changes.page ?? 1;
      if (targetPage <= 1) next.delete("page");
      else next.set("page", String(targetPage));
      setParams(next, { replace: true });
    },
    [params, defaults, setParams],
  );

  const reset = useCallback(
    () => setParams(new URLSearchParams(), { replace: true }),
    [setParams],
  );

  return { values, page, update, reset };
}
