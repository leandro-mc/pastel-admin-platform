// `AuthContext` se exporta únicamente para `core/devmode`, que entrega la vista previa por rol a `useAuth()`.
export { AuthContext, AuthProvider } from "./AuthProvider";
export type { AuthContextValue, AuthStatus } from "./AuthProvider";
export { useAuth, useAuthOptions } from "./useAuth";
export {
  authKeys,
  authOptionsSchema,
  profileSchema,
  sessionSchema,
  userSchema,
} from "./schemas";
export type { AuthOptions, Profile, Session, User } from "./schemas";
