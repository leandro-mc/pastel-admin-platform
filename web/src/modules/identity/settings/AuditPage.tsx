import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/core/auth";
import { useAudit, useModules } from "../api/queries";
import { identityPermissions } from "../paths";
import { inputClass, secondaryButton } from "../styles";
import { Pager } from "./Pager";
import { QueryState } from "./QueryState";
import { auditLabel } from "./auditLabels";
import { formatDateTime } from "./format";
import { settingsStrings } from "./strings";
import {
  mutedCell,
  panel,
  selectClass,
  table,
  tableScroll,
  td,
  th,
} from "./styles";
import { DEFAULT_PAGE_SIZE, useUrlFilters } from "./urlFilters";

const t = settingsStrings.audit;
const defaults: Record<"action" | "module" | "actor" | "from" | "to", string> =
  {
    action: "",
    module: "",
    actor: "",
    from: "",
    to: "",
  };

/** Convierte el día elegido (hora local) al instante que espera la API; vacío si no hay día. */
function toInstant(day: string, endOfDay: boolean): string {
  if (!day) return "";
  const date = new Date(`${day}T${endOfDay ? "23:59:59.999" : "00:00:00"}`);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

/** `/configuracion/auditoria`: eventos paginados; todos los filtros se aplican en el servidor y viven en la URL. */
export function Component() {
  const { hasPermission } = useAuth();
  const { values, page, update, reset } = useUrlFilters(defaults);
  const [action, setAction] = useState(values.action);
  const [actor, setActor] = useState(values.actor);
  const modules = useModules({
    enabled: hasPermission(identityPermissions.modulesRead),
  });

  const audit = useAudit({
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    action: values.action,
    module: values.module,
    actor: values.actor,
    targetUserId: "",
    from: toInstant(values.from, false),
    to: toInstant(values.to, true),
  });

  useEffect(() => setAction(values.action), [values.action]);
  useEffect(() => setActor(values.actor), [values.actor]);
  useEffect(() => {
    if (action === values.action) return;
    const id = window.setTimeout(() => update({ action: action.trim() }), 300);
    return () => window.clearTimeout(id);
  }, [action, values.action, update]);
  useEffect(() => {
    if (actor === values.actor) return;
    const id = window.setTimeout(() => update({ actor: actor.trim() }), 300);
    return () => window.clearTimeout(id);
  }, [actor, values.actor, update]);

  const filtered = useMemo(
    () => Object.values(values).some((value) => value !== ""),
    [values],
  );

  return (
    <section aria-labelledby="audit-title" className={panel}>
      <div className="p-4">
        <h1 id="audit-title" className="text-lg font-semibold text-fg">
          {t.title}
        </h1>
        <p className="text-sm text-muted">{t.subtitle}</p>
      </div>

      <form
        role="search"
        onSubmit={(event) => event.preventDefault()}
        className="flex flex-wrap items-end gap-3 px-4 pb-4"
      >
        <label className="flex min-w-48 flex-1 flex-col gap-1.5 text-sm font-medium text-fg">
          {t.actionSearch}
          <input
            type="search"
            className={inputClass}
            value={action}
            onChange={(event) => setAction(event.target.value)}
          />
        </label>
        <label className="flex min-w-48 flex-1 flex-col gap-1.5 text-sm font-medium text-fg">
          {t.actor}
          <input
            type="search"
            className={inputClass}
            value={actor}
            onChange={(event) => setActor(event.target.value)}
          />
        </label>
        {modules.data ? (
          <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
            {t.module}
            <select
              className={selectClass}
              value={values.module}
              onChange={(event) => update({ module: event.target.value })}
            >
              <option value="">{t.allModules}</option>
              {modules.data.map((module) => (
                <option key={module.id} value={module.code}>
                  {module.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
          {t.from}
          <input
            type="date"
            className={inputClass}
            value={values.from}
            max={values.to || undefined}
            onChange={(event) => update({ from: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
          {t.to}
          <input
            type="date"
            className={inputClass}
            value={values.to}
            min={values.from || undefined}
            onChange={(event) => update({ to: event.target.value })}
          />
        </label>
        {filtered ? (
          <button type="button" className={secondaryButton} onClick={reset}>
            {settingsStrings.common.clear}
          </button>
        ) : null}
      </form>

      <QueryState
        isPending={audit.isPending}
        error={audit.error}
        onRetry={() => void audit.refetch()}
      >
        {audit.data && audit.data.items.length === 0 ? (
          <p role="status" className="p-6 text-sm text-muted">
            {t.empty}
          </p>
        ) : audit.data ? (
          <>
            <div className={tableScroll}>
              <table className={table}>
                <caption className="sr-only">{t.title}</caption>
                <thead>
                  <tr>
                    <th scope="col" className={th}>
                      {t.columns.event}
                    </th>
                    <th scope="col" className={th}>
                      {t.columns.actor}
                    </th>
                    <th scope="col" className={th}>
                      {t.columns.target}
                    </th>
                    <th scope="col" className={th}>
                      {t.columns.ip}
                    </th>
                    <th scope="col" className={th}>
                      {t.columns.date}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {audit.data.items.map((item) => (
                    <tr key={item.id}>
                      <td className={td}>
                        <p className="font-medium">{auditLabel(item.action)}</p>
                        <p className="text-xs text-muted">{item.action}</p>
                      </td>
                      <td className={td}>
                        {item.actorEmail ?? settingsStrings.common.system}
                      </td>
                      <td className={td}>
                        {item.target ?? settingsStrings.common.none}
                      </td>
                      <td className={mutedCell}>
                        {item.ipAddress ?? settingsStrings.common.none}
                      </td>
                      <td className={mutedCell}>
                        {formatDateTime(item.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager
              page={audit.data.page}
              pageSize={audit.data.pageSize}
              totalCount={audit.data.totalCount}
            />
          </>
        ) : null}
      </QueryState>
    </section>
  );
}
