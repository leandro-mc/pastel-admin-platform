import { useMemo, useState, type ReactNode } from "react";
import {
  Button,
  CheckboxField,
  ConfirmDialog,
  Panel,
} from "@/core/ui";
import { strings } from "../strings";
import { Collapsible } from "./Collapsible";
import { ErrorNotice } from "./Form";
import { SaveStatus } from "./SaveStatus";
import { SearchField, fold } from "./SearchField";
import { useAutosaveRows, type Row } from "./useAutosaveRows";

export type { Row } from "./useAutosaveRows";

let counter = 0;
export const newKey = () => `n${(counter += 1)}`;

type VisibleRow = Row & { isVisible: boolean };

type Props<S extends { id: string }, R extends VisibleRow> = {
  title: string;
  description?: string;
  empty: string;
  addLabel: string;
  /** Nombre del buscador para lectores de pantalla (p. ej. «Buscar en experiencia»). */
  searchLabel: string;
  /** Forma de nombrar un elemento en la confirmación de quitar (p. ej. «esta experiencia»). */
  removeWhat: string;
  /** Elementos guardados en el servidor. */
  source: readonly S[];
  toRow: (item: S) => R;
  blank: () => R;
  toPayload: (row: R) => unknown;
  /** Una fila nueva se guarda sola cuando esto es verdadero. */
  isReady: (row: R) => boolean;
  /** Qué falta para que una fila nueva se guarde (texto corto, p. ej. «cargo, empresa e inicio»). */
  readyHint: string;
  save: (items: unknown[]) => Promise<readonly { id: string }[]>;
  heading: (row: R) => string;
  /** Texto adicional sobre el que busca el buscador (además del encabezado). */
  searchText?: (row: R) => string;
  fields: (
    row: R,
    set: (patch: Partial<R>) => void,
    errorOf: (field: string) => string | undefined,
  ) => ReactNode;
  /** Contenido adicional bajo cada fila (p. ej. sus logros). */
  extra?: (row: R) => ReactNode;
  maxItems?: number;
};

/**
 * Editor de una sección del banco. Cada elemento llega cerrado (solo su nombre, la casilla de visibilidad y quitar) y se
 * guarda solo, sin botón. Un elemento nuevo se abre para llenarlo y se guarda cuando tiene lo obligatorio.
 */
export function SectionEditor<S extends { id: string }, R extends VisibleRow>({
  title,
  description,
  empty,
  addLabel,
  searchLabel,
  removeWhat,
  source,
  toRow,
  blank,
  toPayload,
  isReady,
  readyHint,
  save,
  heading,
  searchText,
  fields,
  extra,
  maxItems = 40,
}: Props<S, R>) {
  const list = useAutosaveRows<S, R>({ source, toRow, toPayload, isReady, save });
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const [toRemove, setToRemove] = useState<R | null>(null);

  const toggle = (key: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const shown = useMemo(() => {
    const needle = fold(query.trim());
    if (needle === "") return list.rows;
    return list.rows.filter((r) =>
      fold(`${heading(r)} ${searchText?.(r) ?? ""}`).includes(needle),
    );
  }, [list.rows, query, heading, searchText]);

  return (
    <Panel
      title={title}
      description={description}
      actions={<SaveStatus state={list.state} />}
    >
      <div className="flex flex-col gap-4">
        {list.rows.length > 0 ? (
          <SearchField
            value={query}
            onChange={setQuery}
            label={searchLabel}
            placeholder={strings.list.search}
          />
        ) : null}
        {list.rows.length === 0 ? (
          <p className="text-sm text-muted">{empty}</p>
        ) : null}
        {list.rows.length > 0 && shown.length === 0 ? (
          <p className="text-sm text-muted">{strings.list.noResults}</p>
        ) : null}
        {shown.map((row) => (
          <Collapsible
            key={row.key}
            title={heading(row) || addLabel}
            expanded={open.has(row.key)}
            onToggle={() => toggle(row.key)}
            actions={
              <>
                <CheckboxField
                  label={strings.common.visible}
                  checked={row.isVisible}
                  onChange={(e) =>
                    list.update(row.key, { isVisible: e.target.checked } as Partial<R>)
                  }
                />
                <Button
                  variant="ghost"
                  type="button"
                  aria-label={`${strings.common.remove}: ${heading(row) || addLabel}`}
                  onClick={() => setToRemove(row)}
                >
                  {strings.common.remove}
                </Button>
              </>
            }
          >
            <div className="flex flex-col gap-4">
              {!row.id && !isReady(row) ? (
                <p className="text-sm text-muted">
                  {strings.autosave.incomplete(readyHint)}
                </p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                {fields(
                  row,
                  (patch) => list.update(row.key, patch),
                  (field) => list.errorOf(row.key, field),
                )}
              </div>
              {extra ? extra(row) : null}
            </div>
          </Collapsible>
        ))}
        <div>
          <Button
            variant="secondary"
            type="button"
            disabled={list.rows.length >= maxItems}
            onClick={() => {
              const row = blank();
              setQuery("");
              setOpen((current) => new Set(current).add(row.key));
              list.add(row);
            }}
          >
            {addLabel}
          </Button>
        </div>
        <ErrorNotice error={list.error} />
      </div>

      {toRemove ? (
        <ConfirmDialog
          title={strings.confirm.removeTitle(removeWhat)}
          message={strings.confirm.removeMessage(heading(toRemove) || addLabel)}
          confirmLabel={strings.common.remove}
          cancelLabel={strings.common.cancel}
          onClose={() => setToRemove(null)}
          onConfirm={() => {
            list.remove(toRemove.key);
            setToRemove(null);
          }}
        />
      ) : null}
    </Panel>
  );
}
