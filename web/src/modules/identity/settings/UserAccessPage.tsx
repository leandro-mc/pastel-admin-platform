import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useNotify } from "@/core/notifications";
import { useSaveUserAccess } from "../api/mutations";
import {
  usePermissionCatalog,
  useRoles,
  useUser,
  useUserPermissions,
} from "../api/queries";
import type { Permission, Role, User } from "../api/schemas";
import { FormAlert } from "../components/FormAlert";
import { describeError, type ShownError } from "../errors";
import { settingsPaths } from "../paths";
import { linkButton, primaryButton, secondaryButton } from "../styles";
import { OverridePicker, type OverrideValue } from "./OverridePicker";
import { QueryState } from "./QueryState";
import { settingsStrings } from "./strings";
import { panel } from "./styles";

const t = settingsStrings.access;
const ADMINISTRATOR = "Administrator";

/** `/configuracion/accesos/usuario/:userId`: roles y excepciones individuales de una persona. */
export function Component() {
  const { userId = "" } = useParams();
  const user = useUser(userId);
  const roles = useRoles();
  const catalog = usePermissionCatalog();
  const isAdministrator = user.data?.roles.includes(ADMINISTRATOR) ?? false;
  // Una cuenta Administrator no admite excepciones: la API responde 409, así que ni se consulta.
  const overrides = useUserPermissions(userId, {
    enabled: user.isSuccess && !isAdministrator,
  });

  const isPending =
    user.isPending ||
    roles.isPending ||
    catalog.isPending ||
    (!isAdministrator && overrides.isPending);
  const error =
    user.error ??
    roles.error ??
    catalog.error ??
    (isAdministrator ? null : overrides.error);

  const retry = () => {
    void user.refetch();
    void roles.refetch();
    void catalog.refetch();
    if (!isAdministrator) void overrides.refetch();
  };

  const initialOverrides: Record<string, OverrideValue> = {};
  for (const item of overrides.data ?? []) {
    initialOverrides[item.permissionId] = item.effect;
  }

  return (
    <div className="flex flex-col gap-4">
      <BackLink />
      <QueryState isPending={isPending} error={error} onRetry={retry}>
        {user.data && roles.data && catalog.data ? (
          <UserAccessForm
            // Si los datos se recargan, el formulario vuelve a empezar desde lo guardado.
            key={`${user.dataUpdatedAt}-${overrides.dataUpdatedAt}`}
            user={user.data}
            roles={roles.data}
            catalog={catalog.data}
            initialOverrides={initialOverrides}
          />
        ) : null}
      </QueryState>
    </div>
  );
}

function BackLink() {
  return (
    <Link to={settingsPaths.users} className={`${linkButton} self-start`}>
      <ArrowLeft aria-hidden="true" size={16} className="mr-1 inline" />
      {t.back}
    </Link>
  );
}

type FormProps = {
  user: User;
  roles: Role[];
  catalog: Permission[];
  initialOverrides: Record<string, OverrideValue>;
};

function UserAccessForm({ user, roles, catalog, initialOverrides }: FormProps) {
  const navigate = useNavigate();
  const notify = useNotify();
  const save = useSaveUserAccess();
  const [roleIds, setRoleIds] = useState<string[]>(() =>
    roles.filter((role) => user.roles.includes(role.name)).map((r) => r.id),
  );
  const [overrides, setOverrides] =
    useState<Record<string, OverrideValue>>(initialOverrides);
  const [error, setError] = useState<ShownError | null>(null);

  const administratorId = roles.find((r) => r.name === ADMINISTRATOR)?.id;
  const administrator =
    administratorId !== undefined && roleIds.includes(administratorId);
  const grantedByRole = useMemo(
    () =>
      new Set(
        roles
          .filter((role) => roleIds.includes(role.id))
          .flatMap((role) => role.permissionIds),
      ),
    [roles, roleIds],
  );
  const changes = Object.entries(overrides).flatMap(([permissionId, effect]) =>
    effect === "Inherit" ? [] : [{ permissionId, effect }],
  );

  const toggleRole = (roleId: string) =>
    setRoleIds((current) =>
      current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId],
    );

  const onSave = async () => {
    setError(null);
    try {
      await save.mutateAsync({
        userId: user.id,
        roleIds,
        overrides: changes,
        administrator,
      });
      notify(t.saved, "success");
      void navigate(settingsPaths.users);
    } catch (caught) {
      setError(describeError(caught, t.saveError));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold text-fg">
          {t.userTitle(user.displayName)}
        </h1>
        <p className="text-sm text-muted">
          {user.email} · {user.isActive ? t.accountActive : t.accountBlocked} ·{" "}
          {t.summaryUser(roleIds.length, administrator ? 0 : changes.length)}
        </p>
      </header>

      <section aria-labelledby="roles-heading" className={`${panel} p-4`}>
        <h2 id="roles-heading" className="text-lg font-semibold text-fg">
          {t.rolesSection}
        </h2>
        <p className="pb-2 text-sm text-muted">{t.rolesHint}</p>
        <ul>
          {roles.map((role) => (
            <li key={role.id}>
              <label className="flex min-h-11 items-start gap-3 py-2 text-sm text-fg">
                <input
                  type="checkbox"
                  className="mt-0.5 size-5 shrink-0 accent-accent-strong"
                  checked={roleIds.includes(role.id)}
                  disabled={save.isPending}
                  onChange={() => toggleRole(role.id)}
                />
                <span>
                  <span className="font-medium">{role.name}</span>
                  {role.description ? (
                    <span className="block text-muted">{role.description}</span>
                  ) : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="overrides-heading" className={`${panel} p-4`}>
        <h2 id="overrides-heading" className="text-lg font-semibold text-fg">
          {t.overridesSection}
        </h2>
        {administrator ? (
          <p role="status" className="text-sm text-muted">
            {t.overridesAdmin}
          </p>
        ) : (
          <>
            <p className="pb-2 text-sm text-muted">{t.overridesHint}</p>
            <OverridePicker
              catalog={catalog}
              overrides={overrides}
              grantedByRole={grantedByRole}
              disabled={save.isPending}
              onChange={(permissionId, value) =>
                setOverrides((current) => ({
                  ...current,
                  [permissionId]: value,
                }))
              }
            />
          </>
        )}
      </section>

      <FormAlert error={error} />
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={primaryButton}
          disabled={save.isPending}
          onClick={() => void onSave()}
        >
          {save.isPending ? t.saving : t.save}
        </button>
        <Link to={settingsPaths.users} className={secondaryButton}>
          {t.cancel}
        </Link>
      </div>
    </div>
  );
}
