import { z } from "zod";
import { userSchema } from "@/core/auth/schemas";

/** Contratos de `/api/admin/*` (módulo Identity). Los nombres de campo no cambian respecto de la API. */
export { userSchema };
export type { User } from "@/core/auth/schemas";

export const permissionSchema = z.object({
  id: z.string(),
  moduleCode: z.string(),
  moduleName: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isSystemPermission: z.boolean(),
});

export const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isSystemRole: z.boolean(),
  permissionIds: z.array(z.string()),
  permissions: z.array(z.string()),
  userCount: z.number(),
});

export const moduleSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isEnabled: z.boolean(),
  sortOrder: z.number(),
  permissions: z.array(permissionSchema),
});

export const auditEntrySchema = z.object({
  id: z.number(),
  actorUserId: z.string().nullable(),
  actorEmail: z.string().nullable(),
  targetUserId: z.string().nullable(),
  action: z.string(),
  module: z.string(),
  target: z.string().nullable(),
  detailsJson: z.string().nullable(),
  ipAddress: z.string().nullable(),
  traceId: z.string().nullable(),
  createdAt: z.string(),
});

/** Página del servidor: `{ items, page, pageSize, totalCount }`. */
export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number(),
    pageSize: z.number(),
    totalCount: z.number(),
  });
}

/** Efecto de una excepción individual. «Inherit» solo existe en el formulario: no se envía. */
export const permissionEffectSchema = z.enum(["Grant", "Deny"]);

export const userPermissionSchema = z.object({
  permissionId: z.string(),
  permissionCode: z.string(),
  permissionName: z.string(),
  effect: permissionEffectSchema,
});

export const userRolesResultSchema = z.object({ roles: z.array(z.string()) });

export const resetPasswordResultSchema = z.object({
  temporaryPassword: z.string(),
  mustChangePassword: z.boolean(),
});

export type Permission = z.infer<typeof permissionSchema>;
export type Role = z.infer<typeof roleSchema>;
export type ModuleSummary = z.infer<typeof moduleSchema>;
export type AuditEntry = z.infer<typeof auditEntrySchema>;
export type UserPermission = z.infer<typeof userPermissionSchema>;
export type PermissionEffect = z.infer<typeof permissionEffectSchema>;
export type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
};
