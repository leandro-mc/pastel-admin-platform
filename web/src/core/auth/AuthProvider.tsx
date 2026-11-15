import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  isApiError,
  setSessionExpiredHandler,
  type ApiError,
} from "@/core/api";
import {
  authKeys,
  profileSchema,
  sessionSchema,
  type Profile,
  type Session,
  type User,
} from "./schemas";

export type AuthStatus = "loading" | "anonymous" | "authenticated" | "error";

export type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  permissions: ReadonlySet<string>;
  /** Error inesperado al consultar la sesión (no incluye «no ha iniciado sesión»). */
  error: ApiError | null;
  /** Verdadero si una sesión abierta venció y no se pudo renovar. */
  sessionExpired: boolean;
  hasPermission: (code: string) => boolean;
  login: (email: string, password: string) => Promise<Session>;
  register: (
    email: string,
    displayName: string,
    password: string,
  ) => Promise<Session>;
  logout: () => Promise<void>;
  /** Vuelve a consultar la sesión (tras cambios de roles o permisos, o para reintentar). */
  reload: () => Promise<void>;
  clearSessionExpired: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

const EMPTY: ReadonlySet<string> = new Set();

/** El 401 de «no hay sesión» es un resultado normal (`null`); cualquier otro fallo es un error. */
async function fetchProfile(signal: AbortSignal): Promise<Profile | null> {
  try {
    return await api.get("/api/auth/me", profileSchema, { signal });
  } catch (error) {
    if (isApiError(error) && error.isUnauthorized) return null;
    throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [sessionExpired, setSessionExpired] = useState(false);
  const wasAuthenticated = useRef(false);

  const query = useQuery({
    queryKey: authKeys.me,
    queryFn: ({ signal }) => fetchProfile(signal),
    staleTime: Infinity,
  });
  const profile = query.data ?? null;

  useEffect(() => {
    wasAuthenticated.current = profile !== null;
  }, [profile]);

  const dropSession = useCallback(() => {
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "auth" });
    queryClient.setQueryData(authKeys.me, null);
  }, [queryClient]);

  // El cliente API avisa cuando el refresco falla. Solo importa si había una sesión abierta:
  // la cookie es HttpOnly, y una persona anónima también provoca un 401 en /api/auth/me.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      if (!wasAuthenticated.current) return;
      wasAuthenticated.current = false;
      setSessionExpired(true);
      dropSession();
    });
    return () => setSessionExpiredHandler(null);
  }, [dropSession]);

  const reload = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: authKeys.me });
  }, [queryClient]);

  const startSession = useCallback(
    async (call: Promise<Session>) => {
      const session = await call;
      setSessionExpired(false);
      await reload();
      return session;
    },
    [reload],
  );

  const login = useCallback(
    (email: string, password: string) =>
      startSession(
        api.post("/api/auth/login", sessionSchema, { email, password }),
      ),
    [startSession],
  );

  const register = useCallback(
    (email: string, displayName: string, password: string) =>
      startSession(
        api.post("/api/auth/register", sessionSchema, {
          email,
          displayName,
          password,
        }),
      ),
    [startSession],
  );

  const logout = useCallback(async () => {
    try {
      await api.send("POST", "/api/auth/logout");
    } finally {
      // Aunque el servidor no responda, esta pestaña deja de mostrar datos de la sesión.
      wasAuthenticated.current = false;
      setSessionExpired(false);
      dropSession();
    }
  }, [dropSession]);

  const value = useMemo<AuthContextValue>(() => {
    const permissions = profile ? new Set(profile.permissions) : EMPTY;
    const status: AuthStatus = query.isPending
      ? "loading"
      : query.isError
        ? "error"
        : profile
          ? "authenticated"
          : "anonymous";
    return {
      status,
      user: profile?.user ?? null,
      permissions,
      error: isApiError(query.error) ? query.error : null,
      sessionExpired,
      hasPermission: (code) => permissions.has(code),
      login,
      register,
      logout,
      reload,
      clearSessionExpired: () => setSessionExpired(false),
    };
  }, [
    profile,
    query.isPending,
    query.isError,
    query.error,
    sessionExpired,
    login,
    register,
    logout,
    reload,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
