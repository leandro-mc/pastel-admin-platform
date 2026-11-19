/** Rutas del módulo (relativas a `/agora` en el manifiesto; absolutas aquí para los enlaces). */
export const agoraBase = "/agora";

export const agoraPaths = {
  home: agoraBase,
  explore: `${agoraBase}/explorar`,
  news: `${agoraBase}/actualidad`,
  saved: `${agoraBase}/guardados`,
  standards: `${agoraBase}/estandares`,
  article: (slug: string) => `${agoraBase}/p/${encodeURIComponent(slug)}`,

  editorial: `${agoraBase}/editorial`,
  editorialNew: `${agoraBase}/editorial/piezas/nueva`,
  editorialArticle: (id: string) => `${agoraBase}/editorial/piezas/${id}`,
  dailyPicks: `${agoraBase}/editorial/hoy`,
  review: `${agoraBase}/editorial/revision`,
  editorialNews: `${agoraBase}/editorial/actualidad`,
  reports: `${agoraBase}/editorial/errores`,
  organization: `${agoraBase}/editorial/organizacion`,
} as const;

export type ExploreFilters = {
  categoria?: string;
  serie?: string;
  etiqueta?: string;
  q?: string;
  pagina?: number;
};

/** Dirección de Explorar con los filtros dados (solo los que tienen valor). */
export function exploreUrl(filters: ExploreFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.categoria) params.set("categoria", filters.categoria);
  if (filters.serie) params.set("serie", filters.serie);
  if (filters.etiqueta) params.set("etiqueta", filters.etiqueta);
  if (filters.q) params.set("q", filters.q);
  if (filters.pagina && filters.pagina > 1)
    params.set("pagina", String(filters.pagina));
  const query = params.toString();
  return query ? `${agoraPaths.explore}?${query}` : agoraPaths.explore;
}

/** Enlace que se comparte: devuelve la vista previa (con el sello) y lleva a la pieza. */
export function shareUrl(slug: string, origin: string): string {
  return `${origin}/api/agora/share/${encodeURIComponent(slug)}`;
}
