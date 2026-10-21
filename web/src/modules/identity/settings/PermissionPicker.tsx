import { useMemo, useState } from "react";
import type { Permission } from "../api/schemas";
import { inputClass, labelClass } from "../styles";
import { settingsStrings } from "./strings";

const t = settingsStrings.access;

type Props = {
  catalog: Permission[];
  selected: ReadonlySet<string>;
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

/** Selector de permisos agrupado por módulo, con búsqueda y «seleccionar el grupo». */
export function PermissionPicker({
  catalog,
  selected,
  onChange,
  disabled = false,
}: Props) {
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const visible = catalog.filter(
      (p) =>
        term === "" ||
        p.name.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term),
    );
    const byModule = new Map<string, Permission[]>();
    for (const permission of visible) {
      byModule.set(permission.moduleName, [
        ...(byModule.get(permission.moduleName) ?? []),
        permission,
      ]);
    }
    return [...byModule.entries()];
  }, [catalog, search]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  const toggleGroup = (items: Permission[], all: boolean) => {
    const next = new Set(selected);
    for (const item of items) {
      if (all) next.delete(item.id);
      else next.add(item.id);
    }
    onChange([...next]);
  };

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
      <p role="status" className="text-sm text-muted">
        {t.selectedCount(selected.size)}
      </p>
      {groups.length === 0 ? (
        <p role="status" className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
          No hay permisos que coincidan con la búsqueda.
        </p>
      ) : null}
      {groups.map(([moduleName, items]) => {
        const all = items.every((item) => selected.has(item.id));
        const count = items.filter((item) => selected.has(item.id)).length;
        return (
          <fieldset
            key={moduleName}
            className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-4 shadow-sm"
          >
            <legend className="w-full pb-3">
              <span className="flex w-full items-center justify-between gap-3">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-bold text-fg">{moduleName}</span>
                  <span className="text-xs text-muted">
                    {count} de {items.length} permisos seleccionados
                  </span>
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleGroup(items, all)}
                  className="min-h-10 shrink-0 rounded-xl border border-line bg-surface-raised px-3 text-xs font-semibold text-accent-strong hover:border-accent-strong hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {all ? t.clearAll : t.selectAll}
                </button>
              </span>
            </legend>
            <div className="divide-y divide-line">
              {items.map((item) => (
                <label
                  key={item.id}
                  className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl px-3 py-3 text-sm text-fg transition-colors hover:bg-surface-raised has-[:checked]:bg-accent-soft/50 has-[:disabled]:cursor-not-allowed"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 size-5 shrink-0 accent-accent-strong"
                    disabled={disabled}
                    checked={selected.has(item.id)}
                    onChange={() => toggle(item.id)}
                  />
                  <span className="min-w-0 font-semibold">
                    {item.name}
                    <span className="mt-0.5 block break-words text-sm font-normal leading-relaxed text-muted">
                      {item.description ?? item.code}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
