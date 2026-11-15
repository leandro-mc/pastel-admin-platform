import {
  Activity,
  ArrowRight,
  BookOpenCheck,
  Check,
  Flower2,
  KeyRound,
  ScrollText,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "@/core/auth";
import { routes } from "@/core/routes";
import { identityPermissions, settingsPaths } from "../paths";

const settingsSections = [
  {
    permission: identityPermissions.usersRead,
    to: settingsPaths.users,
    title: "Usuarios",
    description: "Administre cuentas, estados y accesos individuales.",
    icon: UsersRound,
  },
  {
    permission: identityPermissions.rolesRead,
    to: settingsPaths.roles,
    title: "Roles y permisos",
    description: "Defina los permisos que corresponden a cada función.",
    icon: ShieldCheck,
  },
  {
    permission: identityPermissions.modulesRead,
    to: settingsPaths.modules,
    title: "Aplicaciones de plataforma",
    description: "Revise la disponibilidad global de las aplicaciones.",
    icon: BookOpenCheck,
  },
  {
    permission: identityPermissions.auditRead,
    to: settingsPaths.audit,
    title: "Auditoría",
    description: "Consulte los eventos de administración registrados.",
    icon: ScrollText,
  },
];

/** Inicio privado de Workspace: una bienvenida y accesos administrativos, nunca un catálogo de subapps. */
export function Component() {
  const { user, permissions, hasPermission } = useAuth();
  const sections = settingsSections.filter((item) =>
    hasPermission(item.permission),
  );
  const firstName = user?.displayName.trim().split(/\s+/)[0] ?? "bienvenido";
  const readPermissions = [...permissions].filter((permission) =>
    permission.endsWith(".read"),
  ).length;
  const adminPermissions = [...permissions].filter((permission) =>
    permission.startsWith("settings."),
  ).length;

  if (!user) return null;

  const firstDestination = sections[0]?.to ?? settingsPaths.root;
  const stats = [
    {
      label: "Tu acceso",
      value: user.isActive ? "Activo" : "Bloqueado",
      detail: user.roles.length ? user.roles.join(", ") : "Sin roles asignados",
      icon: ShieldCheck,
    },
    {
      label: "Permisos efectivos",
      value: String(permissions.size),
      detail: "Según tus roles y excepciones",
      icon: KeyRound,
    },
    {
      label: "Permisos de consulta",
      value: String(readPermissions),
      detail: "Acciones de lectura disponibles",
      icon: BookOpenCheck,
    },
  ];

  return (
    <div
      data-module="identity"
      className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 py-7 sm:px-6 sm:py-9"
    >
      <section
        className="workspace-welcome"
        aria-labelledby="workspace-welcome-title"
      >
        <div className="workspace-welcome-copy">
          <span className="workspace-eyebrow">Su espacio, a su ritmo</span>
          <h1 id="workspace-welcome-title" className="workspace-welcome-title">
            ¡Qué gusto tenerle, {firstName}!
          </h1>
          <p>
            Todo lo importante para administrar Pastel, en un espacio claro,
            tranquilo y seguro.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {sections.length > 0 ? (
              <Link
                to={firstDestination}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent-strong px-4 py-2.5 text-sm font-semibold text-on-accent shadow-sm transition hover:opacity-90 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
              >
                Administrar espacio
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            ) : null}
            <Link
              to={routes.account}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface/80 px-4 py-2.5 text-sm font-semibold text-fg transition hover:bg-surface focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
            >
              <UserRound aria-hidden="true" size={17} />
              Mi cuenta
            </Link>
          </div>
        </div>
        <div className="workspace-welcome-art" aria-hidden="true">
          <span className="workspace-art-sun" />
          <span className="workspace-art-leaf workspace-art-leaf-one" />
          <span className="workspace-art-leaf workspace-art-leaf-two" />
          <span className="workspace-art-orbit" />
          <span className="workspace-art-orbit workspace-art-orbit-two" />
          <span className="workspace-art-center">
            <Flower2 size={49} strokeWidth={1.3} />
          </span>
          <span className="workspace-art-mark workspace-art-mark-one">
            <Flower2 size={15} />
          </span>
          <span className="workspace-art-mark workspace-art-mark-two">
            <Check size={13} />
          </span>
        </div>
      </section>

      <section
        aria-labelledby="workspace-summary-title"
        className="flex flex-col gap-4"
      >
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="workspace-summary-title"
              className="text-lg font-bold tracking-tight text-fg"
            >
              Su resumen
            </h2>
            <p className="mt-1 text-sm text-muted">
              Un vistazo rápido a su cuenta y sus capacidades.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted">
            <Activity aria-hidden="true" size={14} />
            Información de tu sesión
          </span>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <article className="workspace-stat-card" key={stat.label}>
                <span className="workspace-stat-icon">
                  <Icon aria-hidden="true" size={19} />
                </span>
                <p className="workspace-stat-label">{stat.label}</p>
                <p className="workspace-stat-value">{stat.value}</p>
                <p className="workspace-stat-detail">{stat.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <section
          className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm"
          aria-labelledby="workspace-actions-title"
        >
          <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <span className="workspace-eyebrow">Para empezar</span>
              <h2
                id="workspace-actions-title"
                className="mt-1 text-lg font-bold tracking-tight text-fg"
              >
                Su espacio, a su manera
              </h2>
              <p className="mt-1 text-sm text-muted">
                Accesos administrativos disponibles para su cuenta.
              </p>
            </div>
            <span className="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong sm:flex">
              <Flower2 aria-hidden="true" size={22} />
            </span>
          </header>
          {sections.length > 0 ? (
            <ul className="grid gap-3 p-4 sm:grid-cols-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <li key={section.permission}>
                    <Link
                      to={section.to}
                      className="workspace-action-card group h-full"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-accent-soft text-accent-strong">
                        <Icon aria-hidden="true" size={19} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block text-sm font-bold text-fg">
                          {section.title}
                        </strong>
                        <span className="mt-1 block text-sm leading-relaxed text-muted">
                          {section.description}
                        </span>
                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-accent-strong">
                          Abrir sección
                          <ArrowRight
                            aria-hidden="true"
                            size={14}
                            className="transition-transform group-hover:translate-x-0.5"
                          />
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p role="status" className="p-5 text-sm text-muted">
              Tu cuenta no tiene secciones administrativas habilitadas.
            </p>
          )}
        </section>

        <section
          className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm"
          aria-labelledby="workspace-security-title"
        >
          <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <span className="workspace-eyebrow">Seguridad de la cuenta</span>
              <h2
                id="workspace-security-title"
                className="mt-1 text-lg font-bold tracking-tight text-fg"
              >
                {user.isActive ? "Todo en orden" : "Revisa tu acceso"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                Estado de tu cuenta y sus privilegios.
              </p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
              <ShieldCheck aria-hidden="true" size={21} />
            </span>
          </header>
          <dl className="px-5 py-2">
            <div className="flex items-center justify-between gap-3 border-b border-line py-3">
              <dt className="text-sm text-muted">Estado de la cuenta</dt>
              <dd className="inline-flex items-center gap-2 text-sm font-semibold text-fg">
                <span
                  className={
                    user.isActive
                      ? "inline-block size-2 rounded-full bg-accent"
                      : "inline-block size-2 rounded-full bg-danger"
                  }
                />
                {user.isActive ? "Activa" : "Bloqueada"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-line py-3">
              <dt className="text-sm text-muted">Roles asignados</dt>
              <dd className="text-sm font-semibold text-fg">
                {user.roles.length || "Ninguno"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-sm text-muted">Permisos de administración</dt>
              <dd className="text-sm font-semibold text-fg">
                {adminPermissions}
              </dd>
            </div>
          </dl>
          <div className="mx-5 mb-5 rounded-xl border border-line bg-app px-4 py-3">
            <p className="text-sm font-semibold text-fg">
              Un espacio que crece con orden
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Cada aplicación mantiene su propia experiencia y sus accesos, con
              una identidad común de Pastel.
            </p>
          </div>
        </section>
      </div>

      <aside className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-accent-soft/50 px-4 py-4 sm:px-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-accent-strong shadow-sm">
          <Flower2 aria-hidden="true" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <strong className="text-sm font-bold text-fg">
            Todo en su lugar. Todo fluye mejor.
          </strong>
          <p className="mt-0.5 text-sm leading-relaxed text-muted">
            La plataforma comparte la seguridad; cada app conserva su propósito,
            herramientas y configuración.
          </p>
        </div>
      </aside>
    </div>
  );
}
