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
      {groups.length === 0 ? (
        <p
          role="status"
          className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted"
        >
          No hay permisos que coincidan con la búsqueda.
        </p>
      ) : null}
      {groups.map(([moduleName, items]) => {
        const activeCount = items.filter(
          (permission) => (overrides[permission.id] ?? "Inherit") !== "Inherit",
        ).length;
        return (
          <section
            key={moduleName}
            aria-label={moduleName}
            className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm"
          >
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-raised px-4 py-3">
              <h3 className="text-sm font-bold text-fg">{moduleName}</h3>
              <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-muted">
                {activeCount} cambios directos
              </span>
            </header>
            <ul className="divide-y divide-line px-4">
              {items.map((permission) => {
                const current = overrides[permission.id] ?? "Inherit";
                const labelId = `override-${permission.id}`;
                const explanation =
                  current === "Inherit"
                    ? grantedByRole.has(permission.id)
                      ? t.byRoleYes
                      : t.byRoleNo
                    : current === "Grant"
                      ? "Concedido directamente a esta cuenta."
                      : "Denegado directamente a esta cuenta.";
                return (
                  <li
                    key={permission.id}
                    className="grid min-w-0 gap-3 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          id={labelId}
                          className="text-sm font-semibold text-fg"
                        >
                          {permission.name}
                        </p>
                        <span
                          className={
                            current === "Grant"
                              ? "rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-strong"
                              : current === "Deny"
                                ? "rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger"
                                : "rounded-full bg-surface-raised px-2 py-0.5 text-xs font-medium text-muted"
                          }
                        >
                          {current === "Grant"
                            ? t.grant
                            : current === "Deny"
                              ? t.deny
                              : t.inherit}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        {permission.description ?? permission.code}{" "}
                        {explanation}
                      </p>
                    </div>
                    <div
                      role="radiogroup"
                      aria-labelledby={labelId}
                      className="flex shrink-0 flex-wrap gap-2"
                    >
                      {options.map((option) => {
                        const active = current === option.value;
                        const stateClass = active
                          ? option.value === "Deny"
                            ? "border-danger bg-danger-soft font-semibold text-danger"
                            : option.value === "Grant"
                              ? "border-accent-strong bg-accent-soft font-semibold text-accent-strong"
                              : "border-line-strong bg-surface-raised font-semibold text-fg"
                          : "border-line-strong bg-surface text-fg hover:bg-surface-raised";
                        return (
                          <label
                            key={option.value}
                            className={[
                              "inline-flex min-h-11 cursor-pointer items-center rounded-xl border px-3 text-sm transition-colors has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-strong",
                              stateClass,
                            ].join(" ")}
                          >
                            <input
                              type="radio"
                              className="sr-only"
                              name={labelId}
                              value={option.value}
                              disabled={disabled}
                              checked={active}
                              onChange={() =>
                                onChange(permission.id, option.value)
                              }
                            />
                            {option.label}
                          </label>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
