export type UserFilters = {
  page: number;
  pageSize: number;
  search: string;
  role: string;
  status: string;
};

export type AuditFilters = {
  page: number;
  pageSize: number;
  action: string;
  module: string;
  actor: string;
  targetUserId: string;
  from: string;
  to: string;
};

/** Claves de TanStack Query de Identity. Invalidar `identityKeys.all` refresca todo el módulo. */
export const identityKeys = {
  all: ["identity"] as const,
  users: (filters: UserFilters) => ["identity", "users", filters] as const,
  usersAll: ["identity", "users"] as const,
  userPermissions: (userId: string) =>
    ["identity", "user-permissions", userId] as const,
  roles: ["identity", "roles"] as const,
  permissions: ["identity", "permissions"] as const,
  modules: ["identity", "modules"] as const,
  audit: (filters: AuditFilters) => ["identity", "audit", filters] as const,
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
