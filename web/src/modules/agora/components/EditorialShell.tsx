import type { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { useAuth } from "@/core/auth";
import { loginPath } from "@/core/routes";
import { Alert, PageHeader, StateView } from "@/core/ui";
import { primaryButton } from "@/core/ui/styles";
import { agoraPaths } from "../paths";
import { agoraPermissions } from "../permissions";
import { strings } from "../strings";
import { AgoraPage, LoadingState } from "./Feedback";

const navItems = [
  { to: agoraPaths.editorial, label: strings.editorial.nav.pieces, permission: agoraPermissions.manage, end: true },
  { to: agoraPaths.dailyPicks, label: strings.editorial.nav.picks, permission: agoraPermissions.manage, end: false },
  { to: agoraPaths.review, label: strings.editorial.nav.review, permission: agoraPermissions.review, end: false },
  { to: agoraPaths.editorialNews, label: strings.editorial.nav.news, permission: agoraPermissions.manage, end: false },
  { to: agoraPaths.reports, label: strings.editorial.nav.reports, permission: agoraPermissions.manage, end: false },
  { to: agoraPaths.organization, label: strings.editorial.nav.organization, permission: agoraPermissions.manage, end: false },
] as const;

/**
 * Marco de las pantallas del panel editorial: exige sesión y el permiso de la sección, y ofrece la navegación entre
 * secciones. Es solo comodidad: el servidor autoriza cada acción por su cuenta.
 */
export function EditorialShell({
  permission,
  title,
  description,
  actions,
  children,
}: {
  permission: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "loading") {
    return (
      <AgoraPage>
        <LoadingState />
      </AgoraPage>
    );
  }

  if (auth.status !== "authenticated") {
    return (
      <AgoraPage>
        <StateView
          status="empty"
          title={strings.editorial.guard.loginTitle}
          description={strings.editorial.guard.loginDescription}
          action={
            <Link to={loginPath(location.pathname)} className={primaryButton}>
              {strings.common.signIn}
            </Link>
          }
        />
      </AgoraPage>
    );
  }

  if (!auth.hasPermission(permission)) {
    return (
      <AgoraPage>
        <Alert
          variant="warning"
          message={`${strings.editorial.guard.noAccessTitle}. ${strings.editorial.guard.noAccessDescription}`}
        />
      </AgoraPage>
    );
  }

  return (
    <AgoraPage>
      <PageHeader
        eyebrow={strings.editorial.title}
        title={title}
        description={description}
        actions={actions}
      />
      <nav aria-label={strings.editorial.navLabel}>
        <ul className="flex flex-wrap gap-2">
          {navItems
            .filter((item) => auth.hasPermission(item.permission))
            .map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium focus-visible:ring-3 focus-visible:ring-accent-strong/45 focus-visible:outline-none ${
                      isActive
                        ? "border-accent-strong bg-accent-soft text-accent-strong"
                        : "border-line bg-surface text-fg hover:bg-accent-soft"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
        </ul>
      </nav>
      {children}
    </AgoraPage>
  );
}
