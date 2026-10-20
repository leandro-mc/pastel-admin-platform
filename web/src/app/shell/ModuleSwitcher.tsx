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

/** Selector de apps disponibles. La configuración de plataforma no aparece como una subapp de producto. */
export default function ModuleSwitcher() {
  const available = useAccessibleModules().filter((module) => module.code !== "identity");
  const { pathname } = useLocation();
  if (available.length < 2) return null;

  const current = available.find(
    (module) => pathname === module.basePath || pathname.startsWith(module.basePath + "/"),
  );

  return (
    <MenuTrigger>
      <Button
        className={`${barButton} border border-line bg-app`}
        aria-label={current ? `Cambiar aplicación; actual: ${current.name}` : "Cambiar aplicación"}
        title="Cambiar aplicación"
      >
        {current ? (
          <current.icon aria-hidden="true" className="size-4 text-accent" />
        ) : null}
        <span>{current?.name ?? "Cambiar app"}</span>
        <ChevronDown aria-hidden="true" className="size-4 text-muted" />
      </Button>
      <Popover className={popover} placement="bottom start">
        <Menu aria-label={shellStrings.modules} className="outline-none">
          {available.map((module) => (
            <MenuItem
              key={module.code}
              id={module.code}
              href={module.basePath}
              textValue={module.name}
              aria-current={module.code === current?.code ? "page" : undefined}
              className={
                module.code === current?.code
                  ? `${menuItem} bg-accent-soft font-semibold`
                  : menuItem
              }
            >
              <span className="flex items-center gap-2" data-module={module.code}>
                <module.icon aria-hidden="true" className="size-5 text-accent" />
                {module.name}
              </span>
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
