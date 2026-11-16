export type ExpenseFilters = {
  page: number;
  q: string;
  payerId: string;
  from: string;
  to: string;
  order: string;
};

/** Todo lo de un grupo cuelga de `["balance", "groups", id, …]`: una mutación invalida el grupo completo. */
export const balanceKeys = {
  all: ["balance"] as const,
  currencies: ["balance", "currencies"] as const,
  groups: ["balance", "groups"] as const,
  groupList: () => ["balance", "groups", "list"] as const,
  group: (id: string) => ["balance", "groups", id] as const,
  detail: (id: string) => ["balance", "groups", id, "detail"] as const,
  participants: (id: string) => ["balance", "groups", id, "participants"] as const,
  invitation: (id: string) => ["balance", "groups", id, "invitation"] as const,
  balances: (id: string) => ["balance", "groups", id, "balances"] as const,
  settlement: (id: string) => ["balance", "groups", id, "settlement"] as const,
  expenses: (id: string, filters: ExpenseFilters) => ["balance", "groups", id, "expenses", filters] as const,
  sheet: (id: string) => ["balance", "groups", id, "sheet"] as const,
  history: (id: string, page: number) => ["balance", "groups", id, "history", page] as const,
};

export function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
