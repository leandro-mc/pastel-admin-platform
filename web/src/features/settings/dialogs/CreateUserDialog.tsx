import type { Dispatch, FormEvent, SetStateAction } from "react";
import { X } from "lucide-react";
import type { NewUserForm, Role } from "../types";

type CreateUserDialogProps = {
  newUser: NewUserForm;
  setNewUser: Dispatch<SetStateAction<NewUserForm>>;
  roles: Role[];
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

export function CreateUserDialog({
  newUser,
  setNewUser,
  roles,
  saving,
  onSubmit,
  onClose,
}: CreateUserDialogProps) {
  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={onSubmit}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">NUEVA CUENTA</span>
            <h2>Crear usuario</h2>
            <p>
              La persona deberá reemplazar su contraseña temporal al ingresar.
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={19} />
          </button>
        </div>

        <div className="modal-content">
          <label className="field-label">
            Nombre completo
            <input
              required
              minLength={2}
              maxLength={100}
              value={newUser.displayName}
              onChange={(event) =>
                setNewUser((current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
            />
          </label>
          <label className="field-label">
            Correo electrónico
            <input
              required
              type="email"
              maxLength={320}
              value={newUser.email}
              onChange={(event) =>
                setNewUser((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
            />
          </label>
          <label className="field-label">
            Contraseña temporal
            <input
              required
              minLength={12}
              maxLength={128}
              type="password"
              autoComplete="new-password"
              value={newUser.temporaryPassword}
              onChange={(event) =>
                setNewUser((current) => ({
                  ...current,
                  temporaryPassword: event.target.value,
                }))
              }
            />
            <small>
              12 caracteres o más, con mayúscula, minúscula, número y símbolo.
            </small>
          </label>

          <h3>Asignar roles</h3>
          <div className="choice-list">
            {roles.map((role) => (
              <label className="choice-row" key={role.id}>
                <input
                  type="checkbox"
                  checked={newUser.roleIds.includes(role.id)}
                  onChange={(event) =>
                    setNewUser((current) => ({
                      ...current,
                      roleIds: event.target.checked
                        ? [...current.roleIds, role.id]
                        : current.roleIds.filter((id) => id !== role.id),
                    }))
                  }
                />
                <span>
                  <strong>{role.name}</strong>
                  <small>{role.description || ""}</small>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="button button-soft"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className="button button-primary" disabled={saving}>
            {saving ? "Creando…" : "Crear usuario"}
          </button>
        </div>
      </form>
    </div>
  );
}
