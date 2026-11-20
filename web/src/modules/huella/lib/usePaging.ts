import { useState } from "react";

/** Tamaño de página de las listas del estudio. */
export const PAGE_SIZE = 5;

/**
 * Paginación local de una lista ya filtrada y ordenada. `resetKey` cambia cuando cambian la búsqueda o los filtros: la
 * lista vuelve a la primera página en vez de quedar en una que ya no existe.
 */
export function usePaging<T>(
  items: readonly T[],
  resetKey: string,
  size: number = PAGE_SIZE,
) {
  const [state, setState] = useState({ page: 0, key: resetKey });
  if (state.key !== resetKey) setState({ page: 0, key: resetKey });
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(state.key === resetKey ? state.page : 0, pages - 1);
  const start = page * size;
  return {
    page,
    pages,
    total: items.length,
    from: items.length === 0 ? 0 : start + 1,
    to: Math.min(start + size, items.length),
    slice: items.slice(start, start + size),
    setPage: (next: number) =>
      setState({ page: Math.max(0, Math.min(next, pages - 1)), key: resetKey }),
  };
}

export type Paging<T> = ReturnType<typeof usePaging<T>>;
