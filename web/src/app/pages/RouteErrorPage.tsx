import { useEffect } from "react";
import { isRouteErrorResponse, useRouteError } from "react-router";
import { OctagonAlert } from "lucide-react";
import { isApiError } from "@/core/api";
import { log } from "@/core/log";
import { strings } from "../strings";
import ForbiddenPage from "./ForbiddenPage";
import NotFoundPage from "./NotFoundPage";
import StatusPage from "./StatusPage";

/**
 * `errorElement` global y por ruta: un fallo en un módulo no derriba el shell ni a los demás módulos.
 * Errores de ruta 404 y de API 403/404 se traducen a sus páginas; lo inesperado se reporta y muestra el código de soporte.
 */
export default function RouteErrorPage() {
  const error = useRouteError();
  const notFound =
    (isRouteErrorResponse(error) && error.status === 404) ||
    (isApiError(error) && error.isNotFound);
  const forbidden =
    (isRouteErrorResponse(error) && error.status === 403) ||
    (isApiError(error) && error.isForbidden);
  const expected = notFound || forbidden;

  useEffect(() => {
    if (!expected) log.error("Error al mostrar una ruta", error);
  }, [error, expected]);

  if (notFound) return <NotFoundPage />;
  if (forbidden) return <ForbiddenPage />;
  return (
    <StatusPage
      icon={OctagonAlert}
      title={strings.error.title}
      message={strings.error.message}
      supportCode={isApiError(error) ? error.traceId : undefined}
      onRetry={() => window.location.reload()}
    />
  );
}

export { RouteErrorPage as Component };
