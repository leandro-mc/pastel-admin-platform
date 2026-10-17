import { useCallback, useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { Activity, ArrowLeft, Check, ChevronDown, ChevronRight, CirclePlus, KeyRound, LockKeyhole, RefreshCw, Save, Search, ShieldCheck, ToggleLeft, ToggleRight, UserRoundCog, UsersRound, X } from 'lucide-react';
import { api, ApiError } from './lib/api';

type User = { id: string; email: string; displayName: string; isActive: boolean; mustChangePassword: boolean; accessFailedCount: number; lockoutEnd: string | null; createdAt: string; roles: string[] };
type Permission = { id: string; moduleCode: string; moduleName: string; code: string; name: string; description: string | null; isSystemPermission: boolean };
type Role = { id: string; name: string; description: string | null; isSystemRole: boolean; permissionIds: string[]; permissions: string[]; userCount: number };
type Module = { id: string; code: string; name: string; description: string | null; isEnabled: boolean; sortOrder: number; permissions: Permission[] };
type Audit = { id: number; actorUserId: string | null; actorEmail: string | null; targetUserId: string | null; action: string; target: string | null; detailsJson: string | null; ipAddress: string | null; createdAt: string };
type Tab = 'users' | 'roles' | 'modules' | 'audit';

const readableDate = (value: string) => new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const friendlyAction = (value: string) => value.replaceAll('.', ' · ').replaceAll('-', ' ');

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
  const [newUser, setNewUser] = useState({ email: '', displayName: '', temporaryPassword: '', roleIds: [] as string[] });
  const [newRole, setNewRole] = useState({ name: '', description: '', permissionIds: [] as string[] });
  const [newModule, setNewModule] = useState({ code: '', name: '', description: '', actions: 'read, create, update, delete' });
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
      <div className="page-heading settings-heading"><div><span className="eyebrow">CENTRO DE CONTROL</span><h1>Configuración</h1><p>Administrá accesos, permisos y módulos desde un solo lugar.</p></div><button className="button button-soft" onClick={() => void refreshAll()} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''} /> Actualizar</button></div>
      <div className="settings-tabs" role="tablist" aria-label="Configuración">
        {visibleTabs.map((item) => { const Icon = item.icon; return <button key={item.id} role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'settings-tab active' : 'settings-tab'} onClick={() => setTab(item.id)}><Icon size={17} />{item.label}</button>; })}
      </div>

      {tab === 'users' && can('settings.users.read') && <div className="panel table-panel">
        <div className="panel-heading"><div><h2>Directorio de usuarios</h2><p>{users.length} cuentas registradas</p></div><div className="table-tools"><input className="search-input" placeholder="Buscar por nombre, correo o rol" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar usuarios" />{can('settings.users.create') && <button className="button button-primary" onClick={() => setNewUserOpen(true)}><CirclePlus size={16} /> Nuevo usuario</button>}</div></div>
        <div className="table-scroll"><table><thead><tr><th>Usuario</th><th>Estado</th><th>Roles asignados</th><th>Alta</th><th className="align-right">Acciones</th></tr></thead><tbody>
          {filteredUsers.map((user) => <tr key={user.id}><td><div className="person-cell"><span className="avatar avatar-small">{user.displayName.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()}</span><div><strong>{user.displayName}</strong><span>{user.email}</span></div></div></td><td><span className={user.isActive ? 'status status-active' : 'status status-blocked'}><span />{user.isActive ? 'Activo' : 'Bloqueado'}</span>{user.mustChangePassword && <span className="status status-pending">Cambiar clave</span>}</td><td><div className="role-chips">{user.roles.map((role) => <span className="chip" key={role}>{role}</span>)}</div></td><td className="muted-cell">{readableDate(user.createdAt)}</td><td><div className="row-actions">{can('settings.users.update') && <button className="icon-button" title="Editar accesos" aria-label={`Editar accesos de ${user.email}`} onClick={() => void openUserEditor(user)}><UserRoundCog size={17} /></button>}{can('settings.users.reset_password') && <button className="icon-button" title="Restablecer contraseña" aria-label={`Restablecer contraseña de ${user.email}`} onClick={() => void resetPassword(user)}><KeyRound size={17} /></button>}{can('settings.users.lock') && <button className={user.isActive ? 'icon-button danger-icon' : 'icon-button'} title={user.isActive ? 'Bloquear cuenta' : 'Desbloquear cuenta'} aria-label={user.isActive ? `Bloquear ${user.email}` : `Desbloquear ${user.email}`} onClick={() => void changeBlock(user)}><LockKeyhole size={17} /></button>}</div></td></tr>)}
          {filteredUsers.length === 0 && <tr><td colSpan={5} className="empty-row">{loading ? 'Cargando usuarios…' : 'No hay usuarios que coincidan con la búsqueda.'}</td></tr>}
        </tbody></table></div>
      </div>}

      {tab === 'roles' && can('settings.roles.read') && <div className="roles-layout"><div className="section-intro"><div><h2>Roles de acceso</h2><p>Los permisos de un rol se aplican a todas las cuentas que lo tengan asignado.</p></div>{can('settings.roles.create') && <button className="button button-primary" onClick={() => setNewRoleOpen(true)}><CirclePlus size={16} /> Crear rol</button>}</div><div className="roles-grid">{roles.map((role) => <article className="role-card" key={role.id}><div className="role-card-top"><span className="role-icon"><ShieldCheck size={20} /></span>{role.isSystemRole && <span className="chip chip-neutral">Sistema</span>}</div><h3>{role.name}</h3><p>{role.description || 'Sin descripción adicional.'}</p><div className="role-meta"><span><UsersRound size={15} /> {role.userCount} usuarios</span><span><Check size={15} /> {role.permissions.length} permisos</span></div>{can('settings.roles.update') && <button className="button button-soft full-width" onClick={() => { setPermissionSearch(''); setRoleEditor(role); }}>Administrar permisos <ChevronDown size={15} /></button>}</article>)}</div></div>}

      {tab === 'modules' && can('settings.modules.read') && <div className="modules-layout"><div className="section-intro"><div><h2>Catálogo de módulos</h2><p>Los nuevos módulos generan permisos que luego podés asignar a roles y usuarios.</p></div>{can('settings.modules.manage') && <button className="button button-primary" onClick={() => setNewModuleOpen(true)}><CirclePlus size={16} /> Registrar módulo</button>}</div><div className="module-grid">{modules.map((module) => <article className="module-card" key={module.id}><div className="module-card-head"><div className="module-symbol"><CirclePlus size={20} /></div><span className={module.isEnabled ? 'status status-active' : 'status status-blocked'}><span />{module.isEnabled ? 'Activo' : 'Desactivado'}</span></div><h3>{module.name}</h3><div className="module-code">{module.code}</div><p>{module.description || 'Módulo registrado en la plataforma.'}</p><div className="module-permissions"><strong>{module.permissions.length} permisos</strong><div>{module.permissions.slice(0, 4).map((perm) => <span className="chip" key={perm.id}>{perm.code}</span>)}{module.permissions.length > 4 && <span className="chip">+{module.permissions.length - 4}</span>}</div></div>{can('settings.modules.manage') && <button className="button button-soft full-width" onClick={() => void toggleModule(module)} disabled={module.code === 'settings'}>{module.isEnabled ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}{module.isEnabled ? 'Desactivar módulo' : 'Activar módulo'}</button>}</article>)}</div></div>}

      {tab === 'audit' && can('settings.audit.read') && <div className="panel table-panel"><div className="panel-heading"><div><h2>Registro de auditoría</h2><p>Eventos administrativos más recientes</p></div><span className="audit-badge"><Activity size={15} /> Solo lectura</span></div><div className="table-scroll"><table><thead><tr><th>Evento</th><th>Actor</th><th>Recurso</th><th>Dirección IP</th><th>Fecha</th></tr></thead><tbody>{audit.map((item) => <tr key={item.id}><td><strong className="audit-action">{friendlyAction(item.action)}</strong></td><td>{item.actorEmail || 'Sistema'}</td><td>{item.target || '—'}</td><td className="muted-cell">{item.ipAddress || '—'}</td><td className="muted-cell">{readableDate(item.createdAt)}</td></tr>)}{audit.length === 0 && <tr><td colSpan={5} className="empty-row">No hay eventos registrados.</td></tr>}</tbody></table></div></div>}

      {newUserOpen && <div className="modal-backdrop"><form className="modal" onSubmit={createUser}><div className="modal-head"><div><span className="eyebrow">NUEVA CUENTA</span><h2>Crear usuario</h2><p>La persona deberá reemplazar su contraseña temporal al ingresar.</p></div><button type="button" className="icon-button" onClick={() => setNewUserOpen(false)} aria-label="Cerrar"><X size={19} /></button></div><div className="modal-content"><label className="field-label">Nombre completo<input required minLength={2} maxLength={100} value={newUser.displayName} onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })} /></label><label className="field-label">Correo electrónico<input required type="email" maxLength={320} value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} /></label><label className="field-label">Contraseña temporal<input required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={newUser.temporaryPassword} onChange={(e) => setNewUser({ ...newUser, temporaryPassword: e.target.value })} /><small>12 caracteres o más, con mayúscula, minúscula, número y símbolo.</small></label><h3>Asignar roles</h3><div className="choice-list">{roles.map((role) => <label className="choice-row" key={role.id}><input type="checkbox" checked={newUser.roleIds.includes(role.id)} onChange={(e) => setNewUser({ ...newUser, roleIds: e.target.checked ? [...newUser.roleIds, role.id] : newUser.roleIds.filter((x) => x !== role.id) })} /><span><strong>{role.name}</strong><small>{role.description || ''}</small></span></label>)}</div></div><div className="modal-actions"><button type="button" className="button button-soft" onClick={() => setNewUserOpen(false)}>Cancelar</button><button className="button button-primary" disabled={saving}>{saving ? 'Creando…' : 'Crear usuario'}</button></div></form></div>}

      {newRoleOpen && <div className="modal-backdrop"><form className="modal modal-wide" onSubmit={createRole}><div className="modal-head"><div><span className="eyebrow">CONTROL DE ACCESO</span><h2>Crear rol</h2><p>Un rol agrupa permisos que se pueden asignar a varias cuentas.</p></div><button type="button" className="icon-button" onClick={() => setNewRoleOpen(false)} aria-label="Cerrar"><X size={19} /></button></div><div className="modal-content"><label className="field-label">Nombre del rol<input required minLength={2} maxLength={64} value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} /></label><label className="field-label">Descripción<textarea maxLength={500} rows={2} value={newRole.description} onChange={(e) => setNewRole({ ...newRole, description: e.target.value })} /></label><h3>Permisos iniciales</h3>{Object.entries(permissionGroups).map(([group, items]) => <div className="permission-group" key={group}><h3>{group}</h3>{items?.map((permission) => <label className="permission-row" key={permission.id}><input type="checkbox" checked={newRole.permissionIds.includes(permission.id)} onChange={(e) => setNewRole({ ...newRole, permissionIds: e.target.checked ? [...newRole.permissionIds, permission.id] : newRole.permissionIds.filter((id) => id !== permission.id) })} /><span><strong>{permission.name}</strong><small>{permission.code}</small></span></label>)}</div>)}</div><div className="modal-actions"><button type="button" className="button button-soft" onClick={() => setNewRoleOpen(false)}>Cancelar</button><button className="button button-primary" disabled={saving}>{saving ? 'Creando…' : 'Crear rol'}</button></div></form></div>}

      {newModuleOpen && <div className="modal-backdrop"><form className="modal" onSubmit={createModule}><div className="modal-head"><div><span className="eyebrow">EXTENDER LA PLATAFORMA</span><h2>Registrar módulo</h2><p>Se crearán permisos por cada acción indicada.</p></div><button type="button" className="icon-button" onClick={() => setNewModuleOpen(false)} aria-label="Cerrar"><X size={19} /></button></div><div className="modal-content"><label className="field-label">Nombre del módulo<input required minLength={2} maxLength={100} value={newModule.name} onChange={(e) => setNewModule({ ...newModule, name: e.target.value, code: newModule.code || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') })} /></label><label className="field-label">Código único<input required pattern="[a-z][a-z0-9-]{1,62}" minLength={2} maxLength={64} value={newModule.code} onChange={(e) => setNewModule({ ...newModule, code: e.target.value })} /><small>Minúsculas, números y guiones; debe iniciar con una letra.</small></label><label className="field-label">Descripción<textarea rows={2} maxLength={500} value={newModule.description} onChange={(e) => setNewModule({ ...newModule, description: e.target.value })} /></label><label className="field-label">Acciones separadas por coma<input required value={newModule.actions} onChange={(e) => setNewModule({ ...newModule, actions: e.target.value })} /><small>Ejemplo: read, create, update, delete, export. Se crearán permisos como inventario.read.</small></label></div><div className="modal-actions"><button type="button" className="button button-soft" onClick={() => setNewModuleOpen(false)}>Cancelar</button><button className="button button-primary" disabled={saving}>{saving ? 'Registrando…' : 'Registrar módulo'}</button></div></form></div>}

      {temporaryPassword && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true"><div className="modal-head"><div><span className="eyebrow">RESTABLECIMIENTO COMPLETO</span><h2>Contraseña temporal</h2><p>Copiala ahora y entregala al usuario por un canal seguro. No se volverá a mostrar.</p></div><button className="icon-button" onClick={() => setTemporaryPassword(null)} aria-label="Cerrar"><X size={19} /></button></div><div className="modal-content"><div className="temporary-password">{temporaryPassword}</div><button className="button button-soft full-width" onClick={() => { void navigator.clipboard.writeText(temporaryPassword); notify('Contraseña copiada al portapapeles.', 'success'); }}><KeyRound size={16} /> Copiar contraseña</button></div><div className="modal-actions"><button className="button button-primary" onClick={() => setTemporaryPassword(null)}>Listo, ya la guardé</button></div></section></div>}
    </section>
  );
}

type PermissionEffect = 'Grant' | 'Deny' | 'Inherit';

type UserAccessEditorPageProps = {
  mode: 'user';
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
  mode: 'role';
  role: Role;
  catalog: Permission[];
  permissionSearch: string;
  setPermissionSearch: Dispatch<SetStateAction<string>>;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
  onRolePermissionsChange: (permissionIds: string[]) => void;
};

type AccessEditorPageProps = UserAccessEditorPageProps | RolePermissionEditorPageProps;

function AccessEditorPage(props: AccessEditorPageProps) {
  const query = props.permissionSearch.trim().toLocaleLowerCase('es-CR');
  const permissionGroups = props.catalog.reduce<Record<string, Permission[]>>((groups, permission) => {
    (groups[permission.moduleName] ??= []).push(permission);
    return groups;
  }, {});
  const visibleGroups = Object.entries(permissionGroups)
    .sort(([a], [b]) => a.localeCompare(b, 'es-CR'))
    .map(([name, permissions]) => ({
      name,
      permissions: (!query || name.toLocaleLowerCase('es-CR').includes(query))
        ? permissions
        : permissions.filter((permission) =>
          `${permission.name} ${permission.code} ${permission.moduleCode} ${permission.description ?? ''}`.toLocaleLowerCase('es-CR').includes(query)
        ),
    }))
    .filter((group) => group.permissions.length > 0);
  const visiblePermissionsCount = visibleGroups.reduce((total, group) => total + group.permissions.length, 0);
  const title = props.mode === 'user' ? 'Editar accesos' : 'Administrar permisos';
  const breadcrumbOrigin = props.mode === 'user' ? 'Usuarios' : 'Roles y permisos';
  const selectedCount = props.mode === 'user'
    ? Object.values(props.userOverrides).filter((effect) => effect !== 'Inherit').length
    : props.role.permissionIds.length;
  const userHasAdministratorRole = props.mode === 'user'
    && props.roles.some((role) => role.name === 'Administrator' && props.userRoleIds.includes(role.id));

  return (
    <div className="access-editor-page">
      <nav className="access-breadcrumbs" aria-label="Ruta de navegación">
        <button type="button" onClick={props.onCancel}>Configuración</button>
        <ChevronRight size={14} aria-hidden="true" />
        <button type="button" onClick={props.onCancel}>{breadcrumbOrigin}</button>
        <ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page">{props.mode === 'user' ? props.user.displayName : props.role.name}</span>
      </nav>

      <header className="access-editor-heading">
        <div className="access-editor-title-row">
          <div className="access-editor-icon" aria-hidden="true">
            {props.mode === 'user' ? <UserRoundCog size={25} /> : <ShieldCheck size={25} />}
          </div>
          <div className="access-editor-title-copy">
            <span className="eyebrow">CENTRO DE CONTROL / {props.mode === 'user' ? 'USUARIOS' : 'ROLES Y PERMISOS'}</span>
            <h1>{title}</h1>
            <p>{props.mode === 'user'
              ? `${props.user.displayName} · ${props.user.email}`
              : (props.role.description || 'Definí los permisos que tendrá este rol en cada módulo.')
            }</p>
          </div>
        </div>
        <div className="access-editor-context">
          {props.mode === 'user'
            ? <><span className="access-context-label">Cuenta</span><strong>{props.user.displayName}</strong><span>{props.user.isActive ? 'Activa' : 'Bloqueada'}</span></>
            : <><span className="access-context-label">Rol</span><strong>{props.role.name}</strong>{props.role.isSystemRole && <span className="access-system-badge">Rol del sistema</span>}</>
          }
        </div>
      </header>

      <div className="access-editor-actions" role="group" aria-label="Acciones del editor">
        <div className="access-editor-action-copy">
          <strong>{props.mode === 'user' ? 'Configuración de accesos' : 'Permisos del rol'}</strong>
          <span>{props.mode === 'user'
            ? `${props.userRoleIds.length} roles asignados · ${selectedCount} excepciones directas`
            : `${selectedCount} de ${props.catalog.length} permisos seleccionados`
          }</span>
        </div>
        <div className="access-editor-action-buttons">
          <button type="button" className="button button-soft" onClick={props.onCancel} disabled={props.saving}>
            <ArrowLeft size={16} /> Cancelar
          </button>
          <button type="button" className="button button-primary" onClick={props.onSave} disabled={props.saving || (props.mode === 'role' && props.role.isSystemRole)}>
            <Save size={16} /> {props.saving ? 'Guardando…' : props.mode === 'user' ? 'Guardar accesos' : 'Guardar permisos'}
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
          <span><strong>{visiblePermissionsCount}</strong> de {props.catalog.length} permisos visibles</span>
          <span className="access-filter-divider" aria-hidden="true" />
          <span>{selectedCount} {props.mode === 'user' ? 'excepciones directas' : 'seleccionados'}</span>
          {props.permissionSearch && <button type="button" onClick={() => props.setPermissionSearch('')}>Limpiar búsqueda</button>}
        </div>
      </div>

      {props.mode === 'user' ? (
        <>
          <section className="access-editor-section">
            <div className="access-section-heading">
              <div>
                <h2>Roles asignados</h2>
                <p>Los permisos de cada rol se combinan con las excepciones directas de esta cuenta.</p>
              </div>
              <span className="access-section-count">{props.userRoleIds.length} seleccionados</span>
            </div>
            <div className="access-role-grid">
              {props.roles.map((role) => {
                const checked = props.userRoleIds.includes(role.id);
                return (
                  <label className={checked ? 'access-role-choice is-selected' : 'access-role-choice'} key={role.id}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => props.setUserRoleIds((current) =>
                        event.target.checked
                          ? [...current, role.id]
                          : current.filter((id) => id !== role.id)
                      )}
                    />
                    <span className="access-role-choice-content">
                      <strong>{role.name}</strong>
                      <span>{role.description || 'Rol de acceso'}</span>
                      <small><UsersRound size={13} /> {role.permissions.length} permisos · {role.userCount} usuarios</small>
                    </span>
                    <span className="access-role-check" aria-hidden="true">{checked ? <Check size={16} /> : null}</span>
                  </label>
                );
              })}
            </div>
          </section>

          {userHasAdministratorRole ? (
            <div className="access-editor-notice">
              <ShieldCheck size={19} />
              <div><strong>Acceso de administrador</strong><p>Esta cuenta tiene el rol Administrator. Las excepciones directas no se editan mientras ese rol esté asignado.</p></div>
            </div>
          ) : props.loadingPermissions ? (
            <section className="access-editor-loading" role="status">
              <span className="button-spinner" />
              <div><strong>Cargando permisos directos…</strong><p>Estamos consultando las excepciones actuales de esta cuenta.</p></div>
            </section>
          ) : (
            <section className="access-editor-section">
              <div className="access-section-heading">
                <div>
                  <h2>Permisos directos</h2>
                  <p>Usá Conceder o Denegar para establecer una excepción. Heredar respeta los permisos de los roles.</p>
                </div>
                <span className="access-section-count">{selectedCount} excepciones</span>
              </div>
              {visibleGroups.length === 0 ? (
                <p className="access-empty-state">No se encontraron permisos con ese criterio de búsqueda.</p>
              ) : (
                <div className="access-module-grid">
                  {visibleGroups.map(({ name, permissions }) => (
                    <article className="access-module-card" key={name}>
                      <header className="access-module-heading">
                        <div><h3>{name}</h3><p>{permissions.length} permisos</p></div>
                        <span className="access-module-count">{permissions.filter((permission) => (props.userOverrides[permission.id] ?? 'Inherit') !== 'Inherit').length}/{permissions.length}</span>
                      </header>
                      <div className="access-permission-list">
                        {permissions.map((permission) => {
                          const effect = props.userOverrides[permission.id] ?? 'Inherit';
                          return (
                            <div className={`access-permission-row ${effect.toLowerCase()}`} key={permission.id}>
                              <div className="access-permission-copy">
                                <strong>{permission.name}</strong>
                                <code>{permission.code}</code>
                                {permission.description && <p>{permission.description}</p>}
                              </div>
                              <label className="access-effect-control">
                                <span>Acceso</span>
                                <select
                                  aria-label={`Acceso para ${permission.name} (${permission.code})`}
                                  className={`access-permission-select ${effect.toLowerCase()}`}
                                  value={effect}
                                  onChange={(event) => props.setUserOverrides((current) => ({ ...current, [permission.id]: event.target.value as PermissionEffect }))}
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
              <div><strong>Rol del sistema protegido</strong><p>Este rol mantiene todos los permisos del catálogo y no se puede modificar.</p></div>
            </div>
          )}
          {visibleGroups.length === 0 ? (
            <p className="access-empty-state">No se encontraron permisos con ese criterio de búsqueda.</p>
          ) : (
            <div className="access-module-grid role-permission-grid">
              {visibleGroups.map(({ name, permissions }) => {
                const selectedInGroup = permissions.filter((permission) => props.role.permissionIds.includes(permission.id)).length;
                const groupIds = permissions.map((permission) => permission.id);
                return (
                  <article className="access-module-card" key={name}>
                    <header className="access-module-heading">
                      <div><h2>{name}</h2><p>{permissions.length} permisos disponibles</p></div>
                      <span className="access-module-count">{selectedInGroup}/{permissions.length}</span>
                    </header>
                    {!props.role.isSystemRole && (
                      <div className="access-group-actions">
                        <button type="button" onClick={() => props.onRolePermissionsChange(Array.from(new Set([...props.role.permissionIds, ...groupIds])))}>
                          Seleccionar todos
                        </button>
                        <button type="button" onClick={() => props.onRolePermissionsChange(props.role.permissionIds.filter((id) => !groupIds.includes(id)))}>
                          Quitar selección
                        </button>
                      </div>
                    )}
                    <div className="access-permission-list">
                      {permissions.map((permission) => {
                        const checked = props.role.permissionIds.includes(permission.id);
                        return (
                          <label className={checked ? 'access-permission-row role-row is-selected' : 'access-permission-row role-row'} key={permission.id}>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={props.role.isSystemRole}
                              onChange={(event) => props.onRolePermissionsChange(
                                event.target.checked
                                  ? Array.from(new Set([...props.role.permissionIds, permission.id]))
                                  : props.role.permissionIds.filter((id) => id !== permission.id)
                              )}
                            />
                            <span className="access-permission-copy">
                              <strong>{permission.name}</strong>
                              <code>{permission.code}</code>
                              {permission.description && <p>{permission.description}</p>}
                            </span>
                            <span className="access-role-check" aria-hidden="true">{checked ? <Check size={15} /> : null}</span>
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
