import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
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
import AuthScreen from "./components/AuthScreen";
import ChangePasswordScreen from "./components/ChangePasswordScreen";
import Dashboard from "./components/Dashboard";
import ProfilePage from "./components/ProfilePage";
import Toast from "./components/Toast";
import SettingsPage from "./SettingsPage";
import { api, ApiError, ensureCsrf } from "./lib/api";
import type {
  AuthenticationValues,
  Notice,
  PasswordChangeValues,
  Profile,
  Screen,
} from "./types";

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

function messageFrom(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrió un error inesperado. Intentá de nuevo.";
}

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [busy, setBusy] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    localStorage.getItem("pastel-theme") === "dark" ? "dark" : "light",
  );
  const [collapsed, setCollapsed] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const notify = useCallback(
    (message: string, tone: "success" | "error" = "success") => {
      setNotice({ message, tone });
      window.setTimeout(() => setNotice(null), 4200);
    },
    [],
  );

  const loadProfile = useCallback(async (): Promise<Profile> => {
    return api<Profile>("/api/auth/me");
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("pastel-theme", theme);
  }, [theme]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        await ensureCsrf();

        try {
          const currentProfile = await loadProfile();

          if (active) {
            setProfile(currentProfile);
          }
        } catch (error) {
          if (!(error instanceof ApiError && error.status === 401)) {
            throw error;
          }

          try {
            await api("/api/auth/refresh", {
              method: "POST",
              body: "{}",
            });
            const refreshedProfile = await loadProfile();

            if (active) {
              setProfile(refreshedProfile);
            }
          } catch (refreshError) {
            if (
              !(
                refreshError instanceof ApiError &&
                [400, 401].includes(refreshError.status)
              )
            ) {
              throw refreshError;
            }
          }
        }
      } catch (error) {
        if (active) {
          notify(messageFrom(error), "error");
        }
      } finally {
        if (active) {
          setBusy(false);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [loadProfile, notify]);

  const canSettings = useMemo(
    () =>
      Boolean(
        profile?.permissions.some((permission) =>
          permission.startsWith("settings."),
        ),
      ),
    [profile],
  );

  const visibleNavigation = navigationItems.filter(
    (item) =>
      !item.permission ||
      profile?.permissions.includes(item.permission) ||
      (item.id === "settings" && canSettings),
  );

  const currentUser = profile?.user;

  const authenticate = async (
    event: FormEvent<HTMLFormElement>,
    values: AuthenticationValues,
  ) => {
    event.preventDefault();
    setAuthLoading(true);

    try {
      if (authMode === "register") {
        await api("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email: values.email,
            password: values.password,
            displayName: values.displayName,
          }),
        });
      } else {
        await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: values.email,
            password: values.password,
          }),
        });
      }

      setProfile(await loadProfile());
      setScreen("dashboard");
      notify(
        authMode === "register"
          ? "Tu cuenta quedó creada. ¡Bienvenido a Pastel!"
          : "Sesión iniciada correctamente.",
      );
    } catch (error) {
      notify(messageFrom(error), "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api("/api/auth/logout", {
        method: "POST",
        body: "{}",
      });
    } catch {
      // Clear local UI state even if the server session has expired.
    }

    setProfile(null);
    setScreen("dashboard");
    setAuthMode("login");
    await ensureCsrf().catch(() => undefined);
    notify("Cerraste la sesión.");
  };

  const changePassword = async (
    event: FormEvent<HTMLFormElement>,
    form: PasswordChangeValues,
  ) => {
    event.preventDefault();

    if (form.newPassword !== form.confirmation) {
      notify("Las contraseñas nuevas no coinciden.", "error");
      return;
    }

    const passwordIsValid =
      form.newPassword.length >= 12 &&
      /[A-Z]/.test(form.newPassword) &&
      /[a-z]/.test(form.newPassword) &&
      /\d/.test(form.newPassword) &&
      /[^A-Za-z0-9]/.test(form.newPassword);

    if (!passwordIsValid) {
      notify(
        "Usá al menos 12 caracteres, con mayúscula, minúscula, número y símbolo.",
        "error",
      );
      return;
    }

    setAuthLoading(true);

    try {
      await api("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      setProfile(null);
      setAuthMode("login");
      notify("Contraseña actualizada. Ingresá con tu nueva contraseña.");
    } catch (error) {
      notify(messageFrom(error), "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const toggleTheme = () => {
    setTheme((currentTheme) =>
      currentTheme === "light" ? "dark" : "light",
    );
  };

  if (busy) {
    return (
      <div className="startup-screen">
        <div className="brand-mark brand-mark-large">
          <Flower2 size={27} />
        </div>
        <span className="startup-title">Pastel</span>
        <div className="loading-line" />
        <p>Preparando tu espacio de trabajo…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <AuthScreen
        mode={authMode}
        setMode={setAuthMode}
        onSubmit={authenticate}
        loading={authLoading}
        theme={theme}
        toggleTheme={toggleTheme}
        notice={notice}
        dismissNotice={() => setNotice(null)}
      />
    );
  }

  if (currentUser?.mustChangePassword) {
    return (
      <ChangePasswordScreen
        user={currentUser}
        mandatory
        onSubmit={changePassword}
        loading={authLoading}
        theme={theme}
        toggleTheme={toggleTheme}
        notify={notify}
        onLogout={logout}
        notice={notice}
        dismissNotice={() => setNotice(null)}
      />
    );
  }

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
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            >
              {collapsed ? (
                <PanelLeftOpen size={19} />
              ) : (
                <PanelLeftClose size={19} />
              )}
            </button>
            <span className="breadcrumb">
              Workspace <span>/</span>{" "}
              <strong>
                {screen === "dashboard"
                  ? "Resumen"
                  : screen === "settings"
                    ? "Configuración"
                    : "Mi cuenta"}
              </strong>
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
              <span className="avatar">
                {(currentUser.displayName ?? "U")
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </span>
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
              onClick={() => void logout()}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="main-content">
          {screen === "dashboard" && (
            <Dashboard
              user={currentUser}
              permissions={profile.permissions}
              openSettings={() => setScreen("settings")}
              notify={notify}
            />
          )}
          {screen === "settings" && (
            <SettingsPage permissions={profile.permissions} notify={notify} />
          )}
          {screen === "profile" && (
            <ProfilePage
              user={currentUser}
              permissions={profile.permissions}
              onChangePassword={() =>
                notify(
                  "Para cambiar tu contraseña, completá el formulario que se abre a continuación.",
                )
              }
              onSubmitChangePassword={changePassword}
              loading={authLoading}
              notify={notify}
            />
          )}
        </main>

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

      <Toast notice={notice} onDismiss={() => setNotice(null)} />
    </div>
  );
}
