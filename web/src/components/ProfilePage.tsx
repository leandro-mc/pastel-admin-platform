import { useState, type FormEvent } from "react";
import {
  Activity,
  Check,
  CircleHelp,
  Flower2,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import type { Notice, Notify, PasswordChangeValues, User } from "../types";

type ProfilePageProps = {
  user: User;
  permissions: string[];
  onChangePassword: () => void;
  onSubmitChangePassword: (
    event: FormEvent<HTMLFormElement>,
    form: PasswordChangeValues,
  ) => Promise<void>;
  loading: boolean;
  notify: Notify;
};

export default function ProfilePage({
  user,
  permissions,
  onChangePassword,
  onSubmitChangePassword,
  loading,
  notify,
}: ProfilePageProps) {
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  return (
    <div className="profile-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">TU ESPACIO PERSONAL</span>
          <h1>Mi cuenta</h1>
          <p>Revisá tu perfil y mantené tu acceso bajo control.</p>
        </div>
      </div>

      <div className="profile-layout">
        <section className="panel profile-main">
          <div className="profile-banner">
            <div className="avatar avatar-large">
              {user.displayName
                .split(" ")
                .map((part) => part[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div>
              <h2>{user.displayName}</h2>
              <p>{user.email}</p>
              <span className="status status-active">
                <span /> Cuenta activa
              </span>
            </div>
          </div>

          <div className="profile-details">
            <div>
              <span>Nombre de usuario</span>
              <strong>{user.displayName}</strong>
            </div>
            <div>
              <span>Correo electrónico</span>
              <strong>{user.email}</strong>
            </div>
            <div>
              <span>Fecha de alta</span>
              <strong>
                {new Intl.DateTimeFormat("es-CR", {
                  dateStyle: "long",
                }).format(new Date(user.createdAt))}
              </strong>
            </div>
            <div>
              <span>Roles asignados</span>
              <strong>{user.roles.join(", ") || "Sin roles"}</strong>
            </div>
          </div>

          <div className="profile-card-footer">
            <div>
              <strong>¿Necesitás actualizar tus datos?</strong>
              <p>
                Por ahora, la edición del perfil está deshabilitada para
                mantener la información consistente.
              </p>
            </div>
            <button
              className="button button-soft"
              onClick={() =>
                notify(
                  "Solicitá a administración que actualice tu nombre de perfil.",
                )
              }
            >
              Solicitar cambio
            </button>
          </div>
        </section>

        <section className="panel profile-security">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">PROTECCIÓN</span>
              <h2>Seguridad</h2>
              <p>Tu acceso se revisa en cada solicitud.</p>
            </div>
            <div className="security-big-icon">
              <ShieldCheck size={24} />
            </div>
          </div>

          <div className="security-detail">
            <span className="security-detail-icon">
              <KeyRound size={17} />
            </span>
            <div>
              <strong>Contraseña</strong>
              <p>Actualizala periódicamente y no la compartás.</p>
            </div>
            <button
              className="button button-soft"
              onClick={() => {
                onChangePassword();
                setPasswordDialog(true);
              }}
            >
              Cambiar
            </button>
          </div>

          <div className="security-detail">
            <span className="security-detail-icon">
              <ShieldCheck size={17} />
            </span>
            <div>
              <strong>Autorización</strong>
              <p>Tenés {permissions.length} permisos efectivos.</p>
            </div>
          </div>

          <div className="security-detail">
            <span className="security-detail-icon">
              <Activity size={17} />
            </span>
            <div>
              <strong>Sesión</strong>
              <p>Tokens de corta duración y renovación rotativa.</p>
            </div>
          </div>
        </section>
      </div>

      {passwordDialog && (
        <div className="modal-backdrop">
          <form
            className="modal"
            onSubmit={(event) => {
              void onSubmitChangePassword(event, {
                currentPassword,
                newPassword,
                confirmation,
              }).then(() => setPasswordDialog(false));
            }}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">ACTUALIZAR ACCESO</span>
                <h2>Cambiar contraseña</h2>
                <p>Al guardar, tu sesión actual se cerrará.</p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Cerrar"
                onClick={() => setPasswordDialog(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-content">
              <label className="field-label">
                Contraseña actual
                <input
                  required
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </label>
              <label className="field-label">
                Contraseña nueva
                <input
                  required
                  minLength={12}
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </label>
              <label className="field-label">
                Confirmar contraseña
                <input
                  required
                  minLength={12}
                  type="password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="button button-soft"
                onClick={() => setPasswordDialog(false)}
              >
                Cancelar
              </button>
              <button className="button button-primary" disabled={loading}>
                Guardar y cerrar sesión
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
