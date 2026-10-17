import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity, ArrowRight, BookOpenCheck, Check, ChevronDown, CircleHelp, Command, Eye, EyeOff,
  Flower2, Gauge, KeyRound, LogOut, Moon, PanelLeftClose, PanelLeftOpen, Settings2,
  ShieldCheck, Sparkles, Sun, UserRound, UsersRound, type LucideIcon,
} from 'lucide-react';
import SettingsPage from './SettingsPage';
import { api, ApiError, ensureCsrf } from './lib/api';

type User = {
  id: string; email: string; displayName: string; isActive: boolean; mustChangePassword: boolean;
  accessFailedCount: number; lockoutEnd: string | null; createdAt: string; roles: string[];
};
type Profile = { user: User; permissions: string[] };
type Screen = 'dashboard' | 'settings' | 'profile';
type Notice = { message: string; tone: 'success' | 'error' };

type NavItem = { id: Screen; label: string; caption: string; icon: LucideIcon; permission?: string };
const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Resumen', caption: 'Vista general', icon: Gauge, permission: 'dashboard.view' },
  { id: 'settings', label: 'Configuración', caption: 'Usuarios y accesos', icon: Settings2, permission: 'settings.users.read' },
  { id: 'profile', label: 'Mi cuenta', caption: 'Perfil y seguridad', icon: UserRound },
];

function messageFrom(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado. Intentá de nuevo.';
}

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [busy, setBusy] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('pastel-theme') === 'dark' ? 'dark' : 'light'));
  const [collapsed, setCollapsed] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const notify = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    setNotice({ message, tone });
    window.setTimeout(() => setNotice(null), 4200);
  }, []);

  const loadProfile = useCallback(async (): Promise<Profile> => api<Profile>('/api/auth/me'), []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('pastel-theme', theme);
  }, [theme]);

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        await ensureCsrf();
        try {
          const me = await loadProfile();
          if (active) setProfile(me);
        } catch (error) {
          if (!(error instanceof ApiError && error.status === 401)) throw error;
          try {
            await api('/api/auth/refresh', { method: 'POST', body: '{}' });
            const me = await loadProfile();
            if (active) setProfile(me);
          } catch (refreshError) {
            if (!(refreshError instanceof ApiError && [400, 401].includes(refreshError.status))) throw refreshError;
          }
        }
      } catch (error) {
        if (active) notify(messageFrom(error), 'error');
      } finally {
        if (active) setBusy(false);
      }
    };
    void bootstrap();
    return () => { active = false; };
  }, [loadProfile, notify]);

  const canSettings = useMemo(() => Boolean(profile?.permissions.some((x) => x.startsWith('settings.'))), [profile]);
  const visibleNav = navItems.filter((item) => !item.permission || profile?.permissions.includes(item.permission) || (item.id === 'settings' && canSettings));
  const currentUser = profile?.user;

  const authenticate = async (event: FormEvent<HTMLFormElement>, values: { email: string; password: string; displayName?: string }) => {
    event.preventDefault(); setAuthLoading(true);
    try {
      if (authMode === 'register') await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ email: values.email, password: values.password, displayName: values.displayName }) });
      else await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: values.email, password: values.password }) });
      setProfile(await loadProfile());
      setScreen('dashboard');
      notify(authMode === 'register' ? 'Tu cuenta quedó creada. ¡Bienvenido a Pastel!' : 'Sesión iniciada correctamente.');
    } catch (error) { notify(messageFrom(error), 'error'); }
    finally { setAuthLoading(false); }
  };

  const logout = async () => {
    try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); }
    catch { /* Local state is cleared even if the server session has already expired. */ }
    setProfile(null); setScreen('dashboard'); setAuthMode('login');
    await ensureCsrf().catch(() => undefined);
    notify('Cerraste la sesión.');
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>, form: { currentPassword: string; newPassword: string; confirmation: string }) => {
    event.preventDefault();
    if (form.newPassword !== form.confirmation) { notify('Las contraseñas nuevas no coinciden.', 'error'); return; }
    if (form.newPassword.length < 12 || !/[A-Z]/.test(form.newPassword) || !/[a-z]/.test(form.newPassword) || !/\d/.test(form.newPassword) || !/[^A-Za-z0-9]/.test(form.newPassword)) {
      notify('Usá al menos 12 caracteres, con mayúscula, minúscula, número y símbolo.', 'error'); return;
    }
    setAuthLoading(true);
    try {
      await api('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }) });
      setProfile(null); setAuthMode('login');
      notify('Contraseña actualizada. Ingresá con tu nueva contraseña.');
    } catch (error) { notify(messageFrom(error), 'error'); }
    finally { setAuthLoading(false); }
  };

  if (busy) return <div className="startup-screen"><div className="brand-mark brand-mark-large"><Flower2 size={27} /></div><span className="startup-title">Pastel</span><div className="loading-line" /><p>Preparando tu espacio de trabajo…</p></div>;

  if (!profile) return <AuthScreen mode={authMode} setMode={setAuthMode} onSubmit={authenticate} loading={authLoading} theme={theme} toggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')} notice={notice} dismissNotice={() => setNotice(null)} />;

  if (currentUser?.mustChangePassword) {
    return <ChangePasswordScreen user={currentUser} mandatory onSubmit={changePassword} loading={authLoading} theme={theme} toggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')} notify={notify} onLogout={logout} notice={notice} dismissNotice={() => setNotice(null)} />;
  }

  return (
    <div className={collapsed ? 'app-shell sidebar-collapsed' : 'app-shell'}>
      <aside className="sidebar">
        <button className="brand-lockup" onClick={() => setScreen('dashboard')} aria-label="Ir al inicio" title={collapsed ? 'Ir al inicio' : undefined}><span className="brand-mark"><Flower2 size={22} /></span><span className="brand-wordmark"><strong>pastel</strong><small>WORKSPACE</small></span></button>
        <div className="workspace-selector"><div className="workspace-icon"><Command size={16} /></div><div><strong>Mi espacio</strong><small>Plan esencial</small></div><ChevronDown size={15} /></div>
        <span className="sidebar-label">MENÚ PRINCIPAL</span>
        <nav className="sidebar-nav" aria-label="Navegación principal">
          {visibleNav.map((item) => { const Icon = item.icon; return <button key={item.id} className={screen === item.id ? 'nav-item active' : 'nav-item'} data-tooltip={collapsed ? item.label : undefined} title={collapsed ? item.label : undefined} aria-label={collapsed ? item.label : undefined} onClick={() => setScreen(item.id)}><Icon size={19} strokeWidth={1.8} /><span><strong>{item.label}</strong><small>{item.caption}</small></span>{item.id === 'settings' && <span className="nav-dot" />}</button>; })}
        </nav>
        <div className="sidebar-spacer" />
        <div className="security-note"><div className="security-note-icon"><ShieldCheck size={18} /></div><div><strong>Tu espacio, protegido</strong><p>Accesos administrados de forma segura.</p></div></div>
        <button className="help-link" data-tooltip={collapsed ? 'Centro de ayuda' : undefined} title={collapsed ? 'Centro de ayuda' : undefined} aria-label={collapsed ? 'Centro de ayuda' : undefined} onClick={() => notify('La documentación se encuentra en el README del proyecto.')}><CircleHelp size={17} /><span>Centro de ayuda</span><ArrowRight size={15} /></button>
        <div className="sidebar-bottom"><span className="online-pip" /> Sistema operativo <span className="version">v0.1</span></div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button collapse-button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}>{collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}</button><span className="breadcrumb">Workspace <span>/</span> <strong>{screen === 'dashboard' ? 'Resumen' : screen === 'settings' ? 'Configuración' : 'Mi cuenta'}</strong></span></div>
          <div className="topbar-actions"><span className="today-label">Tu espacio de trabajo</span><button className="icon-button theme-switch" aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'} title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button><div className="topbar-divider" /><button className="account-menu" onClick={() => setScreen('profile')}><span className="avatar">{(currentUser?.displayName ?? 'U').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()}</span><span className="account-copy"><strong>{currentUser?.displayName}</strong><small>{currentUser?.roles.includes('Administrator') ? 'Administrador' : 'Mi cuenta'}</small></span><ChevronDown size={15} /></button><button className="icon-button logout-button" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={() => void logout()}><LogOut size={18} /></button></div>
        </header>

        <main className="main-content">
          {screen === 'dashboard' && <Dashboard user={currentUser!} permissions={profile.permissions} openSettings={() => setScreen('settings')} notify={notify} />}
          {screen === 'settings' && <SettingsPage permissions={profile.permissions} notify={notify} />}
          {screen === 'profile' && <ProfilePage user={currentUser!} permissions={profile.permissions} onChangePassword={() => notify('Para cambiar tu contraseña, completá el formulario que se abre a continuación.')} onSubmitChangePassword={changePassword} loading={authLoading} notify={notify} />}
        </main>

        <footer className="app-footer"><span>© {new Date().getFullYear()} Pastel Workspace</span><span className="footer-center"><span className="online-pip" /> Todos los sistemas en funcionamiento</span><span>Hecho para crecer con vos <Flower2 size={14} /></span></footer>
      </div>
      {notice && <div role="status" className={`toast ${notice.tone}`}><span className="toast-symbol">{notice.tone === 'success' ? <Check size={17} /> : <CircleHelp size={17} />}</span><span>{notice.message}</span><button className="toast-close" onClick={() => setNotice(null)} aria-label="Cerrar aviso">×</button></div>}
    </div>
  );
}

function Dashboard({ user, permissions, openSettings, notify }: { user: User; permissions: string[]; openSettings: () => void; notify: (message: string, tone?: 'success' | 'error') => void }) {
  const firstName = user.displayName.trim().split(/\s+/)[0];
  const stats = [
    { label: 'Tu acceso', value: user.isActive ? 'Activo' : 'Bloqueado', detail: user.roles.length ? user.roles.join(', ') : 'Sin roles asignados', icon: ShieldCheck, tint: 'accent' },
    { label: 'Permisos disponibles', value: permissions.length.toString(), detail: 'Según tus roles y excepciones', icon: KeyRound, tint: 'blue' },
    { label: 'Módulos habilitados', value: permissions.filter((x) => x.endsWith('.read') || x === 'dashboard.view').length.toString(), detail: 'Acciones que podés utilizar', icon: BookOpenCheck, tint: 'sand' },
  ];
  return <div className="dashboard-page">
    <section className="welcome-banner"><div className="welcome-copy"><span className="eyebrow">TU ESPACIO, A TU RITMO</span><h1>¡Qué bueno verte, {firstName}!</h1><p>Todo lo importante para tu equipo, en un espacio claro, tranquilo y seguro.</p><div className="welcome-actions"><button className="button button-dark" onClick={() => openSettings()} disabled={!permissions.some((x) => x.startsWith('settings.'))}>Ir a configuración <ArrowRight size={16} /></button><button className="text-button" onClick={() => notify('Podés cambiar la apariencia desde el botón de sol y luna en la barra superior.')}>Personalizar espacio</button></div></div><div className="welcome-art" aria-hidden="true"><div className="art-sun" /><div className="art-leaf art-leaf-one" /><div className="art-leaf art-leaf-two" /><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-center"><Sparkles size={48} strokeWidth={1.35} /></div><span className="art-star star-one">✳</span><span className="art-star star-two">✦</span></div></section>
    <div className="section-title-row"><div><h2>Tu resumen</h2><p>Un vistazo rápido a tu espacio de trabajo.</p></div><span className="date-pill"><Activity size={15} /> Actualizado ahora</span></div>
    <div className="stat-grid">{stats.map((stat) => { const Icon = stat.icon; return <article className="stat-card" key={stat.label}><div className={`stat-icon ${stat.tint}`}><Icon size={19} /></div><div className="stat-label">{stat.label}</div><div className="stat-value">{stat.value}</div><p>{stat.detail}</p></article>; })}</div>
    <div className="content-grid"><section className="panel getting-started"><div className="panel-heading"><div><span className="eyebrow">PARA EMPEZAR</span><h2>Tu espacio, a tu manera</h2><p>Un par de pasos para dejar todo listo.</p></div><span className="soft-illustration"><Sparkles size={22} /></span></div><div className="checklist"><div className="checklist-row done"><span className="check-circle"><Check size={14} /></span><div><strong>Tu cuenta está lista</strong><p>Tu acceso ya está configurado y protegido.</p></div><span className="check-status">Completado</span></div><div className="checklist-row"><span className="check-circle outline"><UsersRound size={14} /></span><div><strong>Organizá los accesos</strong><p>Los permisos mantienen cada módulo en su lugar.</p></div>{permissions.some((x) => x.startsWith('settings.')) ? <button className="mini-link" onClick={openSettings}>Revisar <ArrowRight size={14} /></button> : <span className="check-status">Según rol</span>}</div><div className="checklist-row"><span className="check-circle outline"><Sun size={14} /></span><div><strong>Elegí tu apariencia</strong><p>Usá el modo claro u oscuro según el momento.</p></div><span className="check-status">A tu gusto</span></div></div></section>
      <section className="panel security-panel"><div className="panel-heading"><div><span className="eyebrow">SEGURIDAD DE LA CUENTA</span><h2>Todo en orden</h2><p>Tu sesión y tu acceso están activos.</p></div><div className="security-big-icon"><ShieldCheck size={24} /></div></div><div className="security-meter"><span /></div><div className="security-fact"><span>Estado de la cuenta</span><strong><span className="online-pip" /> {user.isActive ? 'Protegida' : 'Bloqueada'}</strong></div><div className="security-fact"><span>Roles asignados</span><strong>{user.roles.length || 'Ninguno'}</strong></div><div className="security-fact"><span>Accesos directos</span><strong>{permissions.length} permisos efectivos</strong></div><button className="button button-soft full-width" onClick={() => notify('La autenticación usa cookies HttpOnly, tokens de corta duración y rotación de sesión.')}>Conocer la protección <ArrowRight size={15} /></button></section></div>
    <section className="tip-banner"><span className="tip-icon"><Sparkles size={18} /></span><div><strong>Un buen espacio se construye de a poco.</strong><p>Pastel está diseñado para crecer con nuevos módulos sin perder claridad ni control.</p></div><button className="icon-button" aria-label="Más información" onClick={() => notify('Consultá el README para la arquitectura y los pasos para agregar un módulo.')}><ArrowRight size={18} /></button></section>
  </div>;
}

function AuthScreen({ mode, setMode, onSubmit, loading, theme, toggleTheme, notice, dismissNotice }: { mode: 'login' | 'register'; setMode: (mode: 'login' | 'register') => void; onSubmit: (event: FormEvent<HTMLFormElement>, values: { email: string; password: string; displayName?: string }) => Promise<void>; loading: boolean; theme: 'light' | 'dark'; toggleTheme: () => void; notice: Notice | null; dismissNotice: () => void }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [showPassword, setShowPassword] = useState(false);
  const isRegister = mode === 'register';
  return <div className="auth-screen"><div className="auth-topbar"><button className="brand-lockup" aria-label="Pastel"><span className="brand-mark"><Flower2 size={22} /></span><span className="brand-wordmark"><strong>pastel</strong><small>WORKSPACE</small></span></button><button className="icon-button theme-switch" aria-label="Cambiar tema" onClick={toggleTheme}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button></div><div className="auth-layout"><section className="auth-story"><span className="eyebrow">UN ESPACIO PARA CRECER</span><h1>Todo en su lugar.<br /><span>Todo fluye mejor.</span></h1><p>Una forma más tranquila de gestionar tu equipo, organizar accesos y construir algo grande.</p><div className="auth-feature-list"><div><span><ShieldCheck size={18} /></span><div><strong>Seguridad por diseño</strong><small>Accesos claros y controlados desde el inicio.</small></div></div><div><span><Flower2 size={18} /></span><div><strong>Simple y ordenado</strong><small>Una experiencia limpia que no se interpone.</small></div></div><div><span><Sparkles size={18} /></span><div><strong>Preparado para crecer</strong><small>Una base modular para todo lo que sigue.</small></div></div></div><div className="auth-orbit-art" aria-hidden="true"><div className="auth-orbit-ring" /><div className="auth-orbit-core"><Flower2 size={62} strokeWidth={1.2} /></div><span className="auth-orbit-dot dot-a" /><span className="auth-orbit-dot dot-b" /><span className="auth-orbit-dot dot-c" /></div></section><section className="auth-card-wrap"><form className="auth-card" onSubmit={(event) => void onSubmit(event, { email, password, displayName: name })}><span className="auth-card-icon"><KeyRound size={21} /></span><span className="eyebrow">{isRegister ? 'CREÁ TU ESPACIO' : 'QUÉ BUENO TENERTE DE VUELTA'}</span><h2>{isRegister ? 'Crear una cuenta' : 'Iniciar sesión'}</h2><p className="auth-subtitle">{isRegister ? 'Completá tus datos para comenzar.' : 'Ingresá tus datos para continuar.'}</p>{isRegister && <label className="field-label">Nombre completo<input autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Cómo te llamás" /></label>}<label className="field-label">Correo electrónico<input autoComplete="email" type="email" required maxLength={320} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com" /></label><label className="field-label">Contraseña<div className="password-field"><input autoComplete={isRegister ? 'new-password' : 'current-password'} type={showPassword ? 'text' : 'password'} required minLength={isRegister ? 12 : 1} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isRegister ? 'Al menos 12 caracteres' : 'Tu contraseña'} /><button type="button" className="password-eye" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{isRegister && <small>12+ caracteres, mayúscula, minúscula, número y símbolo.</small>}</label>{!isRegister && <div className="auth-inline-note"><ShieldCheck size={15} /> Conexión protegida y sesión cifrada.</div>}<button className="button button-primary auth-submit" disabled={loading}>{loading ? <span className="button-spinner" /> : null}{isRegister ? 'Crear mi cuenta' : 'Entrar a mi espacio'} <ArrowRight size={16} /></button><div className="auth-switch">{isRegister ? '¿Ya tenés una cuenta?' : '¿Es tu primera vez acá?'} <button type="button" onClick={() => setMode(isRegister ? 'login' : 'register')}>{isRegister ? 'Iniciá sesión' : 'Creá una cuenta'}</button></div><div className="auth-legal">Al continuar, aceptás usar este espacio de forma responsable y segura.</div></form><div className="auth-trust"><span><LockKeyRoundIcon /> Sesión protegida</span><span>•</span><span>Privacidad primero</span></div></section></div><footer className="auth-footer"><span>© {new Date().getFullYear()} Pastel Workspace</span><span>Hecho para crecer con vos <Flower2 size={13} /></span></footer>{notice && <div role="status" className={`toast ${notice.tone}`}><span className="toast-symbol">{notice.tone === 'success' ? <Check size={17} /> : <CircleHelp size={17} />}</span><span>{notice.message}</span><button className="toast-close" onClick={dismissNotice} aria-label="Cerrar aviso">×</button></div>}</div>;
}

function LockKeyRoundIcon() { return <ShieldCheck size={14} />; }

function ChangePasswordScreen({ user, mandatory, onSubmit, loading, theme, toggleTheme, notify, onLogout, notice, dismissNotice }: { user: User; mandatory: boolean; onSubmit: (event: FormEvent<HTMLFormElement>, form: { currentPassword: string; newPassword: string; confirmation: string }) => Promise<void>; loading: boolean; theme: 'light' | 'dark'; toggleTheme: () => void; notify: (message: string, tone?: 'success' | 'error') => void; onLogout: () => void; notice: Notice | null; dismissNotice: () => void }) {
  const [currentPassword, setCurrentPassword] = useState(''); const [newPassword, setNewPassword] = useState(''); const [confirmation, setConfirmation] = useState(''); const [visible, setVisible] = useState(false);
  return <div className="password-change-screen"><div className="auth-topbar"><div className="brand-lockup"><span className="brand-mark"><Flower2 size={22} /></span><span className="brand-wordmark"><strong>pastel</strong><small>WORKSPACE</small></span></div><div className="auth-top-actions"><button className="icon-button theme-switch" aria-label="Cambiar tema" onClick={toggleTheme}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button><button className="button button-soft" onClick={onLogout}><LogOut size={16} /> Cerrar sesión</button></div></div><form className="password-change-card" onSubmit={(e) => void onSubmit(e, { currentPassword, newPassword, confirmation })}><div className="password-shield"><ShieldCheck size={28} /></div><span className="eyebrow">{mandatory ? 'PRIMER INGRESO' : 'SEGURIDAD DE TU CUENTA'}</span><h1>{mandatory ? 'Un último paso para empezar' : 'Actualizá tu contraseña'}</h1><p>{mandatory ? `Hola ${user.displayName.split(' ')[0]}, te asignaron una contraseña temporal. Elegí una nueva para proteger tu cuenta y continuar.` : 'Elegí una contraseña sólida que no uses en otros servicios.'}</p><label className="field-label">{mandatory ? 'Contraseña temporal' : 'Contraseña actual'}<input required type={visible ? 'text' : 'password'} autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></label><label className="field-label">Contraseña nueva<div className="password-field"><input required minLength={12} maxLength={128} type={visible ? 'text' : 'password'} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /><button type="button" className="password-eye" aria-label="Mostrar u ocultar contraseña" onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label><label className="field-label">Confirmar contraseña<input required minLength={12} maxLength={128} type={visible ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></label><div className="password-requirements"><strong>Tu contraseña debe incluir:</strong><span className={newPassword.length >= 12 ? 'requirement checked' : 'requirement'}><Check size={14} /> 12 caracteres como mínimo</span><span className={/[A-Z]/.test(newPassword) ? 'requirement checked' : 'requirement'}><Check size={14} /> Una letra mayúscula y minúscula</span><span className={/\d/.test(newPassword) ? 'requirement checked' : 'requirement'}><Check size={14} /> Un número</span><span className={/[^A-Za-z0-9]/.test(newPassword) ? 'requirement checked' : 'requirement'}><Check size={14} /> Un símbolo</span></div><button className="button button-primary auth-submit" disabled={loading}>{loading ? 'Actualizando…' : 'Guardar contraseña'} <ArrowRight size={16} /></button><button type="button" className="text-button full-width center-text" onClick={() => notify('No compartás la contraseña temporal por canales públicos.', 'error')}>Consejos para cuidar tu cuenta</button></form><footer className="auth-footer"><span>© {new Date().getFullYear()} Pastel Workspace</span><span>Tu seguridad es parte de todo <Flower2 size={13} /></span></footer>{notice && <div role="status" className={`toast ${notice.tone}`}><span className="toast-symbol">{notice.tone === 'success' ? <Check size={17} /> : <CircleHelp size={17} />}</span><span>{notice.message}</span><button className="toast-close" onClick={dismissNotice} aria-label="Cerrar aviso">×</button></div>}</div>;
}

function ProfilePage({ user, permissions, onChangePassword, onSubmitChangePassword, loading, notify }: { user: User; permissions: string[]; onChangePassword: () => void; onSubmitChangePassword: (event: FormEvent<HTMLFormElement>, form: { currentPassword: string; newPassword: string; confirmation: string }) => Promise<void>; loading: boolean; notify: (message: string, tone?: 'success' | 'error') => void }) {
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState(''); const [newPassword, setNewPassword] = useState(''); const [confirmation, setConfirmation] = useState('');
  return <div className="profile-page"><div className="page-heading"><div><span className="eyebrow">TU ESPACIO PERSONAL</span><h1>Mi cuenta</h1><p>Revisá tu perfil y mantené tu acceso bajo control.</p></div></div><div className="profile-layout"><section className="panel profile-main"><div className="profile-banner"><div className="avatar avatar-large">{user.displayName.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()}</div><div><h2>{user.displayName}</h2><p>{user.email}</p><span className="status status-active"><span /> Cuenta activa</span></div></div><div className="profile-details"><div><span>Nombre de usuario</span><strong>{user.displayName}</strong></div><div><span>Correo electrónico</span><strong>{user.email}</strong></div><div><span>Fecha de alta</span><strong>{new Intl.DateTimeFormat('es-CR', { dateStyle: 'long' }).format(new Date(user.createdAt))}</strong></div><div><span>Roles asignados</span><strong>{user.roles.join(', ') || 'Sin roles'}</strong></div></div><div className="profile-card-footer"><div><strong>¿Necesitás actualizar tus datos?</strong><p>Por ahora, la edición del perfil está deshabilitada para mantener la información consistente.</p></div><button className="button button-soft" onClick={() => notify('Solicitá a administración que actualice tu nombre de perfil.')}>Solicitar cambio</button></div></section><section className="panel profile-security"><div className="panel-heading"><div><span className="eyebrow">PROTECCIÓN</span><h2>Seguridad</h2><p>Tu acceso se revisa en cada solicitud.</p></div><div className="security-big-icon"><ShieldCheck size={24} /></div></div><div className="security-detail"><span className="security-detail-icon"><KeyRound size={17} /></span><div><strong>Contraseña</strong><p>Actualizala periódicamente y no la compartás.</p></div><button className="button button-soft" onClick={() => { onChangePassword(); setPasswordDialog(true); }}>Cambiar</button></div><div className="security-detail"><span className="security-detail-icon"><ShieldCheck size={17} /></span><div><strong>Autorización</strong><p>Tenés {permissions.length} permisos efectivos.</p></div></div><div className="security-detail"><span className="security-detail-icon"><Activity size={17} /></span><div><strong>Sesión</strong><p>Tokens de corta duración y renovación rotativa.</p></div></div></section></div>{passwordDialog && <div className="modal-backdrop"><form className="modal" onSubmit={(e) => { void onSubmitChangePassword(e, { currentPassword, newPassword, confirmation }).then(() => setPasswordDialog(false)); }}><div className="modal-head"><div><span className="eyebrow">ACTUALIZAR ACCESO</span><h2>Cambiar contraseña</h2><p>Al guardar, tu sesión actual se cerrará.</p></div><button type="button" className="icon-button" aria-label="Cerrar" onClick={() => setPasswordDialog(false)}>×</button></div><div className="modal-content"><label className="field-label">Contraseña actual<input required type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></label><label className="field-label">Contraseña nueva<input required minLength={12} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label><label className="field-label">Confirmar contraseña<input required minLength={12} type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></label></div><div className="modal-actions"><button type="button" className="button button-soft" onClick={() => setPasswordDialog(false)}>Cancelar</button><button className="button button-primary" disabled={loading}>Guardar y cerrar sesión</button></div></form></div>}</div>;
}
