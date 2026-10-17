import { ShieldCheck } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type {
  PermissionEffect,
  PermissionGroup,
} from "../types";

type UserDirectPermissionsSectionProps = {
  userHasAdministratorRole: boolean;
  loadingPermissions: boolean;
  groups: PermissionGroup[];
  catalogCount: number;
  selectedCount: number;
  userOverrides: Record<string, PermissionEffect>;
  setUserOverrides: Dispatch<SetStateAction<Record<string, PermissionEffect>>>;
};

export default function UserDirectPermissionsSection({
  userHasAdministratorRole,
  loadingPermissions,
  groups,
  catalogCount,
  selectedCount,
  userOverrides,
  setUserOverrides,
}: UserDirectPermissionsSectionProps) {
  if (userHasAdministratorRole) {
    return (
      <div className="access-editor-notice">
        <ShieldCheck size={19} />
        <div>
          <strong>Acceso de administrador</strong>
          <p>
            Esta cuenta tiene el rol Administrator. Las excepciones directas
            no se editan mientras ese rol esté asignado.
          </p>
        </div>
      </div>
    );
  }

  if (loadingPermissions) {
    return (
      <section className="access-editor-loading" role="status">
        <span className="button-spinner" />
        <div>
          <strong>Cargando permisos directos…</strong>
          <p>
            Estamos consultando las excepciones actuales de esta cuenta.
          </p>
        </div>
      </section>
    );
  }

  const totalVisible = groups.reduce(
    (total, group) => total + group.permissions.length,
    0,
  );

  return (
    <section className="access-editor-section">
      <div className="access-section-heading">
        <div>
          <h2>Permisos directos</h2>
          <p>
            Usá Conceder o Denegar para establecer una excepción. Heredar
            respeta los permisos de los roles.
          </p>
        </div>
        <span className="access-section-count">
          {selectedCount} excepciones · {catalogCount} permisos totales
        </span>
      </div>

      {totalVisible === 0 ? (
        <p className="access-empty-state">
          No se encontraron permisos con ese criterio de búsqueda.
        </p>
      ) : (
        <div className="access-module-grid">
          {groups.map(({ name, permissions }) => {
            const exceptionsInGroup = permissions.filter(
              (permission) =>
                (userOverrides[permission.id] ?? "Inherit") !== "Inherit",
            ).length;

            return (
              <article className="access-module-card" key={name}>
                <header className="access-module-heading">
                  <div>
                    <h3>{name}</h3>
                    <p>{permissions.length} permisos</p>
                  </div>
                  <span className="access-module-count">
                    {exceptionsInGroup}/{permissions.length}
                  </span>
                </header>

                <div className="access-permission-list">
                  {permissions.map((permission) => {
                    const effect =
                      userOverrides[permission.id] ?? "Inherit";

                    return (
                      <div
                        className={`access-permission-row ${effect.toLowerCase()}`}
                        key={permission.id}
                      >
                        <div className="access-permission-copy">
                          <strong>{permission.name}</strong>
                          <code>{permission.code}</code>
                          {permission.description && (
                            <p>{permission.description}</p>
                          )}
                        </div>

                        <label className="access-effect-control">
                          <span>Acceso</span>
                          <select
                            aria-label={`Acceso para ${permission.name} (${permission.code})`}
                            className={`access-permission-select ${effect.toLowerCase()}`}
                            value={effect}
                            onChange={(event) =>
                              setUserOverrides((current) => ({
                                ...current,
                                [permission.id]: event.target
                                  .value as PermissionEffect,
                              }))
                            }
                          >
                            <option value="Inherit">Heredar</option>
                            <option value="Grant">Conceder</option>
                            <option value="Deny">Denegar</option>
                          </select>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
