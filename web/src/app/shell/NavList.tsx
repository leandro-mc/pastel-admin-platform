import { Link, Tooltip, TooltipTrigger } from "react-aria-components";
import { useLocation } from "react-router";
import { useAuth } from "@/core/auth";
import type { ModuleManifest, ModuleNavItem } from "@/core/modules/types";
import { shellStrings } from "../strings";
import {
  activeNavItem,
  appName,
  itemHref,
  visibleNavItems,
} from "./navigation";
import { useShell } from "./ShellContext";

type Group = { label: string | undefined; items: ModuleNavItem[] };

/** Agrupa solo si el módulo declara al menos dos grupos; los ítems sin grupo van primero. Sin grupos, una lista plana. */
function groupItems(items: readonly ModuleNavItem[]): Group[] {
  const labels = new Set(items.map((item) => item.group).filter(Boolean));
  if (labels.size < 2) return [{ label: undefined, items: [...items] }];
  const groups: Group[] = [];
  const ungrouped = items.filter((item) => !item.group);
  if (ungrouped.length > 0) groups.push({ label: undefined, items: ungrouped });
  for (const label of labels)
    groups.push({
      label: label as string,
      items: items.filter((item) => item.group === label),
    });
  return groups;
}

/** Navegación de la app activa: un renglón por destino, icono y texto, el activo marcado con `aria-current`. */
export default function NavList({
  module,
  collapsed,
}: {
  module: ModuleManifest;
  collapsed: boolean;
}) {
  const { hasPermission } = useAuth();
  const { pathname } = useLocation();
  const { moduleCode } = useShell();
  const items = visibleNavItems(module, hasPermission);
  const active = activeNavItem(module, items, pathname);

  return (
    <nav
      aria-label={shellStrings.moduleNav(appName(module))}
      className="shell-nav"
    >
      {groupItems(items).map((group, index) => (
        <div key={group.label ?? `g${index}`} className="shell-nav-group">
          {group.label ? (
            <p className="shell-nav-heading">{group.label}</p>
          ) : null}
          <ul>
            {group.items.map((item) => {
              const link = (
                <Link
                  href={itemHref(module, item)}
                  className="shell-nav-item"
                  aria-current={item === active ? "page" : undefined}
                >
                  <item.icon aria-hidden="true" />
                  <span className={collapsed ? "sr-only" : "truncate"}>
                    {item.label}
                  </span>
                </Link>
              );
              return (
                <li key={item.to || "root"}>
                  {collapsed ? (
                    <TooltipTrigger delay={300}>
                      {link}
                      <Tooltip
                        placement="right"
                        offset={8}
                        className="shell-tooltip"
                        data-module={moduleCode}
                      >
                        {item.label}
                      </Tooltip>
                    </TooltipTrigger>
                  ) : (
                    link
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
