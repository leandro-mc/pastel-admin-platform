import type { Dispatch, FormEvent, SetStateAction } from "react";
import { X } from "lucide-react";
import type { NewRoleForm, Permission } from "../types";

type CreateRoleDialogProps = {
  newRole: NewRoleForm;
  setNewRole: Dispatch<SetStateAction<NewRoleForm>>;
  permissionGroups: Record<string, Permission[]>;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

export function CreateRoleDialog({
  newRole,
  setNewRole,
  permissionGroups,
  saving,
  onSubmit,
  onClose,
}: CreateRoleDialogProps) {
  return (
    <div className="modal-backdrop">
      <form
        className="modal modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-role-title"
        onSubmit={onSubmit}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">CONTROL DE ACCESO</span>
            <h2 id="create-role-title">Crear rol</h2>
            <p>
              Un rol agrupa permisos que se pueden asignar a varias cuentas.
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
            Nombre del rol
            <input
              required
              minLength={2}
              maxLength={64}
              value={newRole.name}
              onChange={(event) =>
                setNewRole((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </label>
          <label className="field-label">
            Descripción
            <textarea
              maxLength={500}
              rows={2}
              value={newRole.description}
              onChange={(event) =>
                setNewRole((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </label>

          <h3>Permisos iniciales</h3>
          {Object.entries(permissionGroups).map(([group, permissions]) => (
            <div className="permission-group" key={group}>
              <h3>{group}</h3>
              {permissions.map((permission) => (
                <label className="permission-row" key={permission.id}>
                  <input
                    type="checkbox"
                    checked={newRole.permissionIds.includes(permission.id)}
                    onChange={(event) =>
                      setNewRole((current) => ({
                        ...current,
                        permissionIds: event.target.checked
                          ? [...current.permissionIds, permission.id]
                          : current.permissionIds.filter(
                              (id) => id !== permission.id,
                            ),
                      }))
                    }
                  />
                  <span>
                    <strong>{permission.name}</strong>
                    <small>{permission.code}</small>
                  </span>
                </label>
              ))}
            </div>
          ))}
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
            {saving ? "Creando…" : "Crear rol"}
          </button>
        </div>
      </form>
    </div>
  );
}
