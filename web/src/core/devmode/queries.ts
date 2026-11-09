import { useQuery } from "@tanstack/react-query";
import { api } from "@/core/api";
import { developerRolesSchema } from "./schemas";

export const devModeKeys = {
  roles: (app: string) => ["devmode", "roles", app] as const,
};

/** Roles de la aplicación activa. Solo se consulta con el modo habilitado; el servidor lo vuelve a exigir. */
export function useDeveloperRoles(app: string | null, enabled: boolean) {
  return useQuery({
    queryKey: devModeKeys.roles(app ?? ""),
    queryFn: ({ signal }) =>
      api.get(
        `/api/admin/developer/roles?app=${encodeURIComponent(app ?? "")}`,
        developerRolesSchema,
        { signal },
      ),
    enabled: enabled && app !== null,
    staleTime: 60_000,
  });
}
