export const cosechaKeys = {
  all: ["cosecha"] as const,
  products: (includeInactive: boolean) =>
    ["cosecha", "products", includeInactive] as const,
  seasons: ["cosecha", "seasons"] as const,
  policy: ["cosecha", "policy"] as const,
  producers: (query: string) => ["cosecha", "producers", query] as const,
  producer: (id: string) => ["cosecha", "producer", id] as const,
  buyers: (query: string) => ["cosecha", "buyers", query] as const,
  buyer: (id: string) => ["cosecha", "buyer", id] as const,
  orders: (query: string) => ["cosecha", "orders", query] as const,
  order: (id: string) => ["cosecha", "order", id] as const,
  myOrders: (query: string) => ["cosecha", "my-orders", query] as const,
  myOrder: (id: string) => ["cosecha", "my-order", id] as const,
  shipments: (query: string) => ["cosecha", "shipments", query] as const,
  shipment: (id: string) => ["cosecha", "shipment", id] as const,
  candidates: (id: string) => ["cosecha", "candidates", id] as const,
  pendingOrders: (query: string) => ["cosecha", "pending-orders", query] as const,
  balances: (seasonId: string) => ["cosecha", "balances", seasonId] as const,
  statement: (producerId: string, seasonId: string) =>
    ["cosecha", "statement", producerId, seasonId] as const,
  report: (query: string) => ["cosecha", "report", query] as const,
  today: ["cosecha", "today"] as const,
};

/** Cadena de consulta sin los valores vacíos (`?a=1&b=2`, o cadena vacía). */
export function toQuery(
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
