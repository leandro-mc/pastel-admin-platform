import { useState } from "react";
import { Flower2, KeyRound, LayoutGrid, Moon, ShieldCheck, Sun } from "lucide-react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { useAuth, useAuthOptions } from "@/core/auth";
import { usePreferences } from "@/core/preferences";
import { routes } from "@/core/routes";
import { getRememberedAppPath } from "@/app/modules";
import { FormAlert } from "../components/FormAlert";
import { GoogleButton } from "../components/GoogleButton";
import { PasswordLoginForm } from "../components/PasswordLoginForm";
import { RegisterForm } from "../components/RegisterForm";
import { describeError } from "../errors";
import { isSafeReturnUrl, safeReturnUrl } from "../returnUrl";
import { googleErrorMessage, identityStrings } from "../strings";
import { card, errorAlert, linkButton, secondaryButton } from "../styles";

const t = identityStrings;

const benefits = [
  { icon: ShieldCheck, title: "Seguridad por diseño", text: "Accesos claros y controlados desde el inicio." },
  { icon: Flower2, title: "Simple y ordenado", text: "Una experiencia tranquila que no se interpone." },
  { icon: LayoutGrid, title: "Preparado para crecer", text: "Aplicaciones distintas, un acceso compartido." },
];

/** `/ingresar`: Google como método principal; contraseña y registro solo si el servidor los habilita. */
export function Component() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const options = useAuthOptions();
  const { theme, toggleTheme } = usePreferences();
  const requestedReturnUrl = params.get("returnUrl");
  const explicitReturnUrl = isSafeReturnUrl(requestedReturnUrl)
    ? safeReturnUrl(requestedReturnUrl)
    : null;
  const returnUrl = explicitReturnUrl
    ?? (auth.status === "authenticated" && auth.user?.id
      ? getRememberedAppPath(auth.user.id) ?? routes.home
      : routes.home);
  const googleError = googleErrorMessage(params.get("error"));
  const registering = params.get("modo") === "registro";
  const [showPassword, setShowPassword] = useState(false);

  if (auth.status === "authenticated") {
    return <Navigate to={returnUrl} replace />;
  }

  const done = () => {
    // Con returnUrl explícito podemos navegar inmediatamente. Sin él, dejar que la
    // sesión autenticada resuelva la app recordada por usuario en el siguiente render.
    if (explicitReturnUrl) void navigate(explicitReturnUrl, { replace: true });
  };
  const setMode = (mode: "ingreso" | "registro") => {
    const next = new URLSearchParams(params);
    next.delete("error");
    if (mode === "registro") next.set("modo", "registro");
    else next.delete("modo");
    setParams(next, { replace: true });
  };

  return (
    <div className="auth-page flex min-h-screen flex-col">
      <header className="auth-topbar flex items-center justify-between gap-4">
        <Link to={routes.home} className="auth-brand inline-flex items-center gap-3" aria-label="Pastel, ir al inicio">
          <span className="auth-brand-mark grid place-items-center">
            <Flower2 aria-hidden="true" size={23} strokeWidth={1.7} />
          </span>
          <span className="auth-brand-copy flex flex-col">
            <strong>pastel</strong>
            <small>WORKSPACE</small>
          </span>
        </Link>
        <button
          type="button"
          className="auth-theme-button grid size-11 place-items-center"
          aria-label={theme === "light" ? "Activar modo oscuro" : "Activar modo claro"}
          title={theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
          onClick={toggleTheme}
        >
          {theme === "light" ? (
            <Moon aria-hidden="true" size={19} />
          ) : (
            <Sun aria-hidden="true" size={19} />
          )}
        </button>
      </header>

      <main className="auth-main mx-auto grid w-full gap-8">
        <section className="auth-story relative overflow-hidden rounded-3xl border" aria-labelledby="auth-story-title">
          <div className="auth-story-content relative z-10 max-w-2xl">
            <span className="auth-eyebrow inline-flex items-center gap-2">Un espacio para crecer</span>
            <h2 id="auth-story-title" className="auth-hero-title font-semibold leading-tight tracking-tight">
              Todo en su lugar.
              <br />
              <span>Todo fluye mejor.</span>
            </h2>
            <p className="auth-hero-copy leading-relaxed">
              Una forma más tranquila de gestionar su equipo, organizar accesos y
              construir algo grande.
            </p>
            <div className="auth-feature-list grid gap-3">
              {benefits.map(({ icon: Icon, title, text }) => (
                <div className="auth-feature grid items-center gap-3" key={title}>
                  <span className="auth-feature-icon grid size-11 place-items-center">
                    <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
                  </span>
                  <span className="auth-feature-copy flex flex-col gap-1">
                    <strong>{title}</strong>
                    <small>{text}</small>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="auth-orbit-art absolute grid aspect-square place-items-center" aria-hidden="true">
            <div className="auth-orbit-ring absolute aspect-square rounded-full" />
            <div className="auth-orbit-core relative grid size-24 place-items-center">
              <Flower2 size={54} strokeWidth={1.25} />
            </div>
            <span className="auth-orbit-dot auth-orbit-dot-a absolute block rounded-full" />
            <span className="auth-orbit-dot auth-orbit-dot-b absolute block rounded-full" />
            <span className="auth-orbit-dot auth-orbit-dot-c absolute block rounded-full" />
          </div>
        </section>

        <section className="auth-card-column flex w-full items-center justify-center" aria-label={registering ? "Registro de cuenta" : "Ingreso a Pastel"}>
          <div className={[card, "auth-form-card", "flex flex-col gap-5"].join(" ")}>
            <header className="flex flex-col gap-1">
              <span className="auth-card-kicker inline-flex size-11 items-center justify-center">
                <KeyRound aria-hidden="true" size={21} />
              </span>
              <span className="auth-eyebrow inline-flex items-center gap-2">
                {registering ? "Crear su espacio" : "Qué bueno tenerle de vuelta"}
              </span>
              <h1 className="auth-form-heading text-2xl font-semibold tracking-tight">
                {registering ? t.register.title : t.login.title}
              </h1>
              <p className="auth-form-subtitle text-sm leading-relaxed">
                {registering ? t.register.subtitle : t.login.subtitle}
              </p>
            </header>

            {auth.sessionExpired ? (
              <p role="status" className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-fg">
                {t.login.expired}
              </p>
            ) : null}
            {googleError ? <p role="alert" className={errorAlert}>{googleError}</p> : null}

            {options.isPending ? (
              <p role="status" className="text-sm text-muted">{t.login.loadingOptions}</p>
            ) : options.isError ? (
              <div className="flex flex-col gap-3">
                <FormAlert error={describeError(options.error, t.login.optionsError)} />
                <button type="button" onClick={() => void options.refetch()} className={secondaryButton}>
                  {t.login.retry}
                </button>
              </div>
            ) : registering && options.data.localRegistration ? (
              <>
                <RegisterForm policy={options.data.passwordPolicy} onSuccess={done} />
                <button type="button" onClick={() => setMode("ingreso")} className={linkButton}>
                  {t.register.toLogin}
                </button>
              </>
            ) : (
              <>
                {options.data.google ? <GoogleButton returnUrl={returnUrl} /> : null}
                {options.data.localLogin ? (
                  options.data.google && !showPassword ? (
                    <button type="button" onClick={() => setShowPassword(true)} className={linkButton}>
                      {t.login.withPassword}
                    </button>
                  ) : (
                    <PasswordLoginForm onSuccess={done} />
                  )
                ) : null}
                {!options.data.google && !options.data.localLogin ? (
                  <p role="alert" className={errorAlert}>{t.login.noMethods}</p>
                ) : null}
                {options.data.localLogin && options.data.localRegistration ? (
                  <button type="button" onClick={() => setMode("registro")} className={linkButton}>
                    {t.login.toRegister}
                  </button>
                ) : null}
              </>
            )}
          </div>
        </section>
      </main>

      <footer className="auth-footer flex flex-wrap items-center justify-between gap-3 border-t py-4 text-sm">
        <span>© {new Date().getFullYear()} Pastel Workspace</span>
        <span className="auth-footer-note inline-flex items-center gap-2">
          Su seguridad es parte de todo
          <Flower2 aria-hidden="true" size={15} />
        </span>
      </footer>
    </div>
  );
}
