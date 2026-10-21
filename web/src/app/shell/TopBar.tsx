import {
  ChevronRight,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
} from "lucide-react";
import { Link, useLocation } from "react-router";
import { useAuth } from "@/core/auth";
import { usePreferences } from "@/core/preferences";
import { routes } from "../routes";
import { shellStrings } from "../strings";
import AccountMenu from "./AccountMenu";
import { barButton } from "./styles";

type Props = {
  pageTitle: string;
  contextLabel: string;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
};

/** La barra superior identifica la sección; el nombre de la app activa vive en la barra lateral. */
export default function TopBar({
  pageTitle,
  contextLabel,
  sidebarCollapsed,
  onToggleSidebar,
}: Props) {
  const { status } = useAuth();
  const { theme, toggleTheme } = usePreferences();
  const { pathname } = useLocation();
  return (
    <header className="workspace-topbar">
      <div className="workspace-topbar-left">
        <button
          type="button"
          className="workspace-collapse-button"
          aria-label={
            sidebarCollapsed ? "Expandir menú lateral" : "Colapsar menú lateral"
          }
          title={
            sidebarCollapsed ? "Expandir menú lateral" : "Colapsar menú lateral"
          }
          onClick={onToggleSidebar}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen aria-hidden="true" size={22} />
          ) : (
            <PanelLeftClose aria-hidden="true" size={22} />
          )}
        </button>
        <nav className="workspace-breadcrumbs" aria-label="Ubicación actual">
          <span>{contextLabel}</span>
          <ChevronRight aria-hidden="true" />
          <strong>{pageTitle}</strong>
        </nav>
      </div>
      <div className="workspace-topbar-actions">
        <span className="workspace-topbar-note">Su espacio de trabajo</span>
        <button
          type="button"
          className="workspace-theme-button"
          aria-label={
            theme === "light" ? "Activar modo oscuro" : "Activar modo claro"
          }
          title={theme === "light" ? "Modo oscuro" : "Modo claro"}
          onClick={toggleTheme}
        >
          {theme === "light" ? (
            <Moon aria-hidden="true" size={20} />
          ) : (
            <Sun aria-hidden="true" size={20} />
          )}
        </button>
        {status === "authenticated" ? (
          <AccountMenu />
        ) : pathname !== routes.login ? (
          <Link to={routes.login} className={barButton}>
            {shellStrings.account.signIn}
          </Link>
        ) : null}
      </div>
    </header>
  );
}
