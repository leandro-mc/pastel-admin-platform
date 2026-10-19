import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { useAuth, useAuthOptions } from "@/core/auth";
import { FormAlert } from "../components/FormAlert";
import { GoogleButton } from "../components/GoogleButton";
import { PasswordLoginForm } from "../components/PasswordLoginForm";
import { RegisterForm } from "../components/RegisterForm";
import { describeError } from "../errors";
import { safeReturnUrl } from "../returnUrl";
import { googleErrorMessage, identityStrings } from "../strings";
import { card, errorAlert, linkButton, secondaryButton } from "../styles";

const t = identityStrings;

/** `/ingresar`: Google como método principal; contraseña y registro solo si el servidor los habilita. */
export function Component() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const options = useAuthOptions();
  const returnUrl = safeReturnUrl(params.get("returnUrl"));
  const googleError = googleErrorMessage(params.get("error"));
  const registering = params.get("modo") === "registro";
  const [showPassword, setShowPassword] = useState(false);

  if (auth.status === "authenticated") {
    return <Navigate to={returnUrl} replace />;
  }

  const done = () => void navigate(returnUrl, { replace: true });
  const setMode = (mode: "ingreso" | "registro") => {
    const next = new URLSearchParams(params);
    next.delete("error");
    if (mode === "registro") next.set("modo", "registro");
    else next.delete("modo");
    setParams(next, { replace: true });
  };

  return (
    <section className="flex justify-center p-4 sm:p-8">
      <div className={`${card} flex flex-col gap-5`}>
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-fg">
            {registering ? t.register.title : t.login.title}
          </h1>
          <p className="text-sm text-muted">
            {registering ? t.register.subtitle : t.login.subtitle}
          </p>
        </header>

        {auth.sessionExpired ? (
          <p
            role="status"
            className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-fg"
          >
            {t.login.expired}
          </p>
        ) : null}
        {googleError ? (
          <p role="alert" className={errorAlert}>
            {googleError}
          </p>
        ) : null}

        {options.isPending ? (
          <p role="status" className="text-sm text-muted">
            {t.login.loadingOptions}
          </p>
        ) : options.isError ? (
          <div className="flex flex-col gap-3">
            <FormAlert
              error={describeError(options.error, t.login.optionsError)}
            />
            <button
              type="button"
              onClick={() => void options.refetch()}
              className={secondaryButton}
            >
              {t.login.retry}
            </button>
          </div>
        ) : registering && options.data.localRegistration ? (
          <>
            <RegisterForm
              policy={options.data.passwordPolicy}
              onSuccess={done}
            />
            <button
              type="button"
              onClick={() => setMode("ingreso")}
              className={linkButton}
            >
              {t.register.toLogin}
            </button>
          </>
        ) : (
          <>
            {options.data.google ? (
              <GoogleButton returnUrl={returnUrl} />
            ) : null}
            {options.data.localLogin ? (
              options.data.google && !showPassword ? (
                <button
                  type="button"
                  onClick={() => setShowPassword(true)}
                  className={linkButton}
                >
                  {t.login.withPassword}
                </button>
              ) : (
                <PasswordLoginForm onSuccess={done} />
              )
            ) : null}
            {!options.data.google && !options.data.localLogin ? (
              <p role="alert" className={errorAlert}>
                {t.login.noMethods}
              </p>
            ) : null}
            {options.data.localLogin && options.data.localRegistration ? (
              <button
                type="button"
                onClick={() => setMode("registro")}
                className={linkButton}
              >
                {t.login.toRegister}
              </button>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
