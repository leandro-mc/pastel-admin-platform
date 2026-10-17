import {
  CirclePlus,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import type { Module } from "../types";

type ModulesTabProps = {
  modules: Module[];
  can: (permission: string) => boolean;
  onCreateModule: () => void;
  onToggleModule: (module: Module) => void;
};

export default function ModulesTab({
  modules,
  can,
  onCreateModule,
  onToggleModule,
}: ModulesTabProps) {
  return (
    <div className="modules-layout">
      <div className="section-intro">
        <div>
          <h2>Catálogo de módulos</h2>
          <p>
            Los nuevos módulos generan permisos que luego podés asignar a roles
            y usuarios.
          </p>
        </div>
        {can("settings.modules.manage") && (
          <button
            className="button button-primary"
            onClick={onCreateModule}
          >
            <CirclePlus size={16} /> Registrar módulo
          </button>
        )}
      </div>

      <div className="module-grid">
        {modules.map((module) => (
          <article className="module-card" key={module.id}>
            <div className="module-card-head">
              <div className="module-symbol">
                <CirclePlus size={20} />
              </div>
              <span
                className={
                  module.isEnabled
                    ? "status status-active"
                    : "status status-blocked"
                }
              >
                <span />
                {module.isEnabled ? "Activo" : "Desactivado"}
              </span>
            </div>
            <h3>{module.name}</h3>
            <div className="module-code">{module.code}</div>
            <p>
              {module.description || "Módulo registrado en la plataforma."}
            </p>

            <div className="module-permissions">
              <strong>{module.permissions.length} permisos</strong>
              <div>
                {module.permissions.slice(0, 4).map((permission) => (
                  <span className="chip" key={permission.id}>
                    {permission.code}
                  </span>
                ))}
                {module.permissions.length > 4 && (
                  <span className="chip">
                    +{module.permissions.length - 4}
                  </span>
                )}
              </div>
            </div>

            {can("settings.modules.manage") && (
              <button
                className="button button-soft full-width"
                onClick={() => onToggleModule(module)}
                disabled={module.code === "settings"}
              >
                {module.isEnabled ? (
                  <ToggleRight size={17} />
                ) : (
                  <ToggleLeft size={17} />
                )}
                {module.isEnabled ? "Desactivar módulo" : "Activar módulo"}
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
