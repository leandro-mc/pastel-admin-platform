import type { Dispatch, FormEvent, SetStateAction } from "react";
import { X } from "lucide-react";
import type { NewModuleForm } from "../types";

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
