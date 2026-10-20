import { Activity, KeyRound, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { useAuth } from "@/core/auth";
import { useNotify } from "@/core/notifications";
import { routes } from "@/core/routes";
import { identityStrings } from "../strings";
import { card, secondaryButton } from "../styles";

const t = identityStrings.account;

function initials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-medium text-fg">{children}</dd>
    </div>
  );
}

function SecurityRow({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: typeof KeyRound;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 border-t border-line py-3 first:border-t-0">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
        <Icon aria-hidden="true" size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-fg">{title}</p>
        <p className="text-sm text-muted">{text}</p>
      </div>
      {action}
    </li>
  );
}

/** `/cuenta`: perfil de la persona con sesión y acceso al cambio de contraseña. */
export function Component() {
  const { user, permissions } = useAuth();
  const notify = useNotify();
  if (!user) return null;

  const date = new Intl.DateTimeFormat("es-CR", { dateStyle: "long" }).format(
    new Date(user.createdAt),
  );
  const maxCard = `${card.replace("max-w-md", "max-w-none")} shadow-sm`;

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-accent-strong">Mi espacio / Perfil y seguridad</p>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">{t.title}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{t.subtitle}</p>
        </div>
        <span className={user.isActive ? "inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-strong" : "inline-flex items-center gap-2 rounded-full bg-danger-soft px-3 py-1.5 text-xs font-semibold text-danger"}>
          <ShieldCheck aria-hidden="true" size={15} />
          {user.isActive ? "Cuenta activa" : "Cuenta bloqueada"}
        </span>
      </header>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section aria-labelledby="profile-title" className={maxCard}>
          <div className="mb-5 flex items-start justify-between gap-3 border-b border-line pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-strong">Información personal</p>
              <h2 id="profile-title" className="mt-1 text-lg font-bold tracking-tight text-fg">{user.displayName}</h2>
              <p className="break-all text-sm text-muted">{user.email}</p>
            </div>
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-lg font-bold text-accent-strong">
              {initials(user.displayName)}
            </span>
          </div>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <Detail label={t.createdAt}>{date}</Detail>
            <Detail label={t.roles}>
              {user.roles.length > 0 ? (
                <span className="flex flex-wrap gap-1.5 pt-1">
                  {user.roles.map((role) => (
                    <span key={role} className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-strong">{role}</span>
                  ))}
                </span>
              ) : t.noRoles}
            </Detail>
          </dl>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <div>
              <p className="font-medium text-fg">{t.editTitle}</p>
              <p className="text-sm text-muted">{t.editHint}</p>
            </div>
            <button
              type="button"
              className={secondaryButton}
              onClick={() => notify(t.editNotice)}
            >
              {t.editRequest}
            </button>
          </div>
        </section>

        <section aria-labelledby="security-title" className={maxCard}>
          <div className="mb-3 flex items-start justify-between gap-3 border-b border-line pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-strong">Protección de la cuenta</p>
              <h2 id="security-title" className="mt-1 text-lg font-bold tracking-tight text-fg">{t.securityTitle}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">{t.securityHint}</p>
            </div>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
              <ShieldCheck aria-hidden="true" size={21} />
            </span>
          </div>
          <ul>
            <SecurityRow
              icon={KeyRound}
              title={t.password}
              text={t.passwordHint}
              action={
                <Link to={routes.password} className={secondaryButton}>
                  {t.changePassword}
                </Link>
              }
            />
            <SecurityRow
              icon={ShieldCheck}
              title={t.authorization}
              text={t.permissions(permissions.size)}
            />
            <SecurityRow
              icon={Activity}
              title={t.session}
              text={t.sessionHint}
            />
          </ul>
        </section>
      </div>
    </section>
  );
}
