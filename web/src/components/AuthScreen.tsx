import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Flower2,
  KeyRound,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react";
import Toast from "./Toast";
import type { AuthenticationValues, Notice } from "../types";

type AuthScreenProps = {
  mode: "login" | "register";
  setMode: (mode: "login" | "register") => void;
  onSubmit: (
    event: FormEvent<HTMLFormElement>,
    values: AuthenticationValues,
  ) => Promise<void>;
  loading: boolean;
  theme: "light" | "dark";
  toggleTheme: () => void;
  notice: Notice | null;
  dismissNotice: () => void;
};

export default function AuthScreen({
  mode,
  setMode,
  onSubmit,
  loading,
  theme,
  toggleTheme,
  notice,
  dismissNotice,
}: AuthScreenProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const isRegister = mode === "register";

  return (
    <div className="auth-screen">
      <div className="auth-topbar">
        <div className="brand-lockup">
          <span className="brand-mark">
            <Flower2 size={22} />
          </span>
          <span className="brand-wordmark">
            <strong>pastel</strong>
            <small>WORKSPACE</small>
          </span>
        </div>
        <button
          className="icon-button theme-switch"
          aria-label="Cambiar tema"
          onClick={toggleTheme}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>

      <div className="auth-layout">
        <section className="auth-story">
          <span className="eyebrow">UN ESPACIO PARA CRECER</span>
          <h1>
            Todo en su lugar.
            <br />
            <span>Todo fluye mejor.</span>
          </h1>
          <p>
            Una forma más tranquila de gestionar tu equipo, organizar accesos
            y construir algo grande.
          </p>

          <div className="auth-feature-list">
            <div>
              <span>
                <ShieldCheck size={18} />
              </span>
              <div>
                <strong>Seguridad por diseño</strong>
                <small>Accesos claros y controlados desde el inicio.</small>
              </div>
            </div>
            <div>
              <span>
                <Flower2 size={18} />
              </span>
              <div>
                <strong>Simple y ordenado</strong>
                <small>Una experiencia limpia que no se interpone.</small>
              </div>
            </div>
            <div>
              <span>
                <Flower2 size={18} />
              </span>
              <div>
                <strong>Preparado para crecer</strong>
                <small>Una base modular para todo lo que sigue.</small>
              </div>
            </div>
          </div>

          <div className="auth-orbit-art" aria-hidden="true">
            <div className="auth-orbit-ring" />
            <div className="auth-orbit-core">
              <Flower2 size={62} strokeWidth={1.2} />
            </div>
            <span className="auth-orbit-dot dot-a" />
            <span className="auth-orbit-dot dot-b" />
            <span className="auth-orbit-dot dot-c" />
          </div>
        </section>

        <section className="auth-card-wrap">
          <form
            className="auth-card"
            onSubmit={(event) =>
              void onSubmit(event, {
                email,
                password,
                displayName: name,
              })
            }
          >
            <span className="auth-card-icon">
              <KeyRound size={21} />
            </span>
            <span className="eyebrow">
              {isRegister
                ? "CREÁ TU ESPACIO"
                : "QUÉ BUENO TENERTE DE VUELTA"}
            </span>
            <h2>{isRegister ? "Crear una cuenta" : "Iniciar sesión"}</h2>
            <p className="auth-subtitle">
              {isRegister
                ? "Completá tus datos para comenzar."
                : "Ingresá tus datos para continuar."}
            </p>

            {isRegister && (
              <label className="field-label">
                Nombre completo
                <input
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Cómo te llamás"
                />
              </label>
            )}

            <label className="field-label">
              Correo electrónico
              <input
                autoComplete="email"
                type="email"
                required
                maxLength={320}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nombre@correo.com"
              />
            </label>

            <label className="field-label">
              Contraseña
              <div className="password-field">
                <input
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={isRegister ? 12 : 1}
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={
                    isRegister ? "Al menos 12 caracteres" : "Tu contraseña"
                  }
                />
                <button
                  type="button"
                  className="password-eye"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={17} />
                  ) : (
                    <Eye size={17} />
                  )}
                </button>
              </div>
              {isRegister && (
                <small>
                  12+ caracteres, mayúscula, minúscula, número y símbolo.
                </small>
              )}
            </label>

            {!isRegister && (
              <div className="auth-inline-note">
                <ShieldCheck size={15} />
                Conexión protegida y sesión cifrada.
              </div>
            )}

            <button
              className="button button-primary auth-submit"
              disabled={loading}
            >
              {loading ? <span className="button-spinner" /> : null}
              {isRegister ? "Crear mi cuenta" : "Entrar a mi espacio"}
              <ArrowRight size={16} />
            </button>

            <div className="auth-switch">
              {isRegister
                ? "¿Ya tenés una cuenta?"
                : "¿Es tu primera vez acá?"}
              <button
                type="button"
                onClick={() => setMode(isRegister ? "login" : "register")}
              >
                {isRegister ? "Iniciá sesión" : "Creá una cuenta"}
              </button>
            </div>

            <div className="auth-legal">
              Al continuar, aceptás usar este espacio de forma responsable y
              segura.
            </div>
          </form>

          <div className="auth-trust">
            <span>
              <LockKeyRoundIcon /> Sesión protegida
            </span>
            <span aria-hidden="true">•</span>
            <span>Privacidad primero</span>
          </div>
        </section>
      </div>

      <footer className="auth-footer">
        <span>© {new Date().getFullYear()} Pastel Workspace</span>
        <span>
          Hecho para crecer con vos <Flower2 size={13} />
        </span>
      </footer>

      <Toast notice={notice} onDismiss={dismissNotice} />
    </div>
  );
}

function LockKeyRoundIcon() {
  return <ShieldCheck size={14} />;
}
