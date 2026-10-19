import { useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { RouterProvider } from "react-aria-components";
import { strings } from "../strings";
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
  return (
    <RouterProvider navigate={(to, options) => void navigate(to, options)}>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-fg focus:ring-2 focus:ring-accent-strong"
      >
        {strings.skipToContent}
      </a>
      <TopBar />
      <main
        id="contenido"
        className="min-h-[calc(100vh-3.5rem)] bg-app text-fg"
      >
        <Outlet />
      </main>
    </RouterProvider>
  );
}
