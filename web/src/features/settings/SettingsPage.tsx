import { RefreshCw } from "lucide-react";
import { createPortal } from "react-dom";
import AccessEditorPage from "./AccessEditorPage";
import AuditTab from "./tabs/AuditTab";
import ModulesTab from "./tabs/ModulesTab";
import RolesTab from "./tabs/RolesTab";
import UsersTab from "./tabs/UsersTab";
import { CreateModuleDialog } from "./dialogs/CreateModuleDialog";
import { CreateRoleDialog } from "./dialogs/CreateRoleDialog";
import { CreateUserDialog } from "./dialogs/CreateUserDialog";
import { TemporaryPasswordDialog } from "./dialogs/TemporaryPasswordDialog";
import type { Notify } from "../../types";
import useSettingsAdmin from "./useSettingsAdmin";

export default function SettingsPage({
  permissions,
  notify,
}: {
  permissions: string[];
  notify: Notify;
}) {
  const {
    tab,
    setTab,
    users,
    roles,
    modules,
    catalog,
    audit,
    loading,
    search,
    setSearch,
    userEditor,
    setUserEditor,
    roleEditor,
    setRoleEditor,
    newUserOpen,
    setNewUserOpen,
    newModuleOpen,
    setNewModuleOpen,
    newRoleOpen,
    setNewRoleOpen,
    temporaryPassword,
    setTemporaryPassword,
    userRoleIds,
    setUserRoleIds,
    userOverrides,
    setUserOverrides,
    newUser,
    setNewUser,
    newRole,
    setNewRole,
    newModule,
    setNewModule,
    saving,
    permissionSearch,
    setPermissionSearch,
    loadingUserOverrides,
    can,
    refreshAll,
    saveUserAccess,
    createUser,
    resetPassword,
    changeBlock,
    saveRole,
    createRole,
    createModule,
    toggleModule,
    filteredUsers,
    visibleTabs,
    permissionGroups,
    openUserEditor,
  } = useSettingsAdmin({ permissions, notify });

  if (userEditor) {
    return (
      <AccessEditorPage
        mode="user"
        user={userEditor}
        roles={roles}
        catalog={catalog}
        userRoleIds={userRoleIds}
        setUserRoleIds={setUserRoleIds}
        userOverrides={userOverrides}
        setUserOverrides={setUserOverrides}
        permissionSearch={permissionSearch}
        setPermissionSearch={setPermissionSearch}
        loadingPermissions={loadingUserOverrides}
        saving={saving}
        onCancel={() => {
          setUserEditor(null);
          setRoleEditor(null);
        }}
        onSave={() => void saveUserAccess()}
      />
    );
  }

  if (roleEditor) {
    return (
      <AccessEditorPage
        mode="role"
        role={roleEditor}
        catalog={catalog}
        permissionSearch={permissionSearch}
        setPermissionSearch={setPermissionSearch}
        saving={saving}
        onCancel={() => {
          setUserEditor(null);
          setRoleEditor(null);
        }}
        onSave={() => void saveRole()}
        onRolePermissionsChange={(permissionIds) =>
          setRoleEditor((current) =>
            current ? { ...current, permissionIds } : current,
          )
        }
      />
    );
  }

  return (
    <>
      <section className="settings-page">
      <div className="page-heading settings-heading">
        <div>
          <span className="eyebrow">CENTRO DE CONTROL</span>
          <h1>Configuración</h1>
          <p>Administrá accesos, permisos y módulos desde un solo lugar.</p>
        </div>
        <button
          className="button button-soft"
          onClick={() => void refreshAll()}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "spin" : ""} />
          Actualizar
        </button>
      </div>

      <div className="settings-tabs" role="tablist" aria-label="Configuración">
        {visibleTabs.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={tab === item.id}
              className={
                tab === item.id ? "settings-tab active" : "settings-tab"
              }
              onClick={() => setTab(item.id)}
            >
              <Icon size={17} />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "users" && can("settings.users.read") && (
        <UsersTab
          users={users}
          filteredUsers={filteredUsers}
          loading={loading}
          search={search}
          setSearch={setSearch}
          can={can}
          onCreateUser={() => setNewUserOpen(true)}
          onEditAccess={(user) => void openUserEditor(user)}
          onResetPassword={(user) => void resetPassword(user)}
          onToggleBlock={(user) => void changeBlock(user)}
        />
      )}

      {tab === "roles" && can("settings.roles.read") && (
        <RolesTab
          roles={roles}
          can={can}
          onCreateRole={() => setNewRoleOpen(true)}
          onManagePermissions={(role) => {
            setPermissionSearch("");
            setRoleEditor(role);
          }}
        />
      )}

      {tab === "modules" && can("settings.modules.read") && (
        <ModulesTab
          modules={modules}
          can={can}
          onCreateModule={() => setNewModuleOpen(true)}
          onToggleModule={(module) => void toggleModule(module)}
        />
      )}

      {tab === "audit" && can("settings.audit.read") && (
        <AuditTab audit={audit} />
      )}

      </section>

      {/* Keep fixed overlays outside the animated settings section. */}
      {createPortal(
        <>
          {newUserOpen && (
            <CreateUserDialog
              newUser={newUser}
              setNewUser={setNewUser}
              roles={roles}
              saving={saving}
              onSubmit={createUser}
              onClose={() => setNewUserOpen(false)}
            />
          )}

          {newRoleOpen && (
            <CreateRoleDialog
              newRole={newRole}
              setNewRole={setNewRole}
              permissionGroups={permissionGroups}
              saving={saving}
              onSubmit={createRole}
              onClose={() => setNewRoleOpen(false)}
            />
          )}

          {newModuleOpen && (
            <CreateModuleDialog
              newModule={newModule}
              setNewModule={setNewModule}
              saving={saving}
              onSubmit={createModule}
              onClose={() => setNewModuleOpen(false)}
            />
          )}

          {temporaryPassword && (
            <TemporaryPasswordDialog
              password={temporaryPassword}
              onClose={() => setTemporaryPassword(null)}
              notify={notify}
            />
          )}
        </>,
        document.body,
      )}
    </>
  );
}
