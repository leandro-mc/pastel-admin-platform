import { Ellipsis } from "lucide-react";
import {
  Button,
  Link,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from "react-aria-components";
import { useLocation } from "react-router";
import { useAuth } from "@/core/auth";
import type { ModuleManifest } from "@/core/modules/types";
import { shellStrings } from "../strings";
import {
  BOTTOM_NAV_MAX,
  activeNavItem,
  appName,
  itemHref,
  visibleNavItems,
} from "./navigation";
import { useShell } from "./ShellContext";
import { menuItem, popover } from "./styles";

/**
 * Navegación inferior para pantallas estrechas: visible, con etiqueta y sin desplazamiento. Hasta 5 destinos se muestran
 * todos; con más, 4 más «Más» (navegación mixta). Con menos de 2 destinos no hay barra: un único «Inicio» no navega.
 */
export default function BottomNav({
  module,
}: {
  module: ModuleManifest | null;
}) {
  const { hasPermission } = useAuth();
  const { pathname } = useLocation();
  const { moduleCode } = useShell();
  if (!module) return null;
  const items = visibleNavItems(module, hasPermission);
  if (items.length < 2) return null;

  const overflow = items.length > BOTTOM_NAV_MAX;
  const visible = overflow ? items.slice(0, BOTTOM_NAV_MAX - 1) : items;
  const rest = overflow ? items.slice(BOTTOM_NAV_MAX - 1) : [];
  const active = activeNavItem(module, items, pathname);
  const restActive = rest.some((item) => item === active);

  return (
    <nav
      aria-label={shellStrings.moduleNav(appName(module))}
      className="shell-bottomnav"
    >
      <ul>
        {visible.map((item) => (
          <li key={item.to || "root"}>
            <Link
              href={itemHref(module, item)}
              className="shell-bottomnav-item"
              aria-current={item === active ? "page" : undefined}
            >
              <item.icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
        {overflow ? (
          <li>
            <MenuTrigger>
              <Button
                className="shell-bottomnav-item"
                data-active={restActive || undefined}
                aria-label={shellStrings.moreNavLabel}
              >
                <Ellipsis aria-hidden="true" />
                <span>{shellStrings.moreNav}</span>
              </Button>
              <Popover
                className={popover}
                placement="top end"
                data-module={moduleCode}
              >
                <Menu
                  aria-label={shellStrings.moreNavLabel}
                  className="outline-none"
                >
                  {rest.map((item) => (
                    <MenuItem
                      key={item.to || "root"}
                      id={item.to || "root"}
                      href={itemHref(module, item)}
                      textValue={item.label}
                      aria-current={item === active ? "page" : undefined}
                      className={menuItem}
                    >
                      <item.icon
                        aria-hidden="true"
                        className="size-5 shrink-0"
                      />
                      <span>{item.label}</span>
                    </MenuItem>
                  ))}
                </Menu>
              </Popover>
            </MenuTrigger>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
