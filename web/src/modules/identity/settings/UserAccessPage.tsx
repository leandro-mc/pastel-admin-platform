import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useAuth } from "@/core/auth";
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
const OWNER = "Owner/Superuser";

/** `/configuracion/accesos/usuario/:userId`: roles y excepciones individuales de una persona. */
export function Component() {
  const { user: actor } = useAuth();
  const actorIsOwner = actor?.roles.includes(OWNER) ?? false;
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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6">
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
            actorIsOwner={actorIsOwner}
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

function UserAccessForm({ user, roles, catalog, initialOverrides, actorIsOwner }: FormProps & { actorIsOwner: boolean }) {
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
  const isOwnerTarget = user.roles.includes(OWNER);
  const ownerEditBlocked = isOwnerTarget && !actorIsOwner;
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
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-accent-strong">
            Centro de control / Usuarios
          </p>
          <h1 className="break-words text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            {t.userTitle(user.displayName)}
          </h1>
          <p className="mt-1 break-all text-sm text-muted">{user.email}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={user.isActive ? "rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-strong" : "rounded-full bg-danger-soft px-3 py-1 text-xs font-semibold text-danger"}>
              {user.isActive ? t.accountActive : t.accountBlocked}
            </span>
            {user.roles.map((role) => (
              <span key={role} className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
                {role}
              </span>
            ))}
          </div>
        </div>
        <div className="grid min-w-40 grid-cols-2 gap-2">
          <div className="rounded-2xl border border-line bg-surface p-3 shadow-sm">
            <span className="block text-xs font-semibold text-muted">Roles</span>
            <strong className="mt-1 block text-2xl font-bold text-fg">{roleIds.length}</strong>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-3 shadow-sm">
            <span className="block text-xs font-semibold text-muted">Excepciones</span>
            <strong className="mt-1 block text-2xl font-bold text-fg">{administrator ? 0 : changes.length}</strong>
          </div>
        </div>
      </header>
      {ownerEditBlocked ? (
        <p role="status" className="rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm leading-relaxed text-muted">
          Esta es la cuenta del propietario. Sus accesos solo pueden revisarse o administrarse desde la propia identidad Owner/Superuser.
        </p>
      ) : null}

      <section aria-labelledby="roles-heading" className={`${panel} overflow-hidden shadow-sm`}>
        <header className="border-b border-line bg-surface-raised px-4 py-4 sm:px-5">
          <h2 id="roles-heading" className="font-semibold text-fg">
            {t.rolesSection}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">{t.rolesHint}</p>
        </header>
        <ul className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => {
            const isOwnerRole = role.name === OWNER;
            const hasHuellaPrivilege = role.permissions.some((code) => code.startsWith("huella."));
            const hasCosechaPrivilege = role.permissions.some((code) => code.startsWith("cosecha."));
            const roleLocked = isOwnerRole || hasHuellaPrivilege || (hasCosechaPrivilege && !actorIsOwner);
            const explanation = isOwnerRole
              ? "Reservado; solo lo establece el bootstrap."
              : hasHuellaPrivilege
                ? "Huella es el perfil privado del propietario y no se asigna a otras cuentas."
                : hasCosechaPrivilege && !actorIsOwner
                  ? "Solo Owner/Superuser puede conceder acceso a Cosecha."
                  : null;
            return (
            <li key={role.id}>
              <label className="flex h-full min-h-20 cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm text-fg transition-colors hover:border-accent/50 hover:bg-surface-raised has-[:checked]:border-accent-strong has-[:checked]:bg-accent-soft/60">
                <input
                  type="checkbox"
                  className="mt-0.5 size-5 shrink-0 accent-accent-strong"
                  checked={roleIds.includes(role.id)}
                  disabled={save.isPending || ownerEditBlocked || roleLocked}
                  onChange={() => toggleRole(role.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-fg">{role.name}</span>
                  {role.description ? (
                    <span className="mt-1 block leading-relaxed text-muted">{role.description}</span>
                  ) : null}
                  {role.isSystemRole ? <span className="mt-2 inline-flex rounded-full border border-line px-2 py-0.5 text-xs font-medium text-muted">Rol de sistema</span> : null}
                  {explanation ? <span className="mt-2 block text-xs leading-relaxed text-muted">{explanation}</span> : null}
                </span>
              </label>
            </li>
          );
          })}
        </ul>
      </section>

      <section aria-labelledby="overrides-heading" className={`${panel} overflow-hidden shadow-sm`}>
        <header className="border-b border-line bg-surface-raised px-4 py-4 sm:px-5">
          <h2 id="overrides-heading" className="font-semibold text-fg">
            {t.overridesSection}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">Ajustes que afectan únicamente a esta cuenta, sin modificar los permisos de sus roles.</p>
        </header>
        <div className="flex flex-col gap-4 p-4 sm:p-5">
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
              disabled={save.isPending || ownerEditBlocked}
              onChange={(permissionId, value) =>
                setOverrides((current) => ({
                  ...current,
                  [permissionId]: value,
                }))
              }
            />
          </>
        )}
        </div>
      </section>

      <FormAlert error={error} />
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-4">
        <p className="text-sm text-muted">{ownerEditBlocked ? "Edición no disponible para esta cuenta." : "Los cambios se aplican cuando guarda los accesos."}</p>
        <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={primaryButton}
          disabled={save.isPending || ownerEditBlocked}
          onClick={() => void onSave()}
        >
          {save.isPending ? t.saving : t.save}
        </button>
        <Link to={settingsPaths.users} className={secondaryButton}>
          {t.cancel}
        </Link>
        </div>
      </footer>
    </div>
  );
}
