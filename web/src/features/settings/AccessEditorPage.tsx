import type { Dispatch, SetStateAction } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Save,
  Search,
  ShieldCheck,
  UserRoundCog,
} from "lucide-react";
import UserDirectPermissionsSection from "./access-editor/UserDirectPermissionsSection";
import RolePermissionsSection from "./access-editor/RolePermissionsSection";
import UserRolesSection from "./access-editor/UserRolesSection";
import type { User } from "../../types";
import type {
  Permission,
  PermissionEffect,
  PermissionGroup,
  Role,
} from "./types";

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
  | UserAccessEditorPageProps
  | RolePermissionEditorPageProps;

export default function AccessEditorPage(props: AccessEditorPageProps) {
  const query = props.permissionSearch.trim().toLocaleLowerCase("es-CR");
  const permissionGroups = props.catalog.reduce<
    Record<string, Permission[]>
  >((groups, permission) => {
    (groups[permission.moduleName] ??= []).push(permission);
    return groups;
  }, {});

  const visibleGroups: PermissionGroup[] = Object.entries(permissionGroups)
    .sort(([first], [second]) => first.localeCompare(second, "es-CR"))
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

      <div className="access-editor-actions" role="group" aria-label="Acciones del editor">
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
              props.saving ||
              (props.mode === "role" && props.role.isSystemRole)
            }
          >
            <Save size={16} />
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
            <button
              type="button"
              onClick={() => props.setPermissionSearch("")}
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      </div>

      {props.mode === "user" ? (
        <>
          <UserRolesSection
            roles={props.roles}
            userRoleIds={props.userRoleIds}
            setUserRoleIds={props.setUserRoleIds}
          />
          <UserDirectPermissionsSection
            userHasAdministratorRole={userHasAdministratorRole}
            loadingPermissions={props.loadingPermissions}
            groups={visibleGroups}
            catalogCount={props.catalog.length}
            selectedCount={selectedCount}
            userOverrides={props.userOverrides}
            setUserOverrides={props.setUserOverrides}
          />
        </>
      ) : (
        <RolePermissionsSection
          role={props.role}
          groups={visibleGroups}
          onPermissionsChange={props.onRolePermissionsChange}
        />
      )}
    </div>
  );
}
