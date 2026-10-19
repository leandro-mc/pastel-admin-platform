import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/core/api";
import {
  identityKeys,
  toQuery,
  type AuditFilters,
  type UserFilters,
} from "./keys";
import {
  auditEntrySchema,
  moduleSchema,
  pageSchema,
  permissionSchema,
  roleSchema,
  userPermissionSchema,
  userSchema,
} from "./schemas";

type Gate = { enabled?: boolean };

const usersPage = pageSchema(userSchema);
const auditPage = pageSchema(auditEntrySchema);

/** Lista paginada y filtrada en el servidor. Conserva la página anterior mientras carga la nueva. */
export function useUsers(filters: UserFilters, { enabled = true }: Gate = {}) {
  return useQuery({
    queryKey: identityKeys.users(filters),
    queryFn: ({ signal }) =>
      api.get(
        `/api/admin/users${toQuery({
          page: filters.page,
          pageSize: filters.pageSize,
          search: filters.search,
          role: filters.role,
          status: filters.status,
        })}`,
        usersPage,
        { signal },
      ),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useRoles({ enabled = true }: Gate = {}) {
  return useQuery({
    queryKey: identityKeys.roles,
    queryFn: ({ signal }) =>
      api.get("/api/admin/roles", z.array(roleSchema), { signal }),
    enabled,
  });
}

/** Catálogo de permisos (todos los módulos). */
export function usePermissionCatalog({ enabled = true }: Gate = {}) {
  return useQuery({
    queryKey: identityKeys.permissions,
    queryFn: ({ signal }) =>
      api.get("/api/admin/permissions", z.array(permissionSchema), { signal }),
    enabled,
  });
}

export function useModules({ enabled = true }: Gate = {}) {
  return useQuery({
    queryKey: identityKeys.modules,
    queryFn: ({ signal }) =>
      api.get("/api/admin/modules", z.array(moduleSchema), { signal }),
    enabled,
  });
}

/** Excepciones individuales de una persona. La API responde 409 si es administradora (no admite excepciones). */
export function useUserPermissions(
  userId: string,
  { enabled = true }: Gate = {},
) {
  return useQuery({
    queryKey: identityKeys.userPermissions(userId),
    queryFn: ({ signal }) =>
      api.get(
        `/api/admin/users/${userId}/permissions`,
        z.array(userPermissionSchema),
        { signal },
      ),
    enabled,
    retry: false,
  });
}

export function useAudit(filters: AuditFilters, { enabled = true }: Gate = {}) {
  return useQuery({
    queryKey: identityKeys.audit(filters),
    queryFn: ({ signal }) =>
      api.get(
        `/api/admin/audit${toQuery({
          page: filters.page,
          pageSize: filters.pageSize,
          action: filters.action,
          module: filters.module,
          actor: filters.actor,
          targetUserId: filters.targetUserId,
          from: filters.from,
          to: filters.to,
        })}`,
        auditPage,
        { signal },
      ),
    placeholderData: keepPreviousData,
    enabled,
  });
}
