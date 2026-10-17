import { KeyRound, LockKeyhole, UserRoundCog } from "lucide-react";
import type { User } from "../../../types";

type UsersTabProps = {
  users: User[];
  filteredUsers: User[];
  loading: boolean;
  search: string;
  setSearch: (value: string) => void;
  can: (permission: string) => boolean;
  onCreateUser: () => void;
  onEditAccess: (user: User) => void;
  onResetPassword: (user: User) => void;
  onToggleBlock: (user: User) => void;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function UsersTab({
  users,
  filteredUsers,
  loading,
  search,
  setSearch,
  can,
  onCreateUser,
  onEditAccess,
  onResetPassword,
  onToggleBlock,
}: UsersTabProps) {
  return (
    <section className="panel table-panel">
      <div className="panel-heading">
        <div>
          <h2>Directorio de usuarios</h2>
          <p>{users.length} cuentas registradas</p>
        </div>
        <div className="table-tools">
          <input
            className="search-input"
            placeholder="Buscar por nombre, correo o rol"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Buscar usuarios"
          />
          {can("settings.users.create") && (
            <button className="button button-primary" onClick={onCreateUser}>
              Nuevo usuario
            </button>
          )}
        </div>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Estado</th>
              <th>Roles asignados</th>
              <th>Alta</th>
              <th className="align-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="person-cell">
                    <span className="avatar avatar-small">
                      {user.displayName
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </span>
                    <div>
                      <strong>{user.displayName}</strong>
                      <span>{user.email}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span
                    className={
                      user.isActive
                        ? "status status-active"
                        : "status status-blocked"
                    }
                  >
                    <span />
                    {user.isActive ? "Activo" : "Bloqueado"}
                  </span>
                  {user.mustChangePassword && (
                    <span className="status status-pending">Cambiar clave</span>
                  )}
                </td>
                <td>
                  <div className="role-chips">
                    {user.roles.map((role) => (
                      <span className="chip" key={role}>
                        {role}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="muted-cell">{formatDate(user.createdAt)}</td>
                <td>
                  <div className="row-actions">
                    {can("settings.users.update") && (
                      <button
                        className="icon-button"
                        title="Editar accesos"
                        aria-label={`Editar accesos de ${user.email}`}
                        onClick={() => onEditAccess(user)}
                      >
                        <UserRoundCog size={17} />
                      </button>
                    )}
                    {can("settings.users.reset_password") && (
                      <button
                        className="icon-button"
                        title="Restablecer contraseña"
                        aria-label={`Restablecer contraseña de ${user.email}`}
                        onClick={() => onResetPassword(user)}
                      >
                        <KeyRound size={17} />
                      </button>
                    )}
                    {can("settings.users.lock") && (
                      <button
                        className={
                          user.isActive
                            ? "icon-button danger-icon"
                            : "icon-button"
                        }
                        title={
                          user.isActive
                            ? "Bloquear cuenta"
                            : "Desbloquear cuenta"
                        }
                        aria-label={
                          user.isActive
                            ? `Bloquear ${user.email}`
                            : `Desbloquear ${user.email}`
                        }
                        onClick={() => onToggleBlock(user)}
                      >
                        <LockKeyhole size={17} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-row">
                  {loading
                    ? "Cargando usuarios…"
                    : "No hay usuarios que coincidan con la búsqueda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
