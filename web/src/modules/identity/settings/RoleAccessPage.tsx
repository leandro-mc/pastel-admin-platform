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
    <div className="flex flex-col gap-4">
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
          <RoleAccessForm
            key={`${role.id}-${roles.dataUpdatedAt}`}
            role={role}
            catalog={catalog.data}
          />
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
  // Administrator es del sistema: conserva todos los permisos y la API no lo deja modificar.
  const locked = role.name === "Administrator";

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
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold text-fg">
          {t.roleTitle(role.name)}
        </h1>
        {role.description ? (
          <p className="text-sm text-muted">{role.description}</p>
        ) : null}
      </header>
      <section aria-label={t.roleTitle(role.name)} className={`${panel} p-4`}>
        {locked ? (
          <p role="status" className="pb-3 text-sm text-muted">
            {t.roleSystemHint}
          </p>
        ) : null}
        <PermissionPicker
          catalog={catalog}
          selected={new Set(locked ? catalog.map((p) => p.id) : permissionIds)}
          onChange={setPermissionIds}
          disabled={locked || save.isPending}
        />
      </section>
      <FormAlert error={error} />
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
    </div>
  );
}
