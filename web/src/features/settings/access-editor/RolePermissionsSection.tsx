import { Check, ShieldCheck } from "lucide-react";
import type { PermissionGroup, Role } from "../types";

type RolePermissionsSectionProps = {
  role: Role;
  groups: PermissionGroup[];
  onPermissionsChange: (permissionIds: string[]) => void;
};

export default function RolePermissionsSection({
  role,
  groups,
  onPermissionsChange,
}: RolePermissionsSectionProps) {
  const totalVisible = groups.reduce(
    (total, group) => total + group.permissions.length,
    0,
  );

  return (
    <>
      {role.isSystemRole && (
        <div className="access-editor-notice">
          <ShieldCheck size={19} />
          <div>
            <strong>Rol del sistema protegido</strong>
            <p>
              Este rol mantiene todos los permisos del catálogo y no se puede
              modificar.
            </p>
          </div>
        </div>
      )}

      {totalVisible === 0 ? (
        <p className="access-empty-state">
          No se encontraron permisos con ese criterio de búsqueda.
        </p>
      ) : (
        <div className="access-module-grid role-permission-grid">
          {groups.map(({ name, permissions }) => {
            const selectedInGroup = permissions.filter((permission) =>
              role.permissionIds.includes(permission.id),
            ).length;
            const groupIds = permissions.map((permission) => permission.id);

            return (
              <article className="access-module-card" key={name}>
                <header className="access-module-heading">
                  <div>
                    <h2>{name}</h2>
                    <p>{permissions.length} permisos disponibles</p>
                  </div>
                  <span className="access-module-count">
                    {selectedInGroup}/{permissions.length}
                  </span>
                </header>

                {!role.isSystemRole && (
                  <div className="access-group-actions">
                    <button
                      type="button"
                      onClick={() =>
                        onPermissionsChange(
                          Array.from(
                            new Set([...role.permissionIds, ...groupIds]),
                          ),
                        )
                      }
                    >
                      Seleccionar todos
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onPermissionsChange(
                          role.permissionIds.filter(
                            (id) => !groupIds.includes(id),
                          ),
                        )
                      }
                    >
                      Quitar selección
                    </button>
                  </div>
                )}

                <div className="access-permission-list">
                  {permissions.map((permission) => {
                    const checked = role.permissionIds.includes(
                      permission.id,
                    );

                    return (
                      <label
                        className={
                          checked
                            ? "access-permission-row role-row is-selected"
                            : "access-permission-row role-row"
                        }
                        key={permission.id}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={role.isSystemRole}
                          onChange={(event) =>
                            onPermissionsChange(
                              event.target.checked
                                ? Array.from(
                                    new Set([
                                      ...role.permissionIds,
                                      permission.id,
                                    ]),
                                  )
                                : role.permissionIds.filter(
                                    (id) => id !== permission.id,
                                  ),
                            )
                          }
                        />
                        <span className="access-permission-copy">
                          <strong>{permission.name}</strong>
                          <code>{permission.code}</code>
                          {permission.description && (
                            <p>{permission.description}</p>
                          )}
                        </span>
                        <span
                          className="access-role-check"
                          aria-hidden="true"
                        >
                          {checked ? <Check size={15} /> : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
