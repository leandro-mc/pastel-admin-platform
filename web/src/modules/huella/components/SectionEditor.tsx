import { useEffect, useState, type ReactNode } from "react";
import { useNotify } from "@/core/notifications";
import { Button, Panel } from "@/core/ui";
import { strings } from "../strings";
import { ErrorNotice, fieldError } from "./Form";

export type Row = { key: string; id?: string };

let counter = 0;
export const newKey = () => `n${(counter += 1)}`;

type Props<S, R extends Row> = {
  title: string;
  description?: string;
  empty: string;
  addLabel: string;
  /** Elementos guardados en el servidor. */
  source: readonly S[];
  toRow: (item: S) => R;
  blank: () => R;
  toPayload: (row: R) => unknown;
  /** Guarda la sección completa; devuelve una promesa que se resuelve al guardar. */
  save: (items: unknown[]) => Promise<unknown>;
  saving: boolean;
  error: unknown;
  heading: (row: R, index: number) => string;
  fields: (
    row: R,
    set: (patch: Partial<R>) => void,
    errorOf: (field: string) => string | undefined,
    index: number,
  ) => ReactNode;
  /** Contenido adicional bajo cada fila guardada (p. ej. sus logros). */
  extra?: (row: R) => ReactNode;
  maxItems?: number;
};

/**
 * Editor de una sección del banco. Cada sección se guarda completa: lo que falta se borra, lo que no tiene identificador
 * se crea. Mientras haya cambios sin guardar, una recarga del servidor no pisa lo escrito.
 */
export function SectionEditor<S, R extends Row>({
  title,
  description,
  empty,
  addLabel,
  source,
  toRow,
  blank,
  toPayload,
  save,
  saving,
  error,
  heading,
  fields,
  extra,
  maxItems = 40,
}: Props<S, R>) {
  const notify = useNotify();
  const [rows, setRows] = useState<R[]>(() => source.map(toRow));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    // Sin cambios locales, se adopta lo que haya en el servidor (por ejemplo, tras guardar).
    if (!dirty) setRows(source.map(toRow));
  }, [source, dirty]);

  const update = (index: number, patch: Partial<R>) => {
    setRows((current) =>
      current.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
    setDirty(true);
  };
  const remove = (index: number) => {
    setRows((current) => current.filter((_, i) => i !== index));
    setDirty(true);
  };
  const submit = async () => {
    try {
      await save(rows.map(toPayload));
      setDirty(false);
      notify(strings.common.saved);
    } catch {
      /* el error queda en la mutación y se muestra abajo */
    }
  };

  return (
    <Panel
      title={title}
      description={description}
      actions={
        <Button
          variant="primary"
          type="button"
          loading={saving}
          loadingLabel={strings.common.saving}
          disabled={!dirty}
          onClick={() => void submit()}
        >
          {strings.common.save}
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        {rows.length === 0 ? (
          <p className="text-sm text-muted">{empty}</p>
        ) : null}
        {rows.map((row, index) => (
          <article
            key={row.key}
            className="flex flex-col gap-4 rounded-xl border border-line p-4"
            aria-label={heading(row, index)}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-fg">
                {heading(row, index)}
              </h3>
              <Button
                variant="ghost"
                type="button"
                onClick={() => remove(index)}
              >
                {strings.common.remove}
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields(
                row,
                (patch) => update(index, patch),
                (field) => fieldError(error, `items[${index}].${field}`),
                index,
              )}
            </div>
            {extra ? extra(row) : null}
          </article>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            type="button"
            disabled={rows.length >= maxItems}
            onClick={() => {
              setRows((current) => [...current, blank()]);
              setDirty(true);
            }}
          >
            {addLabel}
          </Button>
          {dirty ? (
            <span className="text-sm text-muted">{strings.common.unsaved}</span>
          ) : null}
        </div>
        <ErrorNotice error={error} />
      </div>
    </Panel>
  );
}
