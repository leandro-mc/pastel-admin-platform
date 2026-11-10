import { ChevronDown } from "lucide-react";
import { useNavigate } from "react-router";
import {
  Button,
  Header,
  Menu,
  MenuItem,
  MenuSection,
  MenuTrigger,
  Popover,
  Separator,
} from "react-aria-components";
import { useAuth } from "@/core/auth";
import { routes } from "../routes";
import { shellStrings } from "../strings";
import PreferenceSections from "./PreferenceSections";
import { useShell } from "./ShellContext";
import { barButton, menuItem, menuSeparator, popover } from "./styles";

const { account } = shellStrings;

/** Menú de cuenta: quién es la persona, su cuenta, apariencia y tamaño de texto, y cierre de sesión. */
export default function AccountMenu() {
  const { user, logout } = useAuth();
  const { moduleCode } = useShell();
  const navigate = useNavigate();
  if (!user) return null;
  const initial = user.displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <MenuTrigger>
      <Button className={barButton}>
        {/* La inicial va como contenido generado: no cuenta como texto visible del botón (WCAG 2.5.3). */}
        <span
          aria-hidden="true"
          className="shell-avatar"
          data-initial={initial}
        />
        <span className="sr-only">{shellStrings.accountPrefix}</span>
        <span className="sr-only md:not-sr-only md:max-w-40 md:truncate">
          {user.displayName}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="shell-caret hidden md:inline"
        />
      </Button>
      <Popover
        className={popover}
        placement="bottom end"
        data-module={moduleCode}
      >
        <Menu aria-label={account.menu} className="outline-none">
          <MenuSection>
            <Header className="grid px-3 pt-2 pb-2">
              <span className="truncate text-sm font-semibold text-fg">
                {user.displayName}
              </span>
              <span className="truncate text-xs font-normal text-fg-secondary">
                {user.email}
              </span>
            </Header>
            <MenuItem
              id="account"
              href={routes.account}
              textValue={account.mine}
              className={menuItem}
            >
              {account.mine}
            </MenuItem>
          </MenuSection>
          <Separator className={menuSeparator} />
          <PreferenceSections />
          <Separator className={menuSeparator} />
          <MenuSection>
            <MenuItem
              id="signout"
              textValue={account.signOut}
              className={menuItem}
              onAction={() =>
                void logout().finally(() => navigate(routes.home))
              }
            >
              {account.signOut}
            </MenuItem>
          </MenuSection>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
