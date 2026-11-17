import { Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { focusClass, inputClass, labelClass } from "@/core/ui/styles";
import type { Task } from "../api/schemas";
import { formatLong } from "../domain/calendar";
import { effectiveDate, searchTasks } from "../domain/dates";
import { strings } from "../strings";

type SearchPanelProps = {
  tasks: Task[];
  today: string;
  zone: string;
  onOpen: (task: Task) => void;
};

/**
 * Búsqueda discreta (un icono en la cabecera): título y notas, sin distinguir mayúsculas ni tildes, entre las tareas
 * propias abiertas y hechas, sin las eliminadas. El resultado muestra día y estado; tocarlo abre el editor.
 */
export function SearchPanel({ tasks, today, zone, onOpen }: SearchPanelProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  // Al abrir, el cursor queda en el campo.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  const results = useMemo(() => searchTasks(tasks, query), [tasks, query]);
  const searching = query.trim() !== "";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={strings.search.open}
        className={`inline-grid size-11 place-items-center rounded-xl border border-line-strong bg-surface text-fg hover:bg-accent-soft ${focusClass}`}
      >
        <Search aria-hidden="true" className="size-5" />
      </button>
    );
  }

  return (
    <section
      aria-label={strings.search.label}
      className="w-full rounded-2xl border border-line bg-surface p-3 sm:max-w-md"
    >
      <div className="flex items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor={inputId} className={labelClass}>
            {strings.search.label}
          </label>
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={strings.search.placeholder}
            className={inputClass}
            ref={inputRef}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setQuery("");
          }}
          aria-label={strings.search.close}
          className={`inline-grid size-11 shrink-0 place-items-center rounded-xl text-fg-secondary hover:bg-accent-soft hover:text-fg ${focusClass}`}
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>

      <div aria-live="polite" className="mt-2">
        {!searching ? (
          <p className="text-sm text-muted">{strings.search.hint}</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted">{strings.search.none}</p>
        ) : (
          <>
            <p className="text-xs text-muted">{strings.search.results(results.length)}</p>
            <ul className="mt-1 flex max-h-72 flex-col gap-1 overflow-y-auto">
              {results.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(task)}
                    className={`flex min-h-11 w-full flex-col items-start rounded-xl px-3 py-2 text-left hover:bg-accent-soft ${focusClass}`}
                  >
                    <span className="line-clamp-1 text-sm font-medium text-fg">{task.title}</span>
                    <span className="text-xs text-muted">
                      {formatLong(effectiveDate(task, today, zone))} ·{" "}
                      {task.completed ? strings.task.done : strings.task.open}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
