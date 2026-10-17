import type { Dispatch, SetStateAction } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Save,
  Search,
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
