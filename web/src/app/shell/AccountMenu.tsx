import { useNavigate } from "react-router";
import { Check } from "lucide-react";
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
import { usePreferences, type TextSize, type Theme } from "@/core/preferences";
import { routes } from "../routes";
import { shellStrings } from "../strings";
import { barButton, menuHeader, menuItem, popover } from "./styles";

const { account } = shellStrings;
const themes: { id: Theme; label: string }[] = [
  { id: "light", label: account.light },
  { id: "dark", label: account.dark },
];
const sizes: { id: TextSize; label: string }[] = [
  { id: "normal", label: account.normal },
  { id: "large", label: account.large },
  { id: "xlarge", label: account.xlarge },
];

function Checked({ label, selected }: { label: string; selected: boolean }) {
  return (
    <>
      <span>{label}</span>
      {selected ? (
        <Check aria-hidden="true" className="size-4 text-accent-strong" />
      ) : null}
    </>
  );
}

/** Menú de cuenta: Mi cuenta, tema, tamaño de texto y cierre de sesión. */
export default function AccountMenu() {
  const { user, logout } = useAuth();
  const { theme, setTheme, textSize, setTextSize } = usePreferences();
  const navigate = useNavigate();
  if (!user) return null;
  const initial = user.displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <MenuTrigger>
      <Button
        className={barButton}
        aria-label={`${account.menu}: ${user.displayName}`}
      >
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-accent-strong text-sm font-semibold text-on-accent"
        >
          {initial}
        </span>
        <span className="hidden max-w-40 truncate sm:inline">
          {user.displayName}
        </span>
      </Button>
      <Popover className={popover} placement="bottom end">
        <Menu aria-label={account.menu} className="outline-none">
          <MenuSection>
            <Header className={menuHeader}>{user.email}</Header>
            <MenuItem
              id="account"
              href={routes.account}
              textValue={account.mine}
              className={menuItem}
            >
              {account.mine}
            </MenuItem>
          </MenuSection>
          <Separator className="my-1 border-t border-line" />
          <MenuSection
            selectionMode="single"
            selectedKeys={[theme]}
            onSelectionChange={(keys) => {
              const next = [...keys][0];
              if (next === "light" || next === "dark") setTheme(next);
            }}
          >
            <Header className={menuHeader}>{account.theme}</Header>
            {themes.map((t) => (
              <MenuItem
                key={t.id}
                id={t.id}
                textValue={t.label}
                className={menuItem}
              >
                <Checked label={t.label} selected={theme === t.id} />
              </MenuItem>
            ))}
          </MenuSection>
          <Separator className="my-1 border-t border-line" />
          <MenuSection
            selectionMode="single"
            selectedKeys={[textSize]}
            onSelectionChange={(keys) => {
              const next = [...keys][0];
              if (next === "normal" || next === "large" || next === "xlarge")
                setTextSize(next);
            }}
          >
            <Header className={menuHeader}>{account.textSize}</Header>
            {sizes.map((s) => (
              <MenuItem
                key={s.id}
                id={s.id}
                textValue={s.label}
                className={menuItem}
              >
                <Checked label={s.label} selected={textSize === s.id} />
              </MenuItem>
            ))}
          </MenuSection>
          <Separator className="my-1 border-t border-line" />
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
