import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/core/auth";
import { useRoles } from "../api/queries";
import { identityPermissions, settingsPaths } from "../paths";
import { primaryButton, secondaryButton } from "../styles";
import { CreateRoleDialog } from "./CreateRoleDialog";
import { QueryState } from "./QueryState";
import { settingsStrings } from "./strings";
import { chip, chipNeutral, panel } from "./styles";

const t = settingsStrings.roles;

/** `/configuracion/roles`: lista de roles (sin paginar: son pocos) con acceso al editor de permisos. */
export function Component() {
  const { hasPermission } = useAuth();
  const roles = useRoles();
  const [creating, setCreating] = useState(false);

  return (
    <section aria-labelledby="roles-title" className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div>
          <h1 id="roles-title" className="text-lg font-semibold text-fg">
            {t.title}
          </h1>
          <p className="text-sm text-muted">{t.subtitle}</p>
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
      </div>
      <QueryState
        isPending={roles.isPending}
        error={roles.error}
        onRetry={() => void roles.refetch()}
      >
        {roles.data && roles.data.length === 0 ? (
          <p role="status" className="p-6 text-sm text-muted">
            {t.empty}
          </p>
        ) : (
          <ul className="grid gap-4 p-4 pt-0 sm:grid-cols-2">
            {roles.data?.map((role) => (
              <li
                key={role.id}
                className="flex flex-col gap-3 rounded-xl border border-line p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 font-semibold text-fg">
                      <ShieldCheck
                        aria-hidden="true"
                        size={16}
                        className="text-accent-strong"
                      />
                      {role.name}
                    </h3>
                    {role.description ? (
                      <p className="text-sm text-muted">{role.description}</p>
                    ) : null}
                  </div>
                  {role.isSystemRole ? (
                    <span className={chipNeutral}>{t.system}</span>
                  ) : null}
                </div>
                <p className="flex flex-wrap gap-2">
                  <span className={chip}>{t.users(role.userCount)}</span>
                  <span className={chip}>
                    {t.permissions(role.permissionIds.length)}
                  </span>
                </p>
                {hasPermission(identityPermissions.rolesUpdate) ? (
                  <Link
                    to={settingsPaths.roleAccess(role.id)}
                    aria-label={t.managePermissions(role.name)}
                    className={`${secondaryButton} self-start`}
                  >
                    {t.editPermissions}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </QueryState>
      {creating ? (
        <CreateRoleDialog onClose={() => setCreating(false)} />
      ) : null}
    </section>
  );
}
