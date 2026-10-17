import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Flower2 } from "lucide-react";
import AuthScreen from "./components/AuthScreen";
import ChangePasswordScreen from "./components/ChangePasswordScreen";
import Dashboard from "./components/Dashboard";
import ProfilePage from "./components/ProfilePage";
import WorkspaceLayout from "./components/WorkspaceLayout";
import SettingsPage from "./SettingsPage";
import { api, ApiError, ensureCsrf } from "./lib/api";
import type {
  AuthenticationValues,
  Notice,
  PasswordChangeValues,
  Profile,
  Screen,
} from "./types";

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
    <WorkspaceLayout
      currentUser={currentUser}
      permissions={profile.permissions}
      screen={screen}
      setScreen={setScreen}
      collapsed={collapsed}
      setCollapsed={setCollapsed}
      theme={theme}
      toggleTheme={toggleTheme}
      notify={notify}
      onLogout={logout}
      notice={notice}
      dismissNotice={() => setNotice(null)}
    >
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
    </WorkspaceLayout>
  );
}
