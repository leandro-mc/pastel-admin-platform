import { useLocation } from "react-router";
import { Check, RefreshCw } from "lucide-react";
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from "react-aria-components";
import { useAccessibleModules } from "../modules";
import { shellStrings } from "../strings";
import { menuItem, popover } from "./styles";

/** Selector de apps en la barra lateral; la app activa se muestra en el panel inferior. */
export default function ModuleSwitcher({
  collapsed = false,
}: {
  collapsed?: boolean;
}) {
  const available = useAccessibleModules();
  const { pathname } = useLocation();
  if (available.length < 2) return null;
  const current = available.find(
    (module) =>
      pathname === module.basePath ||
      pathname.startsWith(module.basePath + "/"),
  );
  const currentName = current
    ? current.code === "identity"
      ? "Pastel Workspace"
      : current.name
    : "Cambiar aplicación";
  return (
    <MenuTrigger>
      <Button
        className={[
          "workspace-app-switch-trigger",
          collapsed ? "is-collapsed" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={`Cambiar aplicación; actual: ${currentName}`}
      >
        <RefreshCw aria-hidden="true" className="workspace-app-switch-icon" />
        {!collapsed ? <span>Cambiar aplicación</span> : null}
      </Button>
      <Popover className={popover} placement="bottom start">
        <Menu aria-label={shellStrings.modules} className="outline-none">
          {available.map((module) => {
            const name =
              module.code === "identity" ? "Pastel Workspace" : module.name;
            const selected = module.code === current?.code;
            return (
              <MenuItem
                key={module.code}
                id={module.code}
                href={module.basePath}
                textValue={name}
                aria-current={selected ? "page" : undefined}
                className={
                  selected
                    ? `${menuItem} bg-accent-soft font-semibold`
                    : menuItem
                }
              >
                <span
                  className="workspace-module-menu-item"
                  data-module={module.code}
                >
                  <module.icon
                    aria-hidden="true"
                    className="size-5 shrink-0 text-accent"
                  />
                  <span>{name}</span>
                </span>
                {selected ? (
                  <Check
                    aria-hidden="true"
                    className="size-4 text-accent-strong"
                  />
                ) : null}
              </MenuItem>
            );
          })}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
