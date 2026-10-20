import { ArrowRight, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/core/auth";
import { useRoles } from "../api/queries";
import { identityPermissions, settingsPaths } from "../paths";
import { primaryButton, secondaryButton } from "../styles";
import { CreateRoleDialog } from "./CreateRoleDialog";
import { QueryState } from "./QueryState";
import { settingsStrings } from "./strings";
import { isPlatformRole } from "./permissionsScope";
import { chip, chipNeutral, panel } from "./styles";

const t = settingsStrings.roles;

/** `/configuracion/roles`: lista de roles (sin paginar: son pocos) con acceso al editor de permisos. */
export function Component() {
  const { hasPermission } = useAuth();
  const roles = useRoles();
  const platformRoles = (roles.data ?? []).filter(isPlatformRole);
  const [creating, setCreating] = useState(false);

  return (
    <section
      aria-labelledby="roles-title"
      className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6"
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-accent-strong">
            Centro de control / Accesos
          </p>
          <h1 id="roles-title" className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            {t.title} y permisos
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
            {t.subtitle} Revise el alcance de cada rol de plataforma. Los roles de negocio se administran dentro de cada aplicación.
          </p>
        </div>
        {hasPermission(identityPermissions.rolesCreate) ? (
          <button
            type="button"
            className={primaryButton}
            onClick={() => setCreating(true)}
          >
            {t.create}
          </button>
        ) : null}
      </header>

      <section className={`${panel} overflow-hidden shadow-sm`} aria-label="Roles registrados">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-raised px-4 py-4 sm:px-5">
          <div>
            <h2 className="font-semibold text-fg">Roles de plataforma</h2>
            <p className="mt-0.5 text-sm text-muted">
              {roles.data
                ? settingsStrings.common.total(platformRoles.length)
                : "Roles y permisos disponibles en la plataforma."}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted">
            <ShieldCheck aria-hidden="true" size={15} />
            Acceso por función
          </span>
        </header>
        <QueryState
          isPending={roles.isPending}
          error={roles.error}
          onRetry={() => void roles.refetch()}
        >
          {roles.data && platformRoles.length === 0 ? (
            <p role="status" className="p-6 text-sm text-muted">
              {t.empty}
            </p>
          ) : (
            <ul className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {platformRoles.map((role) => (
                <li
                  key={role.id}
                  className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-sm transition duration-150 hover:border-accent/50 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-accent-soft text-accent-strong">
                      <ShieldCheck aria-hidden="true" size={21} />
                    </span>
                    {role.isSystemRole ? (
                      <span className={chipNeutral}>{t.system}</span>
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <h3 className="break-words text-lg font-bold tracking-tight text-fg">
                      {role.name}
                    </h3>
                    <p className="mt-1 min-h-10 text-sm leading-relaxed text-muted">
                      {role.description || "Este rol no tiene una descripción adicional."}
                    </p>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-4">
                    <span className={chip}>{t.users(role.userCount)}</span>
                    <span className={chip}>
                      {t.permissions(role.permissionIds.length)}
                    </span>
                  </div>
                  {role.isSystemRole ? (
                    <p className="rounded-xl border border-line bg-surface-raised px-3 py-2 text-xs leading-relaxed text-muted">
                      {role.name === "Owner/Superuser"
                        ? "Rol reservado al propietario y al bootstrap."
                        : "Rol protegido; no se puede modificar."}
                    </p>
                  ) : hasPermission(identityPermissions.rolesUpdate) ? (
                    <Link
                      to={settingsPaths.roleAccess(role.id)}
                      aria-label={t.managePermissions(role.name)}
                      className={`${secondaryButton} w-full justify-between`}
                    >
                      {t.editPermissions}
                      <ArrowRight aria-hidden="true" size={16} />
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </section>
      {creating ? <CreateRoleDialog onClose={() => setCreating(false)} /> : null}
    </section>
  );
}
