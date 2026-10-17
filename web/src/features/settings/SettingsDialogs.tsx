import type { Dispatch, FormEvent, SetStateAction } from "react";
import { KeyRound, X } from "lucide-react";
import type { Notify } from "../../types";
import type {
  Module,
  NewModuleForm,
  NewRoleForm,
  NewUserForm,
  Permission,
  Role,
} from "./types";

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
      <form className="modal modal-wide" onSubmit={onSubmit}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">CONTROL DE ACCESO</span>
            <h2>Crear rol</h2>
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

type CreateModuleDialogProps = {
  newModule: NewModuleForm;
  setNewModule: Dispatch<SetStateAction<NewModuleForm>>;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

export function CreateModuleDialog({
  newModule,
  setNewModule,
  saving,
  onSubmit,
  onClose,
}: CreateModuleDialogProps) {
  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={onSubmit}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">EXTENDER LA PLATAFORMA</span>
            <h2>Registrar módulo</h2>
            <p>Se crearán permisos por cada acción indicada.</p>
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
            Nombre del módulo
            <input
              required
              minLength={2}
              maxLength={100}
              value={newModule.name}
              onChange={(event) =>
                setNewModule((current) => ({
                  ...current,
                  name: event.target.value,
                  code:
                    current.code ||
                    event.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-"),
                }))
              }
            />
          </label>
          <label className="field-label">
            Código único
            <input
              required
              pattern="[a-z][a-z0-9-]{1,62}"
              minLength={2}
              maxLength={64}
              value={newModule.code}
              onChange={(event) =>
                setNewModule((current) => ({
                  ...current,
                  code: event.target.value,
                }))
              }
            />
            <small>
              Minúsculas, números y guiones; debe iniciar con una letra.
            </small>
          </label>
          <label className="field-label">
            Descripción
            <textarea
              rows={2}
              maxLength={500}
              value={newModule.description}
              onChange={(event) =>
                setNewModule((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </label>
          <label className="field-label">
            Acciones separadas por coma
            <input
              required
              value={newModule.actions}
              onChange={(event) =>
                setNewModule((current) => ({
                  ...current,
                  actions: event.target.value,
                }))
              }
            />
            <small>
              Ejemplo: read, create, update, delete, export. Se crearán
              permisos como inventario.read.
            </small>
          </label>
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
            {saving ? "Registrando…" : "Registrar módulo"}
          </button>
        </div>
      </form>
    </div>
  );
}

type TemporaryPasswordDialogProps = {
  password: string;
  onClose: () => void;
  notify: Notify;
};

export function TemporaryPasswordDialog({
  password,
  onClose,
  notify,
}: TemporaryPasswordDialogProps) {
  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      notify("Contraseña copiada al portapapeles.", "success");
    } catch {
      notify(
        "No se pudo copiar automáticamente. Copiá la contraseña manualmente.",
        "error",
      );
    }
  };

  return (
    <div className="modal-backdrop">
      <section className="modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <span className="eyebrow">RESTABLECIMIENTO COMPLETO</span>
            <h2>Contraseña temporal</h2>
            <p>
              Copiala ahora y entregala al usuario por un canal seguro. No se
              volverá a mostrar.
            </p>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={19} />
          </button>
        </div>

        <div className="modal-content">
          <div className="temporary-password">{password}</div>
          <button
            className="button button-soft full-width"
            onClick={() => void copyPassword()}
          >
            <KeyRound size={16} /> Copiar contraseña
          </button>
        </div>

        <div className="modal-actions">
          <button className="button button-primary" onClick={onClose}>
            Listo, ya la guardé
          </button>
        </div>
      </section>
    </div>
  );
}
