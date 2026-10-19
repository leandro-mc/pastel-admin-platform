import { NavLink, Outlet } from "react-router";
import { useAuth } from "@/core/auth";
import type { ModuleManifest } from "@/core/modules/types";
import { shellStrings } from "../strings";
import Breadcrumbs from "./Breadcrumbs";

const link =
  "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-xs font-medium text-muted outline-none hover:bg-accent-soft focus-visible:ring-3 focus-visible:ring-accent-strong/45 aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent-strong md:flex-none md:flex-row md:justify-start md:gap-3 md:px-3 md:text-sm";

/**
 * Marco de un módulo: activa su color con `data-module`, navegación lateral en escritorio e inferior en móvil.
 * Sin elementos de navegación (esqueletos) no se dibuja la barra.
 */
export default function ModuleLayout({
  manifest,
}: {
  manifest: ModuleManifest;
}) {
  const { hasPermission } = useAuth();
  const items = manifest.nav.filter(
    (item) =>
      !item.requiredPermission || hasPermission(item.requiredPermission),
  );
  const hasNav = items.length > 0;
  return (
    <div data-module={manifest.code} className={hasNav ? "md:flex" : undefined}>
      {hasNav ? (
        <nav
          aria-label={shellStrings.moduleNav(manifest.name)}
          className="fixed inset-x-0 bottom-0 z-30 flex gap-1 border-t border-line bg-surface p-1 md:static md:min-h-[calc(100vh-3.5rem)] md:w-56 md:shrink-0 md:flex-col md:gap-1 md:border-r md:border-t-0 md:p-3"
        >
          {items.map((item) => (
            <NavLink
              key={item.to || "root"}
              to={`${manifest.basePath}${item.to ? `/${item.to}` : ""}`}
              end={item.to === ""}
              className={link}
            >
              <item.icon aria-hidden="true" className="size-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      ) : null}
      <div className={hasNav ? "min-w-0 flex-1 pb-20 md:pb-0" : undefined}>
        <Breadcrumbs />
        <Outlet />
      </div>
    </div>
  );
}
