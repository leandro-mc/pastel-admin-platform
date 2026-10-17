import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  ArrowRight,
  ChevronDown,
  CircleHelp,
  Command,
  Flower2,
  Gauge,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  ShieldCheck,
  Sun,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Toast from "./Toast";
import type { Notice, Notify, Screen, User } from "../types";

type NavigationItem = {
  id: Screen;
  label: string;
  caption: string;
  icon: LucideIcon;
  permission?: string;
};

const navigationItems: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Resumen",
    caption: "Vista general",
    icon: Gauge,
    permission: "dashboard.view",
  },
  {
    id: "settings",
    label: "Configuración",
    caption: "Usuarios y accesos",
    icon: Settings2,
    permission: "settings.users.read",
  },
  {
    id: "profile",
    label: "Mi cuenta",
    caption: "Perfil y seguridad",
    icon: UserRound,
  },
];

type WorkspaceLayoutProps = {
  children: ReactNode;
  currentUser: User;
  permissions: string[];
  screen: Screen;
  setScreen: Dispatch<SetStateAction<Screen>>;
  collapsed: boolean;
  setCollapsed: Dispatch<SetStateAction<boolean>>;
  theme: "light" | "dark";
  toggleTheme: () => void;
  notify: Notify;
  onLogout: () => void;
  notice: Notice | null;
  dismissNotice: () => void;
};

export default function WorkspaceLayout({
  children,
  currentUser,
  permissions,
  screen,
  setScreen,
  collapsed,
  setCollapsed,
  theme,
  toggleTheme,
  notify,
  onLogout,
  notice,
  dismissNotice,
}: WorkspaceLayoutProps) {
  const canSettings = permissions.some((permission) =>
    permission.startsWith("settings."),
  );

  const visibleNavigation = navigationItems.filter(
    (item) =>
      !item.permission ||
      permissions.includes(item.permission) ||
      (item.id === "settings" && canSettings),
  );

  const initials = currentUser.displayName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const currentPageName =
    screen === "dashboard"
      ? "Resumen"
      : screen === "settings"
        ? "Configuración"
        : "Mi cuenta";

  return (
    <div className={collapsed ? "app-shell sidebar-collapsed" : "app-shell"}>
      <aside className="sidebar">
        <button
          className="brand-lockup"
          onClick={() => setScreen("dashboard")}
          aria-label="Ir al inicio"
          title={collapsed ? "Ir al inicio" : undefined}
        >
          <span className="brand-mark">
            <Flower2 size={22} />
          </span>
          <span className="brand-wordmark">
            <strong>pastel</strong>
            <small>WORKSPACE</small>
          </span>
        </button>

        <div className="workspace-selector">
          <div className="workspace-icon">
            <Command size={16} />
          </div>
          <div>
            <strong>Mi espacio</strong>
            <small>Plan esencial</small>
          </div>
          <ChevronDown size={15} />
        </div>

        <span className="sidebar-label">MENÚ PRINCIPAL</span>
        <nav className="sidebar-nav" aria-label="Navegación principal">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = screen === item.id;

            return (
              <button
                key={item.id}
                className={isActive ? "nav-item active" : "nav-item"}
                data-tooltip={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setScreen(item.id)}
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.caption}</small>
                </span>
                {item.id === "settings" && <span className="nav-dot" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-spacer" />

        <div className="security-note">
          <div className="security-note-icon">
            <ShieldCheck size={18} />
          </div>
          <div>
            <strong>Tu espacio, protegido</strong>
            <p>Accesos administrados de forma segura.</p>
          </div>
        </div>

        <button
          className="help-link"
          data-tooltip={collapsed ? "Centro de ayuda" : undefined}
          aria-label={collapsed ? "Centro de ayuda" : undefined}
          onClick={() =>
            notify("La documentación se encuentra en el README del proyecto.")
          }
        >
          <CircleHelp size={17} />
          <span>Centro de ayuda</span>
          <ArrowRight size={15} />
        </button>

        <div className="sidebar-bottom">
          <span className="online-pip" />
          Sistema operativo
          <span className="version">v0.1</span>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button collapse-button"
              onClick={() => setCollapsed((current) => !current)}
              aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            >
              {collapsed ? (
                <PanelLeftOpen size={19} />
              ) : (
                <PanelLeftClose size={19} />
              )}
            </button>
            <span className="breadcrumb">
              Workspace <span>/</span> <strong>{currentPageName}</strong>
            </span>
          </div>

          <div className="topbar-actions">
            <span className="today-label">Tu espacio de trabajo</span>
            <button
              className="icon-button theme-switch"
              aria-label={
                theme === "light" ? "Activar modo oscuro" : "Activar modo claro"
              }
              title={theme === "light" ? "Modo oscuro" : "Modo claro"}
              onClick={toggleTheme}
            >
              {theme === "light" ? (
                <Moon size={18} />
              ) : (
                <Sun size={18} />
              )}
            </button>
            <div className="topbar-divider" />
            <button
              className="account-menu"
              onClick={() => setScreen("profile")}
            >
              <span className="avatar">{initials}</span>
              <span className="account-copy">
                <strong>{currentUser.displayName}</strong>
                <small>
                  {currentUser.roles.includes("Administrator")
                    ? "Administrador"
                    : "Mi cuenta"}
                </small>
              </span>
              <ChevronDown size={15} />
            </button>
            <button
              className="icon-button logout-button"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              onClick={() => void onLogout()}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="main-content">{children}</main>

        <footer className="app-footer">
          <span>© {new Date().getFullYear()} Pastel Workspace</span>
          <span className="footer-center">
            <span className="online-pip" />
            Todos los sistemas en funcionamiento
          </span>
          <span>
            Hecho para crecer con vos <Flower2 size={14} />
          </span>
        </footer>
      </div>

      <Toast notice={notice} onDismiss={dismissNotice} />
    </div>
  );
}
