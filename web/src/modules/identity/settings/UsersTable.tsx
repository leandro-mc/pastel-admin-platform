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
  tableScroll,
  td,
  th,
} from "./styles";

const t = settingsStrings.users;

export type UserAction = "block" | "unblock" | "reset";

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
    <div className={tableScroll}>
      <table className={table}>
        <caption className="sr-only">{t.title}</caption>
        <thead>
          <tr>
            <th scope="col" className={th}>
              {t.columns.user}
            </th>
            <th scope="col" className={th}>
              {t.columns.status}
            </th>
            <th scope="col" className={th}>
              {t.columns.roles}
            </th>
            <th scope="col" className={th}>
              {t.columns.createdAt}
            </th>
            <th scope="col" className={`${th} text-right`}>
              {t.columns.actions}
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className={td}>
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-strong"
                  >
                    {initials(user.displayName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{user.displayName}</p>
                    <p className="truncate text-muted">{user.email}</p>
                  </div>
                </div>
              </td>
              <td className={td}>
                <div className="flex flex-wrap gap-1.5">
                  <span className={user.isActive ? chip : chipDanger}>
                    {user.isActive ? t.statusActive : t.statusBlocked}
                  </span>
                  {user.mustChangePassword ? (
                    <span className={chipNeutral}>{t.mustChange}</span>
                  ) : null}
                </div>
              </td>
              <td className={td}>
                {user.roles.length === 0 ? (
                  <span className="text-muted">{t.noRoles}</span>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {user.roles.map((role) => (
                      <li key={role} className={chip}>
                        {role}
                      </li>
                    ))}
                  </ul>
                )}
              </td>
              <td className={mutedCell}>{formatDateTime(user.createdAt)}</td>
              <td className={td}>
                <div className="flex justify-end">
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
                      title={
                        user.isActive
                          ? t.block(user.email)
                          : t.unblock(user.email)
                      }
                      aria-label={
                        user.isActive
                          ? t.block(user.email)
                          : t.unblock(user.email)
                      }
                      onClick={() =>
                        onAction(user.isActive ? "block" : "unblock", user)
                      }
                    >
                      {user.isActive ? (
                        <LockKeyhole aria-hidden="true" size={17} />
                      ) : (
                        <LockOpen aria-hidden="true" size={17} />
                      )}
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
