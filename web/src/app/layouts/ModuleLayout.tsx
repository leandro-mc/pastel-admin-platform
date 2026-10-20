import { NavLink, Outlet, useLocation } from "react-router";
import { useAuth } from "@/core/auth";
import type { ModuleManifest } from "@/core/modules/types";
import { shellStrings } from "../strings";
import Breadcrumbs from "./Breadcrumbs";

const link =
  "group flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium text-muted outline-none transition-colors hover:bg-accent-soft/70 hover:text-fg focus-visible:ring-3 focus-visible:ring-accent-strong/45 aria-[current=page]:bg-accent-soft aria-[current=page]:font-semibold aria-[current=page]:text-accent-strong md:min-h-11 md:flex-none md:flex-row md:justify-start md:gap-3 md:px-3 md:text-sm md:shadow-none aria-[current=page]:md:shadow-sm";

const navigationPanel =
  "fixed inset-x-0 bottom-0 z-30 flex min-h-0 flex-col gap-3 border-t border-line bg-surface px-2 py-2 shadow-[0_-8px_30px_rgba(0,0,0,0.035)] md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:w-64 md:shrink-0 md:gap-5 md:overflow-y-auto md:border-r md:border-t-0 md:px-4 md:py-5 md:shadow-none";

const ContextIcon = ({ manifest }: { manifest: ModuleManifest }) => {
  const Icon = manifest.icon;
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-line bg-accent-soft text-accent-strong">
      <Icon aria-hidden="true" className="size-5" />
    </span>
  );
};

/**
 * Shell de app: identidad y navegación específicas del manifiesto.
 * La UI filtra opciones; los endpoints siguen siendo la autoridad de permisos.
 */
export default function ModuleLayout({
  manifest,
}: {
  manifest: ModuleManifest;
}) {
  const { hasPermission } = useAuth();
  const { pathname } = useLocation();
  const isModuleHome = pathname === manifest.basePath || pathname === `${manifest.basePath}/`;
  const items = manifest.nav.filter(
    (item) =>
      !item.requiredPermission || hasPermission(item.requiredPermission),
  );
  const hasNav = items.length > 0;
  const isWorkspace = manifest.code === "identity";
  const contextName = isWorkspace ? "Pastel Workspace" : manifest.name;
  const contextDescription = isWorkspace
    ? "Administración de la plataforma"
    : manifest.tagline;
  const ContextMark = manifest.icon;

  return (
    <div
      data-module={manifest.code}
      className={hasNav ? "min-w-0 md:flex" : "min-w-0"}
    >
      {hasNav ? (
        <aside className={navigationPanel}>
          <div className="hidden items-center gap-3 border-b border-line px-2 pb-5 md:flex">
            <ContextIcon manifest={manifest} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-fg">
                {contextName}
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                {contextDescription}
              </p>
            </div>
          </div>

          <nav
            aria-label={shellStrings.moduleNav(contextName)}
            className="flex min-w-0 gap-1 overflow-x-auto md:flex-col md:gap-1.5"
          >
            {items.map((item) => (
              <NavLink
                key={item.to || "root"}
                to={`${manifest.basePath}${item.to ? `/${item.to}` : ""}`}
                end={item.to === ""}
                className={link}
              >
                <item.icon
                  aria-hidden="true"
                  className="size-5 shrink-0 transition-transform group-hover:scale-105"
                />
                <span className="max-w-full truncate">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="hidden rounded-2xl border border-line bg-app px-3 py-3 text-xs leading-relaxed text-muted md:block">
            <div className="mb-2 flex items-center gap-2 font-semibold text-fg">
              <ContextMark aria-hidden="true" className="size-4 text-accent-strong" />
              <span>Espacio activo</span>
            </div>
            Está viendo {contextName}. Las opciones se muestran según los permisos de su cuenta.
          </div>
        </aside>
      ) : null}

      <div
        className={
          hasNav
            ? "min-w-0 flex-1 pb-20 md:pb-0"
            : "min-w-0 flex-1"
        }
      >
        {isModuleHome ? null : <Breadcrumbs />}
        <Outlet />
      </div>
    </div>
  );
}
