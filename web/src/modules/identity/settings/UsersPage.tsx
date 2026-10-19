import { useEffect, useState } from "react";
import { useAuth } from "@/core/auth";
import { useNotify } from "@/core/notifications";
import {
  useBlockUser,
  useResetPassword,
  useUnblockUser,
} from "../api/mutations";
import { useRoles, useUsers } from "../api/queries";
import type { User } from "../api/schemas";
import { describeError } from "../errors";
import { identityPermissions } from "../paths";
import { inputClass, primaryButton, secondaryButton } from "../styles";
import { ConfirmDialog } from "./ConfirmDialog";
import { CreateUserDialog } from "./CreateUserDialog";
import { Pager } from "./Pager";
import { QueryState } from "./QueryState";
import { TemporaryPasswordDialog } from "./TemporaryPasswordDialog";
import { UsersTable, type UserAction } from "./UsersTable";
import { settingsStrings } from "./strings";
import { panel, selectClass } from "./styles";
import { DEFAULT_PAGE_SIZE, useUrlFilters } from "./urlFilters";

const t = settingsStrings.users;
const defaults: Record<"q" | "role" | "status", string> = {
  q: "",
  role: "",
  status: "",
};

type Pending = { action: UserAction; user: User };

/** `/configuracion/usuarios`: directorio paginado; búsqueda, rol y estado se filtran en el servidor y viven en la URL. */
export function Component() {
  const { hasPermission } = useAuth();
  const notify = useNotify();
  const { values, page, update, reset } = useUrlFilters(defaults);
  const [text, setText] = useState(values.q);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [temporary, setTemporary] = useState<string | null>(null);

  const users = useUsers({
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    search: values.q,
    role: values.role,
    status: values.status,
  });
  const roles = useRoles({
    enabled: hasPermission(identityPermissions.rolesRead),
  });
  const block = useBlockUser();
  const unblock = useUnblockUser();
  const resetPassword = useResetPassword();

  useEffect(() => setText(values.q), [values.q]);
  useEffect(() => {
    if (text === values.q) return;
    const id = window.setTimeout(() => update({ q: text.trim() }), 300);
    return () => window.clearTimeout(id);
  }, [text, values.q, update]);

  const busy = block.isPending || unblock.isPending || resetPassword.isPending;
  const filtered =
    values.q !== "" || values.role !== "" || values.status !== "";

  const confirm = async () => {
    if (!pending) return;
    const { action, user } = pending;
    try {
      if (action === "reset") {
        const result = await resetPassword.mutateAsync(user.id);
        setTemporary(result.temporaryPassword);
      } else if (action === "block") {
        await block.mutateAsync(user.id);
        notify(t.blocked_ok, "success");
      } else {
        await unblock.mutateAsync(user.id);
        notify(t.unblocked_ok, "success");
      }
    } catch (error) {
      notify(
        describeError(error, settingsStrings.common.saveError).message,
        "error",
      );
    } finally {
      setPending(null);
    }
  };

  const copy = pending
    ? pending.action === "reset"
      ? {
          title: t.confirmResetTitle,
          message: t.confirmReset(pending.user.email),
          label: t.confirmResetAction,
        }
      : pending.action === "block"
        ? {
            title: t.confirmBlockTitle,
            message: t.confirmBlock(pending.user.email),
            label: t.confirmBlockAction,
          }
        : {
            title: t.confirmUnblockTitle,
            message: t.confirmUnblock(pending.user.email),
            label: t.confirmUnblockAction,
          }
    : null;

  return (
    <section aria-labelledby="users-title" className={panel}>
      <div className="flex flex-wrap items-end justify-between gap-3 p-4">
        <h2 id="users-title" className="text-lg font-semibold text-fg">
          {t.title}
        </h2>
        {hasPermission(identityPermissions.usersCreate) ? (
          <button
            type="button"
            className={primaryButton}
            onClick={() => setCreating(true)}
          >
            {t.create}
          </button>
        ) : null}
      </div>

      <form
        role="search"
        onSubmit={(event) => event.preventDefault()}
        className="flex flex-wrap items-end gap-3 px-4 pb-4"
      >
        <label className="flex min-w-56 flex-1 flex-col gap-1.5 text-sm font-medium text-fg">
          {t.searchLabel}
          <input
            type="search"
            className={inputClass}
            placeholder={t.search}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        {roles.data ? (
          <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
            {t.role}
            <select
              className={selectClass}
              value={values.role}
              onChange={(event) => update({ role: event.target.value })}
            >
              <option value="">{t.allRoles}</option>
              {roles.data.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
          {t.status}
          <select
            className={selectClass}
            value={values.status}
            onChange={(event) => update({ status: event.target.value })}
          >
            <option value="">{t.allStatuses}</option>
            <option value="active">{t.active}</option>
            <option value="blocked">{t.blocked}</option>
          </select>
        </label>
        {filtered ? (
          <button type="button" className={secondaryButton} onClick={reset}>
            {settingsStrings.common.clear}
          </button>
        ) : null}
      </form>

      <QueryState
        isPending={users.isPending}
        error={users.error}
        onRetry={() => void users.refetch()}
      >
        {users.data && users.data.items.length === 0 ? (
          <p role="status" className="p-6 text-sm text-muted">
            {t.empty}
          </p>
        ) : users.data ? (
          <>
            <UsersTable
              users={users.data.items}
              can={hasPermission}
              onAction={(action, user) => setPending({ action, user })}
            />
            <Pager
              page={users.data.page}
              pageSize={users.data.pageSize}
              totalCount={users.data.totalCount}
            />
          </>
        ) : null}
      </QueryState>

      {creating ? (
        <CreateUserDialog onClose={() => setCreating(false)} />
      ) : null}
      {pending && copy ? (
        <ConfirmDialog
          title={copy.title}
          message={copy.message}
          confirmLabel={copy.label}
          pending={busy}
          onConfirm={() => void confirm()}
          onClose={() => setPending(null)}
        />
      ) : null}
      {temporary ? (
        <TemporaryPasswordDialog
          password={temporary}
          onClose={() => setTemporary(null)}
        />
      ) : null}
    </section>
  );
}
