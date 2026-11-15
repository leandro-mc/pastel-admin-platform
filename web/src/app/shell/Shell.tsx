import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useMatches, useNavigate } from "react-router";
import { RouterProvider } from "react-aria-components";
import { useAuth } from "@/core/auth";
import { useDevMode } from "@/core/devmode";
import {
  allModules,
  getRememberedAppPath,
  rememberCurrentApp,
  useAccessibleModules,
} from "../modules";
import { routes } from "../routes";
import { shellStrings, strings } from "../strings";
import BottomNav from "./BottomNav";
import Footer from "./Footer";
import { buildTrail, matchesPath, visibleNavItems } from "./navigation";
import { ShellContext } from "./ShellContext";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

const COLLAPSED_KEY = "pastel-sidebar-collapsed";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

/** Al navegar, el foco pasa al `h1` de la página nueva (la primera carga no lo mueve). */
function useFocusHeadingOnNavigation(): void {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = window.requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>("#contenido h1");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus({ preventScroll: false });
    });
    return () => window.cancelAnimationFrame(id);
  }, [pathname]);
}

const skipLinkClass =
  "sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-fg focus:ring-2 focus:ring-accent-strong";

/**
 * Marco compartido por todas las aplicaciones: barra lateral y barra superior en escritorio; control de app arriba y
 * navegación inferior en pantallas estrechas. No decide nada de una app concreta: lee su manifiesto y sus tokens
 * (`data-module`). Ver `docs/DESIGN_SYSTEM.md` §9.
 */
export default function Shell() {
  useFocusHeadingOnNavigation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const matches = useMatches();
  const { status, user, hasPermission } = useAuth();
  const dev = useDevMode();
  const available = useAccessibleModules();
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const accessibleProductPaths = available
    .filter((module) => module.code !== "identity")
    .map((module) => module.basePath);
  const accessibleProductKey = accessibleProductPaths.join("|");
  const rememberedAppPath = user?.id
    ? getRememberedAppPath(user.id, accessibleProductPaths)
    : null;

  const direct =
    available.find((m) => matchesPath(pathname, m.basePath)) ?? null;
  // En modo desarrollador la app de la ruta se identifica aunque la cuenta real no pueda entrar: ahí se elige el rol.
  const byRoute = dev.enabled
    ? (allModules.find((m) => matchesPath(pathname, m.basePath)) ?? null)
    : null;
  const isGlobalAccountRoute =
    pathname === routes.account || pathname === routes.password;
  const accountFallback = isGlobalAccountRoute
    ? (available.find((m) => m.basePath === rememberedAppPath) ??
      available.find((m) => m.code === "agora") ??
      null)
    : null;
  const currentModule = direct ?? byRoute ?? accountFallback;

  const items = currentModule
    ? visibleNavItems(currentModule, hasPermission)
    : [];
  const hasBottomNav = items.length >= 2;
  const trail = buildTrail({ pathname, module: currentModule, items, matches });
  const context = useMemo(
    () => ({ moduleCode: currentModule?.code }),
    [currentModule?.code],
  );

  useEffect(() => {
    // La app «recordada» es una preferencia real: una vista previa no la modifica.
    if (status === "authenticated" && user?.id && !dev.simulating) {
      rememberCurrentApp(
        pathname,
        user.id,
        accessibleProductKey.split("|").filter(Boolean),
      );
    }
  }, [pathname, status, user?.id, accessibleProductKey, dev.simulating]);

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSED_KEY, String(collapsed));
    } catch {
      // El shell sigue siendo funcional aunque el navegador no permita almacenar preferencias.
    }
  }, [collapsed]);

  if (pathname === routes.login) {
    return (
      <RouterProvider navigate={(to, options) => void navigate(to, options)}>
        <div className="min-h-screen">
          <a href="#contenido" className={skipLinkClass}>
            {strings.skipToContent}
          </a>
          <div id="contenido" className="min-h-screen">
            <Outlet />
          </div>
        </div>
      </RouterProvider>
    );
  }

  return (
    <RouterProvider navigate={(to, options) => void navigate(to, options)}>
      <ShellContext.Provider value={context}>
        <div
          className="shell"
          data-module={currentModule?.code}
          data-collapsed={collapsed || undefined}
          data-bottomnav={hasBottomNav || undefined}
        >
          <a href="#contenido" className={skipLinkClass}>
            {strings.skipToContent}
          </a>
          <aside
            className="shell-sidebar-wrap"
            aria-label={shellStrings.sidebar}
          >
            <Sidebar
              module={currentModule}
              collapsed={collapsed}
              onToggleCollapsed={() => setCollapsed((current) => !current)}
            />
          </aside>
          <div className="shell-main">
            <TopBar trail={trail} module={currentModule} />
            <main id="contenido" className="shell-content">
              <Outlet />
            </main>
            <Footer />
          </div>
          <BottomNav module={currentModule} />
        </div>
      </ShellContext.Provider>
    </RouterProvider>
  );
}
