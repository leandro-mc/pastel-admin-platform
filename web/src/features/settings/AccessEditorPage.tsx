import type { Dispatch, SetStateAction } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Save,
  Search,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import type { User } from "../../types";
import type { Permission, Role } from "./types";

type PermissionEffect = "Grant" | "Deny" | "Inherit";

type UserAccessEditorPageProps = {
  mode: "user";
  user: User;
  roles: Role[];
  catalog: Permission[];
  userRoleIds: string[];
  setUserRoleIds: Dispatch<SetStateAction<string[]>>;
  userOverrides: Record<string, PermissionEffect>;
  setUserOverrides: Dispatch<SetStateAction<Record<string, PermissionEffect>>>;
  permissionSearch: string;
  setPermissionSearch: Dispatch<SetStateAction<string>>;
  loadingPermissions: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
};

type RolePermissionEditorPageProps = {
  mode: "role";
  role: Role;
  catalog: Permission[];
  permissionSearch: string;
  setPermissionSearch: Dispatch<SetStateAction<string>>;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
  onRolePermissionsChange: (permissionIds: string[]) => void;
};

type AccessEditorPageProps =
  UserAccessEditorPageProps | RolePermissionEditorPageProps;

export default function AccessEditorPage(props: AccessEditorPageProps) {
  const query = props.permissionSearch.trim().toLocaleLowerCase("es-CR");
  const permissionGroups = props.catalog.reduce<Record<string, Permission[]>>(
    (groups, permission) => {
      (groups[permission.moduleName] ??= []).push(permission);
      return groups;
    },
    {},
  );
  const visibleGroups = Object.entries(permissionGroups)
    .sort(([a], [b]) => a.localeCompare(b, "es-CR"))
    .map(([name, permissions]) => ({
      name,
      permissions:
        !query || name.toLocaleLowerCase("es-CR").includes(query)
          ? permissions
          : permissions.filter((permission) =>
              `${permission.name} ${permission.code} ${permission.moduleCode} ${permission.description ?? ""}`
                .toLocaleLowerCase("es-CR")
                .includes(query),
            ),
    }))
    .filter((group) => group.permissions.length > 0);
  const visiblePermissionsCount = visibleGroups.reduce(
    (total, group) => total + group.permissions.length,
    0,
  );
  const title =
    props.mode === "user" ? "Editar accesos" : "Administrar permisos";
  const breadcrumbOrigin =
    props.mode === "user" ? "Usuarios" : "Roles y permisos";
  const selectedCount =
    props.mode === "user"
      ? Object.values(props.userOverrides).filter(
          (effect) => effect !== "Inherit",
        ).length
      : props.role.permissionIds.length;
  const userHasAdministratorRole =
    props.mode === "user" &&
    props.roles.some(
      (role) =>
        role.name === "Administrator" && props.userRoleIds.includes(role.id),
    );

  return (
    <div className="access-editor-page">
      <nav className="access-breadcrumbs" aria-label="Ruta de navegación">
        <button type="button" onClick={props.onCancel}>
          Configuración
        </button>
        <ChevronRight size={14} aria-hidden="true" />
        <button type="button" onClick={props.onCancel}>
          {breadcrumbOrigin}
        </button>
        <ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page">
          {props.mode === "user" ? props.user.displayName : props.role.name}
        </span>
      </nav>

      <header className="access-editor-heading">
        <div className="access-editor-title-row">
          <div className="access-editor-icon" aria-hidden="true">
            {props.mode === "user" ? (
              <UserRoundCog size={25} />
            ) : (
              <ShieldCheck size={25} />
            )}
          </div>
          <div className="access-editor-title-copy">
            <span className="eyebrow">
              CENTRO DE CONTROL /{" "}
              {props.mode === "user" ? "USUARIOS" : "ROLES Y PERMISOS"}
            </span>
            <h1>{title}</h1>
            <p>
              {props.mode === "user"
                ? `${props.user.displayName} · ${props.user.email}`
                : props.role.description ||
                  "Definí los permisos que tendrá este rol en cada módulo."}
            </p>
          </div>
        </div>
        <div className="access-editor-context">
          {props.mode === "user" ? (
            <>
              <span className="access-context-label">Cuenta</span>
              <strong>{props.user.displayName}</strong>
              <span>{props.user.isActive ? "Activa" : "Bloqueada"}</span>
            </>
          ) : (
            <>
              <span className="access-context-label">Rol</span>
              <strong>{props.role.name}</strong>
              {props.role.isSystemRole && (
                <span className="access-system-badge">Rol del sistema</span>
              )}
            </>
          )}
        </div>
      </header>

      <div
        className="access-editor-actions"
        role="group"
        aria-label="Acciones del editor"
      >
        <div className="access-editor-action-copy">
          <strong>
            {props.mode === "user"
              ? "Configuración de accesos"
              : "Permisos del rol"}
          </strong>
          <span>
            {props.mode === "user"
              ? `${props.userRoleIds.length} roles asignados · ${selectedCount} excepciones directas`
              : `${selectedCount} de ${props.catalog.length} permisos seleccionados`}
          </span>
        </div>
        <div className="access-editor-action-buttons">
          <button
            type="button"
            className="button button-soft"
            onClick={props.onCancel}
            disabled={props.saving}
          >
            <ArrowLeft size={16} /> Cancelar
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={props.onSave}
            disabled={
              props.saving || (props.mode === "role" && props.role.isSystemRole)
            }
          >
            <Save size={16} />{" "}
            {props.saving
              ? "Guardando…"
              : props.mode === "user"
                ? "Guardar accesos"
                : "Guardar permisos"}
          </button>
        </div>
      </div>

      <div className="access-editor-filter">
        <label className="access-search-field">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={props.permissionSearch}
            onChange={(event) => props.setPermissionSearch(event.target.value)}
            placeholder="Buscar permisos por nombre, código o módulo…"
            aria-label="Buscar permisos"
          />
        </label>
        <div className="access-filter-summary">
          <span>
            <strong>{visiblePermissionsCount}</strong> de {props.catalog.length}{" "}
            permisos visibles
          </span>
          <span className="access-filter-divider" aria-hidden="true" />
          <span>
            {selectedCount}{" "}
            {props.mode === "user" ? "excepciones directas" : "seleccionados"}
          </span>
          {props.permissionSearch && (
            <button type="button" onClick={() => props.setPermissionSearch("")}>
              Limpiar búsqueda
            </button>
          )}
        </div>
      </div>

      {props.mode === "user" ? (
        <>
          <section className="access-editor-section">
            <div className="access-section-heading">
              <div>
                <h2>Roles asignados</h2>
                <p>
                  Los permisos de cada rol se combinan con las excepciones
                  directas de esta cuenta.
                </p>
              </div>
              <span className="access-section-count">
                {props.userRoleIds.length} seleccionados
              </span>
            </div>
            <div className="access-role-grid">
              {props.roles.map((role) => {
                const checked = props.userRoleIds.includes(role.id);
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
                        props.setUserRoleIds((current) =>
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
                        <UsersRound size={13} /> {role.permissions.length}{" "}
                        permisos · {role.userCount} usuarios
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

          {userHasAdministratorRole ? (
            <div className="access-editor-notice">
              <ShieldCheck size={19} />
              <div>
                <strong>Acceso de administrador</strong>
                <p>
                  Esta cuenta tiene el rol Administrator. Las excepciones
                  directas no se editan mientras ese rol esté asignado.
                </p>
              </div>
            </div>
          ) : props.loadingPermissions ? (
            <section className="access-editor-loading" role="status">
              <span className="button-spinner" />
              <div>
                <strong>Cargando permisos directos…</strong>
                <p>
                  Estamos consultando las excepciones actuales de esta cuenta.
                </p>
              </div>
            </section>
          ) : (
            <section className="access-editor-section">
              <div className="access-section-heading">
                <div>
                  <h2>Permisos directos</h2>
                  <p>
                    Usá Conceder o Denegar para establecer una excepción.
                    Heredar respeta los permisos de los roles.
                  </p>
                </div>
                <span className="access-section-count">
                  {selectedCount} excepciones
                </span>
              </div>
              {visibleGroups.length === 0 ? (
                <p className="access-empty-state">
                  No se encontraron permisos con ese criterio de búsqueda.
                </p>
              ) : (
                <div className="access-module-grid">
                  {visibleGroups.map(({ name, permissions }) => (
                    <article className="access-module-card" key={name}>
                      <header className="access-module-heading">
                        <div>
                          <h3>{name}</h3>
                          <p>{permissions.length} permisos</p>
                        </div>
                        <span className="access-module-count">
                          {
                            permissions.filter(
                              (permission) =>
                                (props.userOverrides[permission.id] ??
                                  "Inherit") !== "Inherit",
                            ).length
                          }
                          /{permissions.length}
                        </span>
                      </header>
                      <div className="access-permission-list">
                        {permissions.map((permission) => {
                          const effect =
                            props.userOverrides[permission.id] ?? "Inherit";
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
                                    props.setUserOverrides((current) => ({
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
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      ) : (
        <>
          {props.role.isSystemRole && (
            <div className="access-editor-notice">
              <ShieldCheck size={19} />
              <div>
                <strong>Rol del sistema protegido</strong>
                <p>
                  Este rol mantiene todos los permisos del catálogo y no se
                  puede modificar.
                </p>
              </div>
            </div>
          )}
          {visibleGroups.length === 0 ? (
            <p className="access-empty-state">
              No se encontraron permisos con ese criterio de búsqueda.
            </p>
          ) : (
            <div className="access-module-grid role-permission-grid">
              {visibleGroups.map(({ name, permissions }) => {
                const selectedInGroup = permissions.filter((permission) =>
                  props.role.permissionIds.includes(permission.id),
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
                    {!props.role.isSystemRole && (
                      <div className="access-group-actions">
                        <button
                          type="button"
                          onClick={() =>
                            props.onRolePermissionsChange(
                              Array.from(
                                new Set([
                                  ...props.role.permissionIds,
                                  ...groupIds,
                                ]),
                              ),
                            )
                          }
                        >
                          Seleccionar todos
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            props.onRolePermissionsChange(
                              props.role.permissionIds.filter(
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
                        const checked = props.role.permissionIds.includes(
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
                              disabled={props.role.isSystemRole}
                              onChange={(event) =>
                                props.onRolePermissionsChange(
                                  event.target.checked
                                    ? Array.from(
                                        new Set([
                                          ...props.role.permissionIds,
                                          permission.id,
                                        ]),
                                      )
                                    : props.role.permissionIds.filter(
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
      )}
    </div>
  );
}
