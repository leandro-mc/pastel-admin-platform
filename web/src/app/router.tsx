import { createBrowserRouter, type RouteObject } from "react-router";
import type {
  ModuleManifest,
  ModuleRoute,
  PlatformRoute,
} from "@/core/modules/types";
import RequireAuth from "./guards/RequireAuth";
import RequirePermission from "./guards/RequirePermission";
import ModuleLayout from "./layouts/ModuleLayout";
import RootLayout from "./layouts/RootLayout";
import { allModules } from "./modules";
import HubPage from "./pages/HubPage";
import LoadingScreen from "./pages/LoadingScreen";
import NotFoundPage from "./pages/NotFoundPage";
import RouteErrorPage from "./pages/RouteErrorPage";
import { routes } from "./routes";

/** Ruta de módulo del manifiesto → ruta de React Router (la miga de pan viaja en `handle`). */
function toRoute(route: ModuleRoute): RouteObject {
  const handle = route.crumb ? { crumb: route.crumb } : undefined;
  if (route.index) return { index: true, handle, lazy: route.lazy };
  return { path: route.path, handle, lazy: route.lazy };
}

/** Rutas de plataforma (absolutas) que aporta un módulo: públicas o con sesión. */
function toPlatformRoute(route: PlatformRoute): RouteObject {
  return { path: route.path, lazy: route.lazy };
}

/**
 * Permisos con los que se puede entrar al módulo. Denegar por defecto: un módulo de acceso `permission` sin ningún
 * permiso declarado no admite a nadie. El servidor autoriza igualmente cada operación.
 */
function permissionsOf(module: ModuleManifest): readonly string[] | null {
  if (module.access !== "permission") return null;
  if (module.requiredAnyPermission) return module.requiredAnyPermission;
  return module.requiredPermission ? [module.requiredPermission] : [];
}

/**
 * Árbol de un módulo. De afuera hacia adentro: sesión (si no es público) → permiso (si lo exige) → marco del módulo
 * con su miga raíz → `errorElement` propio, para que un fallo del módulo conserve su navegación y la barra del shell.
 * El comodín interno da 404 dentro del marco, pero solo a quien ya pasó las guardas (un anónimo va a `/ingresar`).
 */
function moduleRoute(module: ModuleManifest): RouteObject {
  const frame: RouteObject = {
    path: module.basePath,
    element: <ModuleLayout manifest={module} />,
    handle: { crumb: module.name },
    children: [
      {
        errorElement: <RouteErrorPage />,
        children: [
          ...module.routes.map(toRoute),
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  };

  const anyOf = permissionsOf(module);
  const guarded: RouteObject = anyOf
    ? { element: <RequirePermission anyOf={anyOf} />, children: [frame] }
    : frame;
  return module.access === "public"
    ? guarded
    : { element: <RequireAuth />, children: [guarded] };
}

const platformRoutes = allModules.flatMap((m) => m.platformRoutes ?? []);

/**
 * Router de la aplicación. Se arma solo con lo que declaran los manifiestos del paquete (`virtual:pastel-modules`):
 * quitar un módulo es quitar su carpeta. `/` es el hub; lo demás sin coincidencia es 404.
 */
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <LoadingScreen />,
    children: [
      {
        // Mantiene la barra del shell cuando falla una ruta (el `errorElement` raíz sustituye al layout completo).
        errorElement: <RouteErrorPage />,
        children: [
          { path: routes.home, element: <HubPage /> },
          ...platformRoutes.filter((r) => !r.session).map(toPlatformRoute),
          {
            element: <RequireAuth />,
            children: platformRoutes
              .filter((r) => r.session)
              .map(toPlatformRoute),
          },
          ...allModules.map(moduleRoute),
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
