import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Activity, Check, ChevronDown, CirclePlus, KeyRound, LockKeyhole, RefreshCw, ShieldCheck, ToggleLeft, ToggleRight, UserRoundCog, UsersRound, X } from 'lucide-react';
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
    setUserRoleIds(roles.filter((role) => user.roles.includes(role.name)).map((role) => role.id));
    setUserOverrides({});
    try {
      const values = await api<{ permissionId: string; effect: 'Grant' | 'Deny' }[]>(`/api/admin/users/${user.id}/permissions`);
      setUserOverrides(Object.fromEntries(values.map((x) => [x.permissionId, x.effect])));
    } catch (error) { if (!(error instanceof ApiError && error.status === 409)) notify(error instanceof Error ? error.message : 'No se pudieron consultar permisos directos.', 'error'); }
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

      {tab === 'roles' && can('settings.roles.read') && <div className="roles-layout"><div className="section-intro"><div><h2>Roles de acceso</h2><p>Los permisos de un rol se aplican a todas las cuentas que lo tengan asignado.</p></div>{can('settings.roles.create') && <button className="button button-primary" onClick={() => setNewRoleOpen(true)}><CirclePlus size={16} /> Crear rol</button>}</div><div className="roles-grid">{roles.map((role) => <article className="role-card" key={role.id}><div className="role-card-top"><span className="role-icon"><ShieldCheck size={20} /></span>{role.isSystemRole && <span className="chip chip-neutral">Sistema</span>}</div><h3>{role.name}</h3><p>{role.description || 'Sin descripción adicional.'}</p><div className="role-meta"><span><UsersRound size={15} /> {role.userCount} usuarios</span><span><Check size={15} /> {role.permissions.length} permisos</span></div>{can('settings.roles.update') && <button className="button button-soft full-width" onClick={() => setRoleEditor(role)}>Administrar permisos <ChevronDown size={15} /></button>}</article>)}</div></div>}

      {tab === 'modules' && can('settings.modules.read') && <div className="modules-layout"><div className="section-intro"><div><h2>Catálogo de módulos</h2><p>Los nuevos módulos generan permisos que luego podés asignar a roles y usuarios.</p></div>{can('settings.modules.manage') && <button className="button button-primary" onClick={() => setNewModuleOpen(true)}><CirclePlus size={16} /> Registrar módulo</button>}</div><div className="module-grid">{modules.map((module) => <article className="module-card" key={module.id}><div className="module-card-head"><div className="module-symbol"><CirclePlus size={20} /></div><span className={module.isEnabled ? 'status status-active' : 'status status-blocked'}><span />{module.isEnabled ? 'Activo' : 'Desactivado'}</span></div><h3>{module.name}</h3><div className="module-code">{module.code}</div><p>{module.description || 'Módulo registrado en la plataforma.'}</p><div className="module-permissions"><strong>{module.permissions.length} permisos</strong><div>{module.permissions.slice(0, 4).map((perm) => <span className="chip" key={perm.id}>{perm.code}</span>)}{module.permissions.length > 4 && <span className="chip">+{module.permissions.length - 4}</span>}</div></div>{can('settings.modules.manage') && <button className="button button-soft full-width" onClick={() => void toggleModule(module)} disabled={module.code === 'settings'}>{module.isEnabled ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}{module.isEnabled ? 'Desactivar módulo' : 'Activar módulo'}</button>}</article>)}</div></div>}

      {tab === 'audit' && can('settings.audit.read') && <div className="panel table-panel"><div className="panel-heading"><div><h2>Registro de auditoría</h2><p>Eventos administrativos más recientes</p></div><span className="audit-badge"><Activity size={15} /> Solo lectura</span></div><div className="table-scroll"><table><thead><tr><th>Evento</th><th>Actor</th><th>Recurso</th><th>Dirección IP</th><th>Fecha</th></tr></thead><tbody>{audit.map((item) => <tr key={item.id}><td><strong className="audit-action">{friendlyAction(item.action)}</strong></td><td>{item.actorEmail || 'Sistema'}</td><td>{item.target || '—'}</td><td className="muted-cell">{item.ipAddress || '—'}</td><td className="muted-cell">{readableDate(item.createdAt)}</td></tr>)}{audit.length === 0 && <tr><td colSpan={5} className="empty-row">No hay eventos registrados.</td></tr>}</tbody></table></div></div>}

      {userEditor && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setUserEditor(null); }}><section className="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="user-edit-title"><div className="modal-head"><div><span className="eyebrow">GESTIÓN DE ACCESO</span><h2 id="user-edit-title">{userEditor.displayName}</h2><p>{userEditor.email}</p></div><button className="icon-button" onClick={() => setUserEditor(null)} aria-label="Cerrar"><X size={19} /></button></div><div className="modal-content"><h3>Roles asignados</h3><p className="form-hint">Los roles suman permisos. Un bloqueo directo de permiso tiene prioridad sobre los permisos heredados.</p><div className="choice-list">{roles.map((role) => <label className="choice-row" key={role.id}><input type="checkbox" checked={userRoleIds.includes(role.id)} onChange={(e) => setUserRoleIds((old) => e.target.checked ? [...old, role.id] : old.filter((id) => id !== role.id))} /><span><strong>{role.name}</strong><small>{role.description || `${role.permissions.length} permisos`}</small></span></label>)}</div>
          {!roles.some((role) => role.name === 'Administrator' && userRoleIds.includes(role.id)) && <><h3 className="space-top">Permisos directos</h3><p className="form-hint">Elegí “Conceder” o “Denegar” para anular lo heredado de los roles; “Heredar” elimina la excepción individual.</p><div className="override-list">{catalog.map((permission) => <div className="override-row" key={permission.id}><div><strong>{permission.name}</strong><small>{permission.code}</small></div><select aria-label={`Acceso ${permission.code}`} value={userOverrides[permission.id] || 'Inherit'} onChange={(e) => setUserOverrides((old) => ({ ...old, [permission.id]: e.target.value as 'Grant' | 'Deny' | 'Inherit' }))}><option value="Inherit">Heredar</option><option value="Grant">Conceder</option><option value="Deny">Denegar</option></select></div>)}</div></>}
        </div><div className="modal-actions"><button className="button button-soft" onClick={() => setUserEditor(null)}>Cancelar</button><button className="button button-primary" onClick={() => void saveUserAccess()} disabled={saving}>{saving ? 'Guardando…' : 'Guardar accesos'}</button></div></section></div>}

      {newUserOpen && <div className="modal-backdrop"><form className="modal" onSubmit={createUser}><div className="modal-head"><div><span className="eyebrow">NUEVA CUENTA</span><h2>Crear usuario</h2><p>La persona deberá reemplazar su contraseña temporal al ingresar.</p></div><button type="button" className="icon-button" onClick={() => setNewUserOpen(false)} aria-label="Cerrar"><X size={19} /></button></div><div className="modal-content"><label className="field-label">Nombre completo<input required minLength={2} maxLength={100} value={newUser.displayName} onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })} /></label><label className="field-label">Correo electrónico<input required type="email" maxLength={320} value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} /></label><label className="field-label">Contraseña temporal<input required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={newUser.temporaryPassword} onChange={(e) => setNewUser({ ...newUser, temporaryPassword: e.target.value })} /><small>12 caracteres o más, con mayúscula, minúscula, número y símbolo.</small></label><h3>Asignar roles</h3><div className="choice-list">{roles.map((role) => <label className="choice-row" key={role.id}><input type="checkbox" checked={newUser.roleIds.includes(role.id)} onChange={(e) => setNewUser({ ...newUser, roleIds: e.target.checked ? [...newUser.roleIds, role.id] : newUser.roleIds.filter((x) => x !== role.id) })} /><span><strong>{role.name}</strong><small>{role.description || ''}</small></span></label>)}</div></div><div className="modal-actions"><button type="button" className="button button-soft" onClick={() => setNewUserOpen(false)}>Cancelar</button><button className="button button-primary" disabled={saving}>{saving ? 'Creando…' : 'Crear usuario'}</button></div></form></div>}

      {roleEditor && <div className="modal-backdrop"><section className="modal modal-wide" role="dialog" aria-modal="true"><div className="modal-head"><div><span className="eyebrow">ROL Y AUTORIZACIÓN</span><h2>{roleEditor.name}</h2><p>{roleEditor.isSystemRole ? 'Rol del sistema: siempre conserva todos los permisos del catálogo.' : 'Seleccioná los permisos que tendrá este rol.'}</p></div><button className="icon-button" onClick={() => setRoleEditor(null)} aria-label="Cerrar"><X size={19} /></button></div><div className="modal-content">{Object.entries(permissionGroups).map(([group, items]) => <div className="permission-group" key={group}><h3>{group}</h3>{items?.map((permission) => <label className="permission-row" key={permission.id}><input type="checkbox" disabled={roleEditor.isSystemRole} checked={roleEditor.permissionIds.includes(permission.id)} onChange={(e) => setRoleEditor({ ...roleEditor, permissionIds: e.target.checked ? [...roleEditor.permissionIds, permission.id] : roleEditor.permissionIds.filter((id) => id !== permission.id) })} /><span><strong>{permission.name}</strong><small>{permission.code}</small></span></label>)}</div>)}</div><div className="modal-actions"><button className="button button-soft" onClick={() => setRoleEditor(null)}>Cancelar</button><button className="button button-primary" disabled={saving || roleEditor.isSystemRole} onClick={() => void saveRole()}>{saving ? 'Guardando…' : 'Guardar permisos'}</button></div></section></div>}

      {newRoleOpen && <div className="modal-backdrop"><form className="modal modal-wide" onSubmit={createRole}><div className="modal-head"><div><span className="eyebrow">CONTROL DE ACCESO</span><h2>Crear rol</h2><p>Un rol agrupa permisos que se pueden asignar a varias cuentas.</p></div><button type="button" className="icon-button" onClick={() => setNewRoleOpen(false)} aria-label="Cerrar"><X size={19} /></button></div><div className="modal-content"><label className="field-label">Nombre del rol<input required minLength={2} maxLength={64} value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} /></label><label className="field-label">Descripción<textarea maxLength={500} rows={2} value={newRole.description} onChange={(e) => setNewRole({ ...newRole, description: e.target.value })} /></label><h3>Permisos iniciales</h3>{Object.entries(permissionGroups).map(([group, items]) => <div className="permission-group" key={group}><h3>{group}</h3>{items?.map((permission) => <label className="permission-row" key={permission.id}><input type="checkbox" checked={newRole.permissionIds.includes(permission.id)} onChange={(e) => setNewRole({ ...newRole, permissionIds: e.target.checked ? [...newRole.permissionIds, permission.id] : newRole.permissionIds.filter((id) => id !== permission.id) })} /><span><strong>{permission.name}</strong><small>{permission.code}</small></span></label>)}</div>)}</div><div className="modal-actions"><button type="button" className="button button-soft" onClick={() => setNewRoleOpen(false)}>Cancelar</button><button className="button button-primary" disabled={saving}>{saving ? 'Creando…' : 'Crear rol'}</button></div></form></div>}

      {newModuleOpen && <div className="modal-backdrop"><form className="modal" onSubmit={createModule}><div className="modal-head"><div><span className="eyebrow">EXTENDER LA PLATAFORMA</span><h2>Registrar módulo</h2><p>Se crearán permisos por cada acción indicada.</p></div><button type="button" className="icon-button" onClick={() => setNewModuleOpen(false)} aria-label="Cerrar"><X size={19} /></button></div><div className="modal-content"><label className="field-label">Nombre del módulo<input required minLength={2} maxLength={100} value={newModule.name} onChange={(e) => setNewModule({ ...newModule, name: e.target.value, code: newModule.code || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') })} /></label><label className="field-label">Código único<input required pattern="[a-z][a-z0-9-]{1,62}" minLength={2} maxLength={64} value={newModule.code} onChange={(e) => setNewModule({ ...newModule, code: e.target.value })} /><small>Minúsculas, números y guiones; debe iniciar con una letra.</small></label><label className="field-label">Descripción<textarea rows={2} maxLength={500} value={newModule.description} onChange={(e) => setNewModule({ ...newModule, description: e.target.value })} /></label><label className="field-label">Acciones separadas por coma<input required value={newModule.actions} onChange={(e) => setNewModule({ ...newModule, actions: e.target.value })} /><small>Ejemplo: read, create, update, delete, export. Se crearán permisos como inventario.read.</small></label></div><div className="modal-actions"><button type="button" className="button button-soft" onClick={() => setNewModuleOpen(false)}>Cancelar</button><button className="button button-primary" disabled={saving}>{saving ? 'Registrando…' : 'Registrar módulo'}</button></div></form></div>}

      {temporaryPassword && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true"><div className="modal-head"><div><span className="eyebrow">RESTABLECIMIENTO COMPLETO</span><h2>Contraseña temporal</h2><p>Copiala ahora y entregala al usuario por un canal seguro. No se volverá a mostrar.</p></div><button className="icon-button" onClick={() => setTemporaryPassword(null)} aria-label="Cerrar"><X size={19} /></button></div><div className="modal-content"><div className="temporary-password">{temporaryPassword}</div><button className="button button-soft full-width" onClick={() => { void navigator.clipboard.writeText(temporaryPassword); notify('Contraseña copiada al portapapeles.', 'success'); }}><KeyRound size={16} /> Copiar contraseña</button></div><div className="modal-actions"><button className="button button-primary" onClick={() => setTemporaryPassword(null)}>Listo, ya la guardé</button></div></section></div>}
    </section>
  );
}
