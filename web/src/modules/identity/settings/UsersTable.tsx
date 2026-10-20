import { KeyRound, LockKeyhole, LockOpen, UserRoundCog } from "lucide-react";
import { Link } from "react-router";
import type { User } from "../api/schemas";
import { identityPermissions, settingsPaths } from "../paths";
import { formatDateTime, initials } from "./format";
import { settingsStrings } from "./strings";
import {
  chip,
  chipDanger,
  chipNeutral,
  iconButton,
  mutedCell,
  table,
  td,
  th,
} from "./styles";

const t = settingsStrings.users;

export type UserAction = "block" | "unblock" | "reset";

type UserActionsProps = {
  user: User;
  can: (code: string) => boolean;
  onAction: (action: UserAction, user: User) => void;
};

function UserActions({ user, can, onAction }: UserActionsProps) {
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {can(identityPermissions.usersUpdate) ? (
        <Link
          to={settingsPaths.userAccess(user.id)}
          className={iconButton}
          title={t.editAccess(user.email)}
          aria-label={t.editAccess(user.email)}
        >
          <UserRoundCog aria-hidden="true" size={17} />
        </Link>
      ) : null}
      {can(identityPermissions.usersResetPassword) ? (
        <button
          type="button"
          className={iconButton}
          title={t.resetPassword(user.email)}
          aria-label={t.resetPassword(user.email)}
          onClick={() => onAction("reset", user)}
        >
          <KeyRound aria-hidden="true" size={17} />
        </button>
      ) : null}
      {can(identityPermissions.usersLock) ? (
        <button
          type="button"
          className={iconButton}
          title={user.isActive ? t.block(user.email) : t.unblock(user.email)}
          aria-label={user.isActive ? t.block(user.email) : t.unblock(user.email)}
          onClick={() => onAction(user.isActive ? "block" : "unblock", user)}
        >
          {user.isActive ? (
            <LockKeyhole aria-hidden="true" size={17} />
          ) : (
            <LockOpen aria-hidden="true" size={17} />
          )}
        </button>
      ) : null}
    </div>
  );
}

function UserStatus({ user }: { user: User }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={user.isActive ? chip : chipDanger}>
        {user.isActive ? t.statusActive : t.statusBlocked}
      </span>
      {user.mustChangePassword ? (
        <span className={chipNeutral}>{t.mustChange}</span>
      ) : null}
    </div>
  );
}

/** Directorio responsive: tabla en escritorio y fichas legibles en pantallas pequeñas. */
export function UsersTable({
  users,
  can,
  onAction,
}: {
  users: User[];
  can: (code: string) => boolean;
  onAction: (action: UserAction, user: User) => void;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className={table}>
          <caption className="sr-only">{t.title}</caption>
          <thead>
            <tr>
              <th scope="col" className={th}>{t.columns.user}</th>
              <th scope="col" className={th}>{t.columns.status}</th>
              <th scope="col" className={th}>{t.columns.roles}</th>
              <th scope="col" className={th}>{t.columns.createdAt}</th>
              <th scope="col" className={`${th} text-right`}>{t.columns.actions}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className={td}>
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-sm font-semibold text-accent-strong">
                      {initials(user.displayName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-fg">{user.displayName}</p>
                      <p className="truncate text-muted">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className={td}><UserStatus user={user} /></td>
                <td className={td}>
                  {user.roles.length === 0 ? (
                    <span className="text-muted">{t.noRoles}</span>
                  ) : (
                    <ul className="flex flex-wrap gap-1.5">
                      {user.roles.map((role) => <li key={role} className={chip}>{role}</li>)}
                    </ul>
                  )}
                </td>
                <td className={mutedCell}>{formatDateTime(user.createdAt)}</td>
                <td className={td}><UserActions user={user} can={can} onAction={onAction} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-3 p-3 md:hidden" aria-label={t.title}>
        {users.map((user) => (
          <li key={user.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-sm font-semibold text-accent-strong">
                {initials(user.displayName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words font-semibold text-fg">{user.displayName}</p>
                <p className="break-all text-sm text-muted">{user.email}</p>
                <div className="mt-2"><UserStatus user={user} /></div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 border-t border-line pt-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">{t.columns.roles}</span>
              {user.roles.length === 0 ? (
                <span className="text-sm text-muted">{t.noRoles}</span>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {user.roles.map((role) => <li key={role} className={chip}>{role}</li>)}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
              <span className="text-xs text-muted">{t.columns.createdAt}: {formatDateTime(user.createdAt)}</span>
              <UserActions user={user} can={can} onAction={onAction} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
