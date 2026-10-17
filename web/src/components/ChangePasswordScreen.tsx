import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  CircleHelp,
  Flower2,
  Eye,
  EyeOff,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react";
import type {
  Notice,
  PasswordChangeValues,
  User,
} from "../types";

type ChangePasswordScreenProps = {
  user: User;
  mandatory: boolean;
  onSubmit: (
    event: FormEvent<HTMLFormElement>,
    form: PasswordChangeValues,
  ) => Promise<void>;
  loading: boolean;
  theme: "light" | "dark";
  toggleTheme: () => void;
  notify: (message: string, tone?: "success" | "error") => void;
  onLogout: () => void;
  notice: Notice | null;
  dismissNotice: () => void;
};

export default function ChangePasswordScreen({
  user,
  mandatory,
  onSubmit,
  loading,
  theme,
  toggleTheme,
  notify,
  onLogout,
  notice,
  dismissNotice,
}: ChangePasswordScreenProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-change-screen">
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

        <div className="auth-top-actions">
          <button
            className="icon-button theme-switch"
            aria-label="Cambiar tema"
            onClick={toggleTheme}
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button className="button button-soft" onClick={onLogout}>
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </div>

      <form
        className="password-change-card"
        onSubmit={(event) =>
          void onSubmit(event, {
            currentPassword,
            newPassword,
            confirmation,
          })
        }
      >
        <div className="password-shield">
          <ShieldCheck size={28} />
        </div>
        <span className="eyebrow">
          {mandatory ? "PRIMER INGRESO" : "SEGURIDAD DE TU CUENTA"}
        </span>
        <h1>
          {mandatory
            ? "Un último paso para empezar"
            : "Actualizá tu contraseña"}
        </h1>
        <p>
          {mandatory
            ? `Hola ${user.displayName.split(" ")[0]}, te asignaron una contraseña temporal. Elegí una nueva para proteger tu cuenta y continuar.`
            : "Elegí una contraseña sólida que no uses en otros servicios."}
        </p>

        <label className="field-label">
          {mandatory ? "Contraseña temporal" : "Contraseña actual"}
          <input
            required
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>

        <label className="field-label">
          Contraseña nueva
          <div className="password-field">
            <input
              required
              minLength={12}
              maxLength={128}
              type={visible ? "text" : "password"}
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <button
              type="button"
              className="password-eye"
              aria-label={
                visible ? "Ocultar contraseña" : "Mostrar contraseña"
              }
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </label>

        <label className="field-label">
          Confirmar contraseña
          <input
            required
            minLength={12}
            maxLength={128}
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </label>

        <div className="password-requirements">
          <strong>Tu contraseña debe incluir:</strong>
          <span
            className={
              newPassword.length >= 12 ? "requirement checked" : "requirement"
            }
          >
            <Check size={14} /> 12 caracteres como mínimo
          </span>
          <span
            className={
              /[A-Z]/.test(newPassword) ? "requirement checked" : "requirement"
            }
          >
            <Check size={14} /> Una letra mayúscula y minúscula
          </span>
          <span
            className={
              /\d/.test(newPassword) ? "requirement checked" : "requirement"
            }
          >
            <Check size={14} /> Un número
          </span>
          <span
            className={
              /[^A-Za-z0-9]/.test(newPassword)
                ? "requirement checked"
                : "requirement"
            }
          >
            <Check size={14} /> Un símbolo
          </span>
        </div>

        <button
          className="button button-primary auth-submit"
          disabled={loading}
        >
          {loading ? "Actualizando…" : "Guardar contraseña"}
          <ArrowRight size={16} />
        </button>
        <button
          type="button"
          className="text-button full-width center-text"
          onClick={() =>
            notify(
              "No compartás la contraseña temporal por canales públicos.",
              "error",
            )
          }
        >
          Consejos para cuidar tu cuenta
        </button>
      </form>

      <footer className="auth-footer">
        <span>© {new Date().getFullYear()} Pastel Workspace</span>
        <span>
          Tu seguridad es parte de todo <Flower2 size={13} />
        </span>
      </footer>

      {notice && (
        <div role="status" className={`toast ${notice.tone}`}>
          <span className="toast-symbol">
            {notice.tone === "success" ? (
              <Check size={17} />
            ) : (
              <CircleHelp size={17} />
            )}
          </span>
          <span>{notice.message}</span>
          <button
            className="toast-close"
            onClick={dismissNotice}
            aria-label="Cerrar aviso"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
