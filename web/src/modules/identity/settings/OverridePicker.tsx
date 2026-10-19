import { useMemo, useState } from "react";
import type { Permission, PermissionEffect } from "../api/schemas";
import { inputClass, labelClass } from "../styles";
import { settingsStrings } from "./strings";

const t = settingsStrings.access;

/** «Heredar» solo existe en la pantalla: no se envía al servidor. */
export type OverrideValue = PermissionEffect | "Inherit";

type Props = {
  catalog: Permission[];
  /** Estado por permiso; lo que no aparece hereda. */
  overrides: Readonly<Record<string, OverrideValue>>;
  /** Permisos que dan los roles hoy seleccionados (para explicar qué significa «heredar»). */
  grantedByRole: ReadonlySet<string>;
  onChange: (permissionId: string, value: OverrideValue) => void;
  disabled?: boolean;
};

const options: { value: OverrideValue; label: string }[] = [
  { value: "Inherit", label: t.inherit },
  { value: "Grant", label: t.grant },
  { value: "Deny", label: t.deny },
];

/** Excepciones individuales: por cada permiso, heredar de los roles, conceder o denegar. Agrupado por módulo y con búsqueda. */
export function OverridePicker({
  catalog,
  overrides,
  grantedByRole,
  onChange,
  disabled = false,
}: Props) {
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const byModule = new Map<string, Permission[]>();
    for (const permission of catalog) {
      const matches =
        term === "" ||
        permission.name.toLowerCase().includes(term) ||
        permission.code.toLowerCase().includes(term);
      if (!matches) continue;
      byModule.set(permission.moduleName, [
        ...(byModule.get(permission.moduleName) ?? []),
        permission,
      ]);
    }
    return [...byModule.entries()];
  }, [catalog, search]);

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>{t.search}</span>
        <input
          type="search"
          className={inputClass}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      {groups.map(([moduleName, items]) => (
        <section key={moduleName} aria-label={moduleName}>
          <h3 className="pb-1 text-sm font-semibold text-fg">{moduleName}</h3>
          <ul>
            {items.map((permission) => {
              const current = overrides[permission.id] ?? "Inherit";
              const labelId = `override-${permission.id}`;
              return (
                <li
                  key={permission.id}
                  className="flex flex-col gap-2 border-b border-line py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p id={labelId} className="text-sm font-medium text-fg">
                      {permission.name}
                    </p>
                    <p className="text-sm text-muted">
                      {permission.description ?? permission.code}
                      {current === "Inherit"
                        ? ` ${grantedByRole.has(permission.id) ? t.byRoleYes : t.byRoleNo}`
                        : ""}
                    </p>
                  </div>
                  <div
                    role="radiogroup"
                    aria-labelledby={labelId}
                    className="flex shrink-0 flex-wrap gap-2"
                  >
                    {options.map((option) => (
                      <label
                        key={option.value}
                        className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-line-strong px-3 text-sm text-fg has-[:checked]:border-accent-strong has-[:checked]:bg-accent-soft has-[:checked]:font-semibold has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-strong"
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          name={labelId}
                          value={option.value}
                          disabled={disabled}
                          checked={current === option.value}
                          onChange={() => onChange(permission.id, option.value)}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
