import {
  Activity,
  ArrowRight,
  BookOpenCheck,
  Check,
  Flower2,
  KeyRound,
  ShieldCheck,
  Sun,
  UsersRound,
} from "lucide-react";
import type { Notify, User } from "../types";

type DashboardProps = {
  user: User;
  permissions: string[];
  openSettings: () => void;
  notify: Notify;
};

export default function Dashboard({
  user,
  permissions,
  openSettings,
  notify,
}: DashboardProps) {
  const firstName = user.displayName.trim().split(/\s+/)[0];

  const stats = [
    {
      label: "Tu acceso",
      value: user.isActive ? "Activo" : "Bloqueado",
      detail: user.roles.length ? user.roles.join(", ") : "Sin roles asignados",
      icon: ShieldCheck,
      tint: "accent",
    },
    {
      label: "Permisos disponibles",
      value: permissions.length.toString(),
      detail: "Según tus roles y excepciones",
      icon: KeyRound,
      tint: "blue",
    },
    {
      label: "Módulos habilitados",
      value: permissions
        .filter(
          (permission) =>
            permission.endsWith(".read") || permission === "dashboard.view",
        )
        .length.toString(),
      detail: "Acciones que podés utilizar",
      icon: BookOpenCheck,
      tint: "sand",
    },
  ];

  return (
    <div className="dashboard-page">
      <section className="welcome-banner">
        <div className="welcome-copy">
          <span className="eyebrow">TU ESPACIO, A TU RITMO</span>
          <h1>¡Qué bueno verte, {firstName}!</h1>
          <p>
            Todo lo importante para tu equipo, en un espacio claro, tranquilo y
            seguro.
          </p>

          <div className="welcome-actions">
            <button
              className="button button-dark"
              onClick={openSettings}
              disabled={
                !permissions.some((permission) =>
                  permission.startsWith("settings."),
                )
              }
            >
              Ir a configuración <ArrowRight size={16} />
            </button>
            <button
              className="text-button"
              onClick={() =>
                notify(
                  "Podés cambiar la apariencia desde el botón de sol y luna en la barra superior.",
                )
              }
            >
              Personalizar espacio
            </button>
          </div>
        </div>

        <div className="welcome-art" aria-hidden="true">
          <div className="art-sun" />
          <div className="art-leaf art-leaf-one" />
          <div className="art-leaf art-leaf-two" />
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-center">
            <Flower2 size={54} strokeWidth={1.25} />
          </div>
          <span className="art-mark art-mark-one">
            <Flower2 size={14} />
          </span>
          <span className="art-mark art-mark-two">
            <Check size={12} />
          </span>
        </div>
      </section>

      <div className="section-title-row">
        <div>
          <h2>Tu resumen</h2>
          <p>Un vistazo rápido a tu espacio de trabajo.</p>
        </div>
        <span className="date-pill">
          <Activity size={15} /> Actualizado ahora
        </span>
      </div>

      <div className="stat-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article className="stat-card" key={stat.label}>
              <div className={`stat-icon ${stat.tint}`}>
                <Icon size={19} />
              </div>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value">{stat.value}</div>
              <p>{stat.detail}</p>
            </article>
          );
        })}
      </div>

      <div className="content-grid">
        <section className="panel getting-started">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">PARA EMPEZAR</span>
              <h2>Tu espacio, a tu manera</h2>
              <p>Un par de pasos para dejar todo listo.</p>
            </div>
            <span className="soft-illustration" aria-hidden="true">
              <Flower2 size={22} />
            </span>
          </div>

          <div className="checklist">
            <div className="checklist-row done">
              <span className="check-circle">
                <Check size={14} />
              </span>
              <div>
                <strong>Tu cuenta está lista</strong>
                <p>Tu acceso ya está configurado y protegido.</p>
              </div>
              <span className="check-status">Completado</span>
            </div>

            <div className="checklist-row">
              <span className="check-circle outline">
                <UsersRound size={14} />
              </span>
              <div>
                <strong>Organizá los accesos</strong>
                <p>Los permisos mantienen cada módulo en su lugar.</p>
              </div>
              {permissions.some((permission) =>
                permission.startsWith("settings."),
              ) ? (
                <button className="mini-link" onClick={openSettings}>
                  Revisar <ArrowRight size={14} />
                </button>
              ) : (
                <span className="check-status">Según rol</span>
              )}
            </div>

            <div className="checklist-row">
              <span className="check-circle outline">
                <Sun size={14} />
              </span>
              <div>
                <strong>Elegí tu apariencia</strong>
                <p>Usá el modo claro u oscuro según el momento.</p>
              </div>
              <span className="check-status">A tu gusto</span>
            </div>
          </div>
        </section>

        <section className="panel security-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">SEGURIDAD DE LA CUENTA</span>
              <h2>Todo en orden</h2>
              <p>Tu sesión y tu acceso están activos.</p>
            </div>
            <div className="security-big-icon">
              <ShieldCheck size={24} />
            </div>
          </div>

          <div className="security-meter">
            <span />
          </div>
          <div className="security-fact">
            <span>Estado de la cuenta</span>
            <strong>
              <span className="online-pip" />
              {user.isActive ? "Protegida" : "Bloqueada"}
            </strong>
          </div>
          <div className="security-fact">
            <span>Roles asignados</span>
            <strong>{user.roles.length || "Ninguno"}</strong>
          </div>
          <div className="security-fact">
            <span>Accesos directos</span>
            <strong>{permissions.length} permisos efectivos</strong>
          </div>
          <button
            className="button button-soft full-width"
            onClick={() =>
              notify(
                "La autenticación usa cookies HttpOnly, tokens de corta duración y rotación de sesión.",
              )
            }
          >
            Conocer la protección <ArrowRight size={15} />
          </button>
        </section>
      </div>

      <section className="tip-banner">
        <span className="tip-icon" aria-hidden="true">
          <Flower2 size={18} />
        </span>
        <div>
          <strong>Un buen espacio se construye de a poco.</strong>
          <p>
            Pastel está diseñado para crecer con nuevos módulos sin perder
            claridad ni control.
          </p>
        </div>
        <button
          className="icon-button"
          aria-label="Más información"
          onClick={() =>
            notify(
              "Consultá el README para la arquitectura y los pasos para agregar un módulo.",
            )
          }
        >
          <ArrowRight size={18} />
        </button>
      </section>
    </div>
  );
}
