import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { api } from "@/core/api";
import { AuthContext, type AuthContextValue } from "./AuthProvider";
import { authKeys, authOptionsSchema } from "./schemas";

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth debe usarse dentro de AuthProvider.");
  return value;
}

/** Opciones públicas de acceso: Google, contraseña local, autorregistro y política de contraseña (fuente única). */
export function useAuthOptions() {
  return useQuery({
    queryKey: authKeys.options,
    queryFn: ({ signal }) =>
      api.get("/api/auth/options", authOptionsSchema, { signal }),
    staleTime: 5 * 60_000,
  });
}
