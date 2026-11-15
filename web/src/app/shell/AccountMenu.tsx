import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { useNavigate } from "react-router";
import {
  Button,
  Dialog,
  DialogTrigger,
  Link,
  Popover,
} from "react-aria-components";
import { useAuth } from "@/core/auth";
import { routes } from "../routes";
import { shellStrings } from "../strings";
import PreferenceControls from "./PreferenceControls";
import { useShell } from "./ShellContext";
import { barButton, popover } from "./styles";

const { account } = shellStrings;

/**
 * Panel de cuenta: quién es la persona, «Mi cuenta», sus preferencias (tema y tamaño de texto como controles de icono) y,
 * al final y separado, el cierre de sesión como botón de ancho completo con icono. Es un panel y no una lista de menú
 * porque contiene controles propios; Escape lo cierra y el foco vuelve al botón de cuenta.
 */
export default function AccountMenu() {
  const { user, logout } = useAuth();
  const { moduleCode } = useShell();
  const navigate = useNavigate();
  if (!user) return null;
  const initial = user.displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <DialogTrigger>
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
        className={`${popover} shell-account`}
        placement="bottom end"
        data-module={moduleCode}
      >
        <Dialog className="outline-none" aria-label={account.menu}>
          {({ close }) => (
            <>
              <div className="shell-account-head">
                <span className="shell-account-name">{user.displayName}</span>
                <span className="shell-account-email">{user.email}</span>
              </div>
              <Link
                href={routes.account}
                className="shell-account-link"
                onPress={close}
              >
                <UserRound aria-hidden="true" />
                {account.mine}
              </Link>
              <PreferenceControls />
              <div className="shell-account-foot">
                <Button
                  className="shell-signout"
                  onPress={() => {
                    close();
                    void logout().finally(() => navigate(routes.home));
                  }}
                >
                  <LogOut aria-hidden="true" />
                  {account.signOut}
                </Button>
              </div>
            </>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
