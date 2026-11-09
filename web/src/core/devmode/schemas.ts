import { z } from "zod";

/** `GET /api/admin/developer/roles?app=<código>`: definiciones de rol de una aplicación. */
export const developerRolesSchema = z.object({
  app: z.string(),
  appPermissions: z.array(z.string()),
  roles: z.array(
    z.object({
      name: z.string(),
      description: z.string().nullable(),
      isSystemRole: z.boolean(),
      permissions: z.array(z.string()),
    }),
  ),
});
export type DeveloperRoles = z.infer<typeof developerRolesSchema>;
