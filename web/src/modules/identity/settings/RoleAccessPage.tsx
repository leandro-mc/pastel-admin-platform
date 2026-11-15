import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useNotify } from "@/core/notifications";
import { useSetRolePermissions } from "../api/mutations";
import { usePermissionCatalog, useRoles } from "../api/queries";
import type { Permission, Role } from "../api/schemas";
import { FormAlert } from "../components/FormAlert";
import { describeError, type ShownError } from "../errors";
import { settingsPaths } from "../paths";
import { linkButton, primaryButton, secondaryButton } from "../styles";
import { PermissionPicker } from "./PermissionPicker";
import { QueryState } from "./QueryState";
import { settingsStrings } from "./strings";
import { isPlatformPermission, isPlatformRole } from "./permissionsScope";
import { panel } from "./styles";

const t = settingsStrings.access;

/** `/configuracion/accesos/rol/:roleId`: permisos de un rol. */
export function Component() {
  const { roleId = "" } = useParams();
  const roles = useRoles();
  const catalog = usePermissionCatalog();
  const role = roles.data?.find((item) => item.id === roleId);

  const retry = () => {
    void roles.refetch();
    void catalog.refetch();
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Link to={settingsPaths.roles} className={`${linkButton} self-start`}>
        <ArrowLeft aria-hidden="true" size={16} className="mr-1 inline" />
        {t.back}
      </Link>
      <QueryState
        isPending={roles.isPending || catalog.isPending}
        error={roles.error ?? catalog.error}
        onRetry={retry}
      >
        {role && catalog.data ? (
          role.isSystemRole ? (
            <RoleAccessForm
              key={`${role.id}-${roles.dataUpdatedAt}`}
              role={role}
              catalog={catalog.data}
            />
          ) : isPlatformRole(role) ? (
            <RoleAccessForm
              key={`${role.id}-${roles.dataUpdatedAt}`}
              role={role}
              catalog={catalog.data.filter(isPlatformPermission)}
            />
          ) : (
            <p
              role="status"
              className="rounded-xl border border-line bg-surface p-5 text-sm leading-relaxed text-muted"
            >
              Este rol pertenece a una aplicación. Sus permisos se administran
              dentro de la configuración de esa app, no desde Pastel Workspace.
            </p>
          )
        ) : (
          <p role="status" className="p-6 text-sm text-muted">
            {t.notFound}
          </p>
        )}
      </QueryState>
    </div>
  );
}

function RoleAccessForm({
  role,
  catalog,
}: {
  role: Role;
  catalog: Permission[];
}) {
  const navigate = useNavigate();
  const notify = useNotify();
  const save = useSetRolePermissions();
  const [permissionIds, setPermissionIds] = useState<string[]>(
    role.permissionIds,
  );
  const [error, setError] = useState<ShownError | null>(null);
  // Los roles de sistema (Administrator y Owner/Superuser) son inmutables.
  const locked = role.isSystemRole;

  const onSave = async () => {
    setError(null);
    try {
      await save.mutateAsync({ roleId: role.id, permissionIds });
      notify(t.savedRole, "success");
      void navigate(settingsPaths.roles);
    } catch (caught) {
      setError(describeError(caught, t.saveError));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-bold tracking-[0.16em] text-accent-strong uppercase">
            Centro de control / Roles y permisos
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            {t.roleTitle(role.name)}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
            {role.description ||
              "Defina con claridad qué acciones permite este rol."}
          </p>
        </div>
        <div className="min-w-36 rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <span className="block text-xs font-semibold tracking-wide text-muted uppercase">
            Permisos
          </span>
          <strong className="mt-1 block text-2xl font-bold tracking-tight text-fg">
            {permissionIds.length}
            <span className="text-sm font-medium text-muted">
              {" "}
              / {catalog.length}
            </span>
          </strong>
          <span className="text-xs text-muted">seleccionados</span>
        </div>
      </header>

      <section
        aria-label={t.roleTitle(role.name)}
        className={`${panel} overflow-hidden shadow-sm`}
      >
        <header className="border-b border-line bg-surface-raised px-4 py-4 sm:px-5">
          <h2 className="font-semibold text-fg">
            Permisos por aplicación y función
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Seleccione permisos por grupo. Los cambios afectan a todas las
            personas que tengan este rol.
          </p>
        </header>
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          {locked ? (
            <p
              role="status"
              className="rounded-xl border border-line bg-accent-soft px-4 py-3 text-sm leading-relaxed text-fg"
            >
              {role.name === "Owner/Superuser"
                ? "Owner/Superuser es un rol reservado: sus privilegios se sincronizan desde código y no se pueden modificar."
                : t.roleSystemHint}
            </p>
          ) : null}
          <PermissionPicker
            catalog={catalog}
            selected={new Set(permissionIds)}
            onChange={setPermissionIds}
            disabled={locked || save.isPending}
          />
        </div>
      </section>

      <FormAlert error={error} />
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-4">
        <p className="text-sm text-muted">
          {locked
            ? "Los roles de sistema no se pueden modificar."
            : "Revise los permisos antes de guardar."}
        </p>
        <div className="flex flex-wrap gap-3">
          {locked ? null : (
            <button
              type="button"
              className={primaryButton}
              disabled={save.isPending}
              onClick={() => void onSave()}
            >
              {save.isPending ? t.saving : t.save}
            </button>
          )}
          <Link to={settingsPaths.roles} className={secondaryButton}>
            {locked ? t.back : t.cancel}
          </Link>
        </div>
      </footer>
    </div>
  );
}
