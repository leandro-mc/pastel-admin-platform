import { Link, NavLink, useLocation } from "react-router";
import { Flower2, LockKeyhole, UserRound } from "lucide-react";
import { useAuth } from "@/core/auth";
import type { ModuleManifest, ModuleNavItem } from "@/core/modules/types";
import { routes } from "../routes";
import { shellStrings } from "../strings";
import HelpButton from "../shell/HelpButton";
import ModuleSwitcher from "../shell/ModuleSwitcher";

type Props = { currentModule: ModuleManifest | null; collapsed: boolean };

function isItemActive(
  item: ModuleNavItem,
  module: ModuleManifest,
  pathname: string,
): boolean {
  const target = item.to ? `${module.basePath}/${item.to}` : module.basePath;
  if (pathname === target || pathname.startsWith(`${target}/`)) return true;
  if (item.to === "usuarios" && pathname.includes("/accesos/usuario/"))
    return true;
  if (item.to === "roles" && pathname.includes("/accesos/rol/")) return true;
  return (
    module.code === "identity" &&
    item.to === "usuarios" &&
    pathname === module.basePath
  );
}

export default function AppSidebar({ currentModule, collapsed }: Props) {
  const { hasPermission, status } = useAuth();
  const { pathname } = useLocation();
  const moduleNav =
    currentModule?.nav.filter(
      (item) =>
        !item.requiredPermission || hasPermission(item.requiredPermission),
    ) ?? [];
  const navItems: ModuleNavItem[] =
    currentModule && currentModule.nav.length === 0
      ? [{ label: "Inicio", to: "", icon: currentModule.icon }]
      : moduleNav;
  const currentName =
    currentModule?.code === "identity"
      ? "Pastel Workspace"
      : (currentModule?.name ?? "Mi cuenta");
  const currentDescription =
    currentModule?.code === "identity"
      ? "Administración de la plataforma"
      : (currentModule?.tagline ?? shellStrings.account.profileDescription);
  const CurrentIcon = currentModule?.icon ?? UserRound;

  return (
    <aside className="workspace-sidebar" aria-label="Navegación de Pastel">
      <Link
        to={currentModule?.basePath ?? routes.home}
        className="workspace-brand"
        aria-label={`Pastel, ir al inicio de ${currentName}`}
      >
        <span className="workspace-brand-mark">
          <Flower2 aria-hidden="true" size={30} strokeWidth={1.8} />
        </span>
        <span className="workspace-brand-copy">
          <strong>pastel</strong>
          <small>WORKSPACE</small>
        </span>
      </Link>
      <div className="workspace-app-switcher">
        <ModuleSwitcher collapsed={collapsed} />
        <div
          className="workspace-current-app"
          data-module={currentModule?.code}
          title={collapsed ? currentName : undefined}
        >
          <span className="workspace-current-app-icon">
            <CurrentIcon aria-hidden="true" />
          </span>
          <span className="workspace-current-app-copy">
            <strong>{currentName}</strong>
            <small>{currentDescription}</small>
          </span>
        </div>
      </div>
      {navItems.length > 0 ? (
        <p className="workspace-sidebar-label">
          {collapsed ? "MENÚ" : "MENÚ PRINCIPAL"}
        </p>
      ) : null}
      <nav className="workspace-sidebar-nav" aria-label={currentName}>
        {navItems.map((item) => {
          const target = item.to
            ? `${currentModule?.basePath}/${item.to}`
            : (currentModule?.basePath ?? routes.home);
          const active = currentModule
            ? isItemActive(item, currentModule, pathname)
            : false;
          return (
            <NavLink
              key={item.to || "root"}
              to={target}
              end={item.to === ""}
              title={collapsed ? item.label : undefined}
              aria-current={active ? "page" : undefined}
              className={({ isActive: routerActive }) =>
                ["workspace-nav-item", active || routerActive ? "active" : ""]
                  .filter(Boolean)
                  .join(" ")
              }
            >
              <item.icon aria-hidden="true" className="workspace-nav-icon" />
              {!collapsed ? (
                <span className="workspace-nav-copy">
                  <strong>{item.label}</strong>
                  <small>
                    {item.to === "usuarios"
                      ? "Directorio y accesos"
                      : item.to === "roles"
                        ? "Roles y permisos"
                        : item.to === "modulos"
                          ? "Aplicaciones disponibles"
                          : item.to === "auditoria"
                            ? "Actividad administrativa"
                            : currentModule?.code === "agora"
                              ? "Contenido público"
                              : "Vista general"}
                  </small>
                </span>
              ) : null}
              {active ? (
                <span className="workspace-nav-dot" aria-hidden="true" />
              ) : null}
            </NavLink>
          );
        })}
        {status === "authenticated" ? (
          <NavLink
            to={routes.account}
            title={collapsed ? shellStrings.account.mine : undefined}
            className="workspace-nav-item"
            aria-label={shellStrings.account.mine}
          >
            <UserRound aria-hidden="true" className="workspace-nav-icon" />
            {!collapsed ? (
              <span className="workspace-nav-copy">
                <strong>{shellStrings.account.mine}</strong>
                <small>{shellStrings.account.profileDescription}</small>
              </span>
            ) : null}
          </NavLink>
        ) : null}
      </nav>
      <div className="workspace-sidebar-spacer" />
      <section
        className="workspace-security-note"
        aria-label="Seguridad de la plataforma"
      >
        <LockKeyhole aria-hidden="true" className="workspace-security-icon" />
        {!collapsed ? (
          <div>
            <strong>Su espacio, protegido</strong>
            <p>Los accesos se muestran según los permisos de su cuenta.</p>
          </div>
        ) : null}
      </section>
      <HelpButton compact={collapsed} />
      <div className="workspace-sidebar-bottom">
        <span className="workspace-sidebar-status" aria-hidden="true" />
        {!collapsed ? (
          <>
            <span>Pastel Workspace</span>
            <small>Fase 0</small>
          </>
        ) : null}
      </div>
    </aside>
  );
}
