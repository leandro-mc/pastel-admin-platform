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
      {groups.map(([moduleName, items]) => {
        const all = items.every((item) => selected.has(item.id));
        return (
          <fieldset key={moduleName} className="flex flex-col gap-1">
            <legend className="flex w-full items-center justify-between gap-3 pb-1">
              <span className="text-sm font-semibold text-fg">
                {moduleName}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => toggleGroup(items, all)}
                className="min-h-11 rounded-lg px-2 text-sm font-medium text-accent-strong hover:underline disabled:opacity-60"
              >
                {all ? t.clearAll : t.selectAll}
              </button>
            </legend>
            {items.map((item) => (
              <label
                key={item.id}
                className="flex min-h-11 items-start gap-3 py-2 text-sm text-fg"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 size-5 shrink-0 accent-accent-strong"
                  disabled={disabled}
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id)}
                />
                <span>
                  <span className="font-medium">{item.name}</span>
                  <span className="block text-muted">
                    {item.description ?? item.code}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        );
      })}
    </div>
  );
}
