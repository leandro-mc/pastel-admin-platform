export type ArticleFilters = {
  category: string;
  series: string;
  tag: string;
  q: string;
  page: number;
};

export type EditorialFilters = { status: string; q: string; page: number };

/** Claves de TanStack Query de Ágora. Invalidar `agoraKeys.all` refresca todo el módulo. */
export const agoraKeys = {
  all: ["agora"] as const,
  home: ["agora", "home"] as const,
  taxonomy: ["agora", "taxonomy"] as const,
  articles: (filters: ArticleFilters) =>
    ["agora", "articles", filters] as const,
  article: (slug: string) => ["agora", "article", slug] as const,
  viewer: (slug: string) => ["agora", "viewer", slug] as const,
  news: (topic: string, page: number) =>
    ["agora", "news", topic, page] as const,
  saved: (page: number) => ["agora", "saved", page] as const,
  followed: ["agora", "followed"] as const,

  editorialArticles: (filters: EditorialFilters) =>
    ["agora", "editorial", "articles", filters] as const,
  editorialArticle: (id: string) =>
    ["agora", "editorial", "article", id] as const,
  editorialTaxonomy: ["agora", "editorial", "taxonomy"] as const,
  dailyPicks: ["agora", "editorial", "daily-picks"] as const,
  reviewQueue: (page: number) =>
    ["agora", "editorial", "review", page] as const,
  reviewVerifications: (page: number) =>
    ["agora", "editorial", "review-verifications", page] as const,
  errorReports: (status: string, page: number) =>
    ["agora", "editorial", "error-reports", status, page] as const,
};

/** Cadena de consulta con solo los valores que existen. */
export function toQuery(
  values: Record<string, string | number | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === "" || value === 0) continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}
