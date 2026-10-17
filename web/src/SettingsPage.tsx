import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Activity,
  CirclePlus,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import AccessEditorPage from "./features/settings/AccessEditorPage";
import AuditTab from "./features/settings/tabs/AuditTab";
import ModulesTab from "./features/settings/tabs/ModulesTab";
import RolesTab from "./features/settings/tabs/RolesTab";
import UsersTab from "./features/settings/tabs/UsersTab";
import CreateModuleDialog from "./features/settings/dialogs/CreateModuleDialog";
import CreateRoleDialog from "./features/settings/dialogs/CreateRoleDialog";
import CreateUserDialog from "./features/settings/dialogs/CreateUserDialog";
import TemporaryPasswordDialog from "./features/settings/dialogs/TemporaryPasswordDialog";
import type {
  Audit,
  Module,
  NewModuleForm,
  NewRoleForm,
  NewUserForm,
  Permission,
  Role,
  Tab,
} from "./features/settings/types";
import type { User } from "./types";
import { api, ApiError } from "./lib/api";

export default function SettingsPage({ permissions, notify }: { permissions: string[]; notify: (message: string, tone?: 'success' | 'error') => void }) {
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [catalog, setCatalog] = useState<Permission[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [userEditor, setUserEditor] = useState<User | null>(null);
  const [roleEditor, setRoleEditor] = useState<Role | null>(null);
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newModuleOpen, setNewModuleOpen] = useState(false);
  const [newRoleOpen, setNewRoleOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [userRoleIds, setUserRoleIds] = useState<string[]>([]);
  const [userOverrides, setUserOverrides] = useState<Record<string, 'Grant' | 'Deny' | 'Inherit'>>({});
  const [newUser, setNewUser] = useState<NewUserForm>({ email: '', displayName: '', temporaryPassword: '', roleIds: [] });
  const [newRole, setNewRole] = useState<NewRoleForm>({ name: '', description: '', permissionIds: [] });
  const [newModule, setNewModule] = useState<NewModuleForm>({ code: '', name: '', description: '', actions: 'read, create, update, delete' });
  const [saving, setSaving] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [loadingUserOverrides, setLoadingUserOverrides] = useState(false);

  const can = (code: string) => permissions.includes(code);
  const refreshAll = useCallback(async () => {
    setLoading(true);
    const read = async <T,>(path: string): Promise<T | null> => {
      try { return await api<T>(path); } catch (error) { if (!(error instanceof ApiError && error.status === 403)) notify(error instanceof Error ? error.message : 'No se pudieron cargar los datos.', 'error'); return null; }
    };
    const [u, r, m, p, a] = await Promise.all([
      permissions.includes('settings.users.read') ? read<User[]>('/api/admin/users') : Promise.resolve(null),
      permissions.includes('settings.roles.read') ? read<Role[]>('/api/admin/roles') : Promise.resolve(null),
      permissions.includes('settings.modules.read') ? read<Module[]>('/api/admin/modules') : Promise.resolve(null),
      permissions.includes('settings.permissions.read') ? read<Permission[]>('/api/admin/permissions') : Promise.resolve(null),
      permissions.includes('settings.audit.read') ? read<Audit[]>('/api/admin/audit?take=80') : Promise.resolve(null),
    ]);
    if (u) setUsers(u);
    if (r) setRoles(r);
    if (m) setModules(m);
    if (p) setCatalog(p);
    if (a) setAudit(a);
    setLoading(false);
  }, [permissions, notify]);

  useEffect(() => { void refreshAll(); }, [refreshAll]);

  const openUserEditor = async (user: User) => {
    setUserEditor(user);
    setPermissionSearch('');
    setUserRoleIds(roles.filter((role) => user.roles.includes(role.name)).map((role) => role.id));
    setUserOverrides({});
    setLoadingUserOverrides(true);
    try {
      const values = await api<{ permissionId: string; effect: 'Grant' | 'Deny' }[]>(`/api/admin/users/${user.id}/permissions`);
      setUserOverrides(Object.fromEntries(values.map((x) => [x.permissionId, x.effect])));
    } catch (error) { if (!(error instanceof ApiError && error.status === 409)) notify(error instanceof Error ? error.message : 'No se pudieron consultar permisos directos.', 'error'); }
    finally { setLoadingUserOverrides(false); }
  };

  const saveUserAccess = async () => {
    if (!userEditor) return;
    setSaving(true);
    try {
      await api(`/api/admin/users/${userEditor.id}/roles`, { method: 'PUT', body: JSON.stringify({ roleIds: userRoleIds }) });
      const selectedAdminRole = roles.some((role) => role.name === 'Administrator' && userRoleIds.includes(role.id));
      if (!selectedAdminRole) {
        const changes = Object.entries(userOverrides).filter(([, effect]) => effect !== 'Inherit').map(([permissionId, effect]) => ({ permissionId, effect }));
        await api(`/api/admin/users/${userEditor.id}/permissions`, { method: 'PUT', body: JSON.stringify({ changes }) });
      }
      notify('Los accesos del usuario se actualizaron.', 'success'); setUserEditor(null); await refreshAll();
    } catch (error) { notify(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.', 'error'); }
    finally { setSaving(false); }
  };

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true);
    try {
      await api('/api/admin/users', { method: 'POST', body: JSON.stringify(newUser) });
      notify('Usuario creado. Debe cambiar su contraseña temporal al ingresar.', 'success');
      setNewUserOpen(false); setNewUser({ email: '', displayName: '', temporaryPassword: '', roleIds: [] }); await refreshAll();
    } catch (error) { notify(error instanceof Error ? error.message : 'No se pudo crear el usuario.', 'error'); }
    finally { setSaving(false); }
  };

  const resetPassword = async (user: User) => {
    if (!window.confirm(`¿Generar una contraseña temporal nueva para ${user.email}?`)) return;
    try {
      const result = await api<{ temporaryPassword: string }>(`/api/admin/users/${user.id}/reset-password`, { method: 'POST', body: '{}' });
      setTemporaryPassword(result.temporaryPassword);
      notify('Contraseña temporal generada. Se muestra una sola vez.', 'success'); await refreshAll();
    } catch (error) { notify(error instanceof Error ? error.message : 'No se pudo restablecer la contraseña.', 'error'); }
  };

  const changeBlock = async (user: User) => {
    const action = user.isActive ? 'block' : 'unblock';
    if (user.isActive && !window.confirm(`¿Bloquear la cuenta ${user.email}? Se revocarán sus sesiones.`)) return;
    try { await api(`/api/admin/users/${user.id}/${action}`, { method: 'POST', body: '{}' }); notify(user.isActive ? 'Cuenta bloqueada.' : 'Cuenta desbloqueada.', 'success'); await refreshAll(); }
    catch (error) { notify(error instanceof Error ? error.message : 'No se pudo actualizar la cuenta.', 'error'); }
  };

  const saveRole = async () => {
    if (!roleEditor) return;
    setSaving(true);
    try { await api(`/api/admin/roles/${roleEditor.id}/permissions`, { method: 'PUT', body: JSON.stringify({ permissionIds: roleEditor.permissionIds }) }); notify('Los permisos del rol se actualizaron.', 'success'); setRoleEditor(null); await refreshAll(); }
    catch (error) { notify(error instanceof Error ? error.message : 'No se pudieron guardar los permisos.', 'error'); }
    finally { setSaving(false); }
  };

  const createRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true);
    try { await api('/api/admin/roles', { method: 'POST', body: JSON.stringify(newRole) }); notify('Rol creado.', 'success'); setNewRoleOpen(false); setNewRole({ name: '', description: '', permissionIds: [] }); await refreshAll(); }
    catch (error) { notify(error instanceof Error ? error.message : 'No se pudo crear el rol.', 'error'); }
    finally { setSaving(false); }
  };

  const createModule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true);
    try {
      const actions = newModule.actions.split(',').map((x) => x.trim()).filter(Boolean);
      await api('/api/admin/modules', { method: 'POST', body: JSON.stringify({ ...newModule, actions }) });
      notify('Módulo registrado y permisos iniciales creados.', 'success'); setNewModuleOpen(false); setNewModule({ code: '', name: '', description: '', actions: 'read, create, update, delete' }); await refreshAll();
    } catch (error) { notify(error instanceof Error ? error.message : 'No se pudo registrar el módulo.', 'error'); }
    finally { setSaving(false); }
  };

  const toggleModule = async (module: Module) => {
    try { await api(`/api/admin/modules/${module.id}`, { method: 'PATCH', body: JSON.stringify({ isEnabled: !module.isEnabled }) }); notify(module.isEnabled ? 'Módulo desactivado.' : 'Módulo activado.', 'success'); await refreshAll(); }
    catch (error) { notify(error instanceof Error ? error.message : 'No se pudo actualizar el módulo.', 'error'); }
  };

  const filteredUsers = users.filter((x) => `${x.email} ${x.displayName} ${x.roles.join(' ')}`.toLowerCase().includes(search.toLowerCase()));
  const tabs: { id: Tab; label: string; icon: typeof UsersRound; permitted: boolean }[] = [
    { id: 'users', label: 'Usuarios', icon: UsersRound, permitted: can('settings.users.read') },
    { id: 'roles', label: 'Roles y permisos', icon: ShieldCheck, permitted: can('settings.roles.read') },
    { id: 'modules', label: 'Módulos', icon: CirclePlus, permitted: can('settings.modules.read') },
    { id: 'audit', label: 'Auditoría', icon: Activity, permitted: can('settings.audit.read') },
  ];
  const visibleTabs = tabs.filter((x) => x.permitted);
  useEffect(() => { if (!visibleTabs.some((x) => x.id === tab) && visibleTabs[0]) setTab(visibleTabs[0].id); }, [visibleTabs, tab]);
  const permissionGroups = catalog.reduce<Record<string, Permission[]>>((acc, item) => { (acc[item.moduleName] ??= []).push(item); return acc; }, {});

  if (userEditor) {
    return <AccessEditorPage
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
      onCancel={() => { setUserEditor(null); setRoleEditor(null); }}
      onSave={() => void saveUserAccess()}
    />;
  }

  if (roleEditor) {
    return <AccessEditorPage
      mode="role"
      role={roleEditor}
      catalog={catalog}
      permissionSearch={permissionSearch}
      setPermissionSearch={setPermissionSearch}
      saving={saving}
      onCancel={() => { setUserEditor(null); setRoleEditor(null); }}
      onSave={() => void saveRole()}
      onRolePermissionsChange={(permissionIds) => setRoleEditor((current) => current ? { ...current, permissionIds } : current)}
    />;
  }

  return (
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
              className={tab === item.id ? "settings-tab active" : "settings-tab"}
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
    </section>
  );
}
