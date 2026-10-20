import { useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { RouterProvider } from "react-aria-components";
import { useAuth } from "@/core/auth";
import { strings } from "../strings";
import { routes } from "../routes";
import { rememberCurrentApp, useAccessibleModules } from "../modules";
import AppFooter from "./AppFooter";
import TopBar from "../shell/TopBar";

/** Al cambiar de ruta el foco pasa al `h1` de la página (lectores de pantalla y teclado), no en la carga inicial. */
function useFocusHeadingOnNavigation(): void {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = window.requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>("main h1");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus({ preventScroll: false });
    });
    return () => window.cancelAnimationFrame(id);
  }, [pathname]);
}

/** Raíz de todas las rutas: «Saltar al contenido», barra superior y región principal. */
export default function RootLayout() {
  useFocusHeadingOnNavigation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { status, user } = useAuth();
  const availableModules = useAccessibleModules();
  const isStandaloneAuth = pathname === routes.login;
  const accessibleProductKey = availableModules
    .filter((module) => module.code !== "identity")
    .map((module) => module.basePath)
    .join("|");
  useEffect(() => {
    if (status === "authenticated" && user?.id) {
      rememberCurrentApp(pathname, user.id, accessibleProductKey.split("|").filter(Boolean));
    }
  }, [pathname, status, user?.id, accessibleProductKey]);
  return (
    <RouterProvider navigate={(to, options) => void navigate(to, options)}>
      <div className="flex min-h-screen flex-col">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-fg focus:ring-2 focus:ring-accent-strong"
      >
        {strings.skipToContent}
      </a>
      {isStandaloneAuth ? null : <TopBar />}
      <main id="contenido" className="flex-1 bg-app text-fg">
        <Outlet />
      </main>
      {isStandaloneAuth ? null : <AppFooter />}
      </div>
    </RouterProvider>
  );
}
