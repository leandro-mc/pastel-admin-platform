import { Check, UsersRound } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { Role } from "../types";

type UserRolesSectionProps = {
  roles: Role[];
  userRoleIds: string[];
  setUserRoleIds: Dispatch<SetStateAction<string[]>>;
};

export default function UserRolesSection({
  roles,
  userRoleIds,
  setUserRoleIds,
}: UserRolesSectionProps) {
  return (
    <section className="access-editor-section">
      <div className="access-section-heading">
        <div>
          <h2>Roles asignados</h2>
          <p>
            Los permisos de cada rol se combinan con las excepciones directas de
            esta cuenta.
          </p>
        </div>
        <span className="access-section-count">
          {userRoleIds.length} seleccionados
        </span>
      </div>

      <div className="access-role-grid">
        {roles.map((role) => {
          const checked = userRoleIds.includes(role.id);

          return (
            <label
              className={
                checked
                  ? "access-role-choice is-selected"
                  : "access-role-choice"
              }
              key={role.id}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) =>
                  setUserRoleIds((current) =>
                    event.target.checked
                      ? [...current, role.id]
                      : current.filter((id) => id !== role.id),
                  )
                }
              />
              <span className="access-role-choice-content">
                <strong>{role.name}</strong>
                <span>{role.description || "Rol de acceso"}</span>
                <small>
                  <UsersRound size={13} />
                  {role.permissions.length} permisos · {role.userCount} usuarios
                </small>
              </span>
              <span className="access-role-check" aria-hidden="true">
                {checked ? <Check size={16} /> : null}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
