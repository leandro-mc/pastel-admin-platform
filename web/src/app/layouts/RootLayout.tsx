import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useMatches, useNavigate } from "react-router";
import { RouterProvider } from "react-aria-components";
import { useAuth } from "@/core/auth";
import type { ModuleManifest, ModuleNavItem } from "@/core/modules/types";
import { strings } from "../strings";
import { routes } from "../routes";
import { getRememberedAppPath, rememberCurrentApp, useAccessibleModules } from "../modules";
import AppFooter from "./AppFooter";
import AppSidebar from "./AppSidebar";
import TopBar from "../shell/TopBar";

type CrumbHandle = { crumb?: string };

function matchesPath(pathname: string, basePath: string): boolean {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

function activeNavigationItem(module: ModuleManifest, pathname: string): ModuleNavItem | undefined {
  return module.nav.find((item) => {
    const target = item.to ? `${module.basePath}/${item.to}` : module.basePath;
    if (pathname === target || pathname.startsWith(`${target}/`)) return true;
    if (item.to === "usuarios" && pathname.includes("/accesos/usuario/")) return true;
    if (item.to === "roles" && pathname.includes("/accesos/rol/")) return true;
    return module.code === "identity" && item.to === "usuarios" && pathname === module.basePath;
  });
}

function pageTitle(pathname: string, currentModule: ModuleManifest | null, matches: ReturnType<typeof useMatches>): string {
  if (pathname === routes.account) return "Mi cuenta";
  if (pathname === routes.password) return "Seguridad";
  if (!currentModule) return "Tu espacio";
  const item = activeNavigationItem(currentModule, pathname);
  if (item) return item.label;
  const crumb = [...matches].reverse()
    .map((match) => (match.handle as CrumbHandle | undefined)?.crumb)
    .find((value) => value && value !== currentModule.name);
  if (crumb) return crumb;
  return currentModule.code === "identity" ? "Configuración" : "Inicio";
}

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

/** Shell común: navegación de la izquierda; contexto y contenido en la columna de trabajo. */
export default function RootLayout() {
  useFocusHeadingOnNavigation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const matches = useMatches();
  const { status, user } = useAuth();
  const availableModules = useAccessibleModules();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem("pastel-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });
  const isStandaloneAuth = pathname === routes.login;
  const accessibleProductPaths = availableModules
    .filter((module) => module.code !== "identity")
    .map((module) => module.basePath);
  const accessibleProductKey = accessibleProductPaths.join("|");
  const rememberedAppPath = user?.id ? getRememberedAppPath(user.id, accessibleProductPaths) : null;
  const directModule = availableModules.find((module) => matchesPath(pathname, module.basePath)) ?? null;
  const isGlobalAccountRoute = pathname === routes.account || pathname === routes.password;
  const currentModule = directModule ?? (isGlobalAccountRoute
    ? availableModules.find((module) => module.basePath === rememberedAppPath)
      ?? availableModules.find((module) => module.code === "agora")
      ?? null
    : null);
  // The selected app is identified in the sidebar card; do not repeat its name in the top bar.
  const contextLabel = currentModule?.code === "identity" ? "Workspace" : "Pastel";
  const currentPage = pageTitle(pathname, currentModule, matches);

  useEffect(() => {
    if (status === "authenticated" && user?.id) {
      rememberCurrentApp(pathname, user.id, accessibleProductKey.split("|").filter(Boolean));
    }
  }, [pathname, status, user?.id, accessibleProductKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem("pastel-sidebar-collapsed", String(sidebarCollapsed));
    } catch {
      // El shell sigue siendo funcional aunque el navegador no permita almacenar preferencias.
    }
  }, [sidebarCollapsed]);

  if (isStandaloneAuth) {
    return (
      <RouterProvider navigate={(to, options) => void navigate(to, options)}>
        <div className="min-h-screen">
          <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-fg focus:ring-2 focus:ring-accent-strong">
            {strings.skipToContent}
          </a>
          <div id="contenido" className="min-h-screen"><Outlet /></div>
        </div>
      </RouterProvider>
    );
  }

  return (
    <RouterProvider navigate={(to, options) => void navigate(to, options)}>
      <div className={["app-workspace-shell", sidebarCollapsed ? "sidebar-collapsed" : ""].filter(Boolean).join(" ")} data-module={currentModule?.code}>
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-fg focus:ring-2 focus:ring-accent-strong">
          {strings.skipToContent}
        </a>
        <AppSidebar currentModule={currentModule} collapsed={sidebarCollapsed} />
        <div className="workspace-main">
          <TopBar pageTitle={currentPage} contextLabel={contextLabel} sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed((current) => !current)} />
          <main id="contenido" className="workspace-content bg-app text-fg"><Outlet /></main>
          <AppFooter />
        </div>
      </div>
    </RouterProvider>
  );
}
