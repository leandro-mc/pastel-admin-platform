import {
  Check,
  ChevronDown,
  CirclePlus,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type { Role } from "../types";

type RolesTabProps = {
  roles: Role[];
  can: (permission: string) => boolean;
  onCreateRole: () => void;
  onManagePermissions: (role: Role) => void;
};

export default function RolesTab({
  roles,
  can,
  onCreateRole,
  onManagePermissions,
}: RolesTabProps) {
  return (
    <div className="roles-layout">
      <div className="section-intro">
        <div>
          <h2>Roles de acceso</h2>
          <p>
            Los permisos de un rol se aplican a todas las cuentas que lo tengan
            asignado.
          </p>
        </div>
        {can("settings.roles.create") && (
          <button
            className="button button-primary"
            onClick={onCreateRole}
          >
            <CirclePlus size={16} /> Crear rol
          </button>
        )}
      </div>

      <div className="roles-grid">
        {roles.map((role) => (
          <article className="role-card" key={role.id}>
            <div className="role-card-top">
              <span className="role-icon">
                <ShieldCheck size={20} />
              </span>
              {role.isSystemRole && (
                <span className="chip chip-neutral">Sistema</span>
              )}
            </div>
            <h3>{role.name}</h3>
            <p>{role.description || "Sin descripción adicional."}</p>
            <div className="role-meta">
              <span>
                <UsersRound size={15} /> {role.userCount} usuarios
              </span>
              <span>
                <Check size={15} /> {role.permissions.length} permisos
              </span>
            </div>
            {can("settings.roles.update") && (
              <button
                className="button button-soft full-width"
                onClick={() => onManagePermissions(role)}
              >
                Administrar permisos <ChevronDown size={15} />
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
