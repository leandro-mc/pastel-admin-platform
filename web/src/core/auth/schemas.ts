import { z } from "zod";

/** Contratos de `/api/auth/*` (módulo Identity). Los nombres de campo no cambian respecto de la API. */
export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  isActive: z.boolean(),
  mustChangePassword: z.boolean(),
  accessFailedCount: z.number(),
  lockoutEnd: z.string().nullable(),
  createdAt: z.string(),
  roles: z.array(z.string()),
});

export const profileSchema = z.object({
  user: userSchema,
  permissions: z.array(z.string()),
});

/** Respuesta de login, registro y refresco. */
export const sessionSchema = z.object({
  user: userSchema,
  accessTokenExpiresAt: z.string(),
});

export const authOptionsSchema = z.object({
  google: z.boolean(),
  localLogin: z.boolean(),
  localRegistration: z.boolean(),
  passwordPolicy: z.object({
    minLength: z.number(),
    maxLength: z.number(),
    description: z.string(),
  }),
});

export type User = z.infer<typeof userSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type AuthOptions = z.infer<typeof authOptionsSchema>;

export const authKeys = {
  me: ["auth", "me"] as const,
  options: ["auth", "options"] as const,
};
