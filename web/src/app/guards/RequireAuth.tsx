import { Navigate, Outlet, useLocation } from "react-router";
import { OctagonAlert } from "lucide-react";
import { useAuth } from "@/core/auth";
import LoadingScreen from "../pages/LoadingScreen";
import StatusPage from "../pages/StatusPage";
import { loginPath, routes } from "../routes";
import { strings } from "../strings";

/**
 * Exige sesión. Anónimo: va a `/ingresar` con retorno a la ruta pedida (y «Su sesión venció» si había una abierta).
 * Contraseña temporal: solo se puede estar en la ruta de cambio obligatorio. La autorización real siempre es del servidor.
 */
export default function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "loading") return <LoadingScreen />;
  if (auth.status === "error") {
    return (
      <StatusPage
        icon={OctagonAlert}
        title={strings.sessionError.title}
        message={strings.sessionError.message}
        supportCode={auth.error?.traceId}
        onRetry={() => void auth.reload()}
        hideHome
      />
    );
  }
  if (auth.status === "anonymous") {
    return (
      <Navigate to={loginPath(location.pathname + location.search)} replace />
    );
  }
  if (auth.user?.mustChangePassword && location.pathname !== routes.password) {
    return <Navigate to={routes.password} replace />;
  }
  return <Outlet />;
}
