import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router";
import { strings } from "../strings";

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

/** Raíz de todas las rutas: enlace «Saltar al contenido» y región principal. El shell (barra, hub) se agrega dentro. */
export default function RootLayout() {
  useFocusHeadingOnNavigation();
  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-fg focus:ring-2 focus:ring-accent-strong"
      >
        {strings.skipToContent}
      </a>
      <main id="contenido" className="min-h-screen bg-app text-fg">
        <Outlet />
      </main>
    </>
  );
}
