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

/** Selector de módulos: solo aparece si la persona puede entrar a más de uno. */
export default function ModuleSwitcher() {
  const modules = useAccessibleModules();
  const { pathname } = useLocation();
  if (modules.length < 2) return null;
  const current = modules.find(
    (m) => pathname === m.basePath || pathname.startsWith(m.basePath + "/"),
  );

  return (
    <MenuTrigger>
      <Button className={barButton}>
        {current ? (
          <current.icon aria-hidden="true" className="size-5 text-accent" />
        ) : null}
        <span>{current?.name ?? shellStrings.modules}</span>
        <ChevronDown aria-hidden="true" className="size-4 text-muted" />
      </Button>
      <Popover className={popover} placement="bottom start">
        <Menu aria-label={shellStrings.modules} className="outline-none">
          {modules.map((m) => (
            <MenuItem
              key={m.code}
              id={m.code}
              href={m.basePath}
              textValue={m.name}
              className={menuItem}
            >
              <span className="flex items-center gap-2" data-module={m.code}>
                <m.icon aria-hidden="true" className="size-5 text-accent" />
                {m.name}
              </span>
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
