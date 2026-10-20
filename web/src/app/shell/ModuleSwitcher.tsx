import { useLocation } from "react-router";
import { ChevronDown } from "lucide-react";
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from "react-aria-components";
import { useAccessibleModules } from "../modules";
import { shellStrings } from "../strings";
import { barButton, menuItem, popover } from "./styles";

/**
 * Selector del contexto activo. Workspace aparece únicamente si el manifiesto de Identity
 * ya concede acceso mediante permisos globales; el backend sigue siendo la autoridad.
 */
export default function ModuleSwitcher() {
  const available = useAccessibleModules();
  const { pathname } = useLocation();
  if (available.length < 2) return null;

  const current = available.find(
    (module) =>
      pathname === module.basePath || pathname.startsWith(module.basePath + "/"),
  );
  const nameOf = (code: string, name: string) =>
    code === "identity" ? "Pastel Workspace" : name;
  const currentName = current
    ? nameOf(current.code, current.name)
    : "Cambiar aplicación";

  return (
    <MenuTrigger>
      <Button
        className={`${barButton} min-w-0 border border-line bg-app`}
        aria-label={`Cambiar aplicación; actual: ${currentName}`}
      >
        {current ? (
          <current.icon aria-hidden="true" className="size-4 shrink-0 text-accent" />
        ) : null}
        <span className="max-w-36 truncate">
          {currentName}
        </span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted" />
      </Button>
      <Popover className={popover} placement="bottom start">
        <Menu aria-label={shellStrings.modules} className="outline-none">
          {available.map((module) => {
            const name = nameOf(module.code, module.name);
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
                  className="flex min-w-0 items-center gap-2"
                  data-module={module.code}
                >
                  <module.icon aria-hidden="true" className="size-5 shrink-0 text-accent" />
                  <span className="truncate">{name}</span>
                </span>
              </MenuItem>
            );
          })}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
