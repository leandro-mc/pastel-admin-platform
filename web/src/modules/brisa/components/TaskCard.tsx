import { Check, CircleAlert, Circle } from "lucide-react";
import type { CSSProperties } from "react";
import type { Task } from "../api/schemas";
import { formatLong, formatShort } from "../domain/calendar";
import { effectiveDate, isOverdue } from "../domain/dates";
import { strings } from "../strings";
import { PriorityChip } from "./PriorityChip";

export type TaskCardVariant = "plain" | "overdue" | "deadline";

type TaskCardProps = {
  task: Task;
  today: string;
  zone: string;
  variant?: TaskCardVariant;
  busy?: boolean;
  onToggle: (task: Task) => void;
  onOpen: (task: Task) => void;
};

/**
 * Tarjeta de tarea. Claro: el color pastel tal cual. Oscuro: ese color mezclado al 28 % con `--surface`
 * (`docs/modules/BRISA.md` §7), sin tokens nuevos. Estado = icono y texto; prioridad = punto y texto.
 */
export function TaskCard({
  task,
  today,
  zone,
  variant = "plain",
  busy = false,
  onToggle,
  onOpen,
}: TaskCardProps) {
  const overdue = isOverdue(task, today, zone);
  const effective = effectiveDate(task, today, zone);

  return (
    <article
      style={{ "--task-color": task.colorHex } as CSSProperties}
      className="flex flex-col gap-2 rounded-2xl border border-line bg-(--task-color) p-3 text-fg dark:bg-[color-mix(in_srgb,var(--task-color)_28%,var(--surface))]"
    >
      {variant === "overdue" ? (
        <p className="text-xs font-semibold tracking-wide text-muted">
          {strings.overdue.scheduledFor}{" "}
          <span className="text-fg">{formatLong(effective)}</span>
        </p>
      ) : null}
      {variant === "deadline" && task.dueDate ? (
        <p className="text-xs font-semibold tracking-wide text-muted">
          {overdue ? strings.deadlines.overdueLabel : strings.deadlines.label}{" "}
          <span className="text-fg">{formatLong(task.dueDate)}</span>
        </p>
      ) : null}

      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => onToggle(task)}
          disabled={busy}
          aria-pressed={task.completed}
          aria-label={
            task.completed
              ? strings.task.markOpen(task.title)
              : strings.task.markDone(task.title)
          }
          className="inline-grid size-11 shrink-0 place-items-center rounded-xl text-fg hover:bg-surface/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
        >
          {task.completed ? (
            <Check aria-hidden="true" className="size-5" />
          ) : (
            <Circle aria-hidden="true" className="size-5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onOpen(task)}
          aria-label={strings.task.edit(task.title)}
          className="min-h-11 min-w-0 flex-1 rounded-xl px-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span
            className={`line-clamp-2 text-base font-semibold break-words ${task.completed ? "line-through decoration-1" : ""}`}
          >
            {task.title}
          </span>
          {task.notes ? (
            <span className="mt-0.5 line-clamp-2 block text-sm break-words text-fg-secondary">
              {task.notes}
            </span>
          ) : null}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-1">
        <PriorityChip priority={task.priority} />
        {task.dueDate ? (
          <span className="text-xs text-fg-secondary">
            {strings.task.deadline(formatShort(task.dueDate))}
          </span>
        ) : null}
        {task.completed ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-fg">
            <Check aria-hidden="true" className="size-3.5" />
            {strings.task.done}
          </span>
        ) : null}
        {overdue ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger">
            <CircleAlert aria-hidden="true" className="size-3.5" />
            {strings.task.overdue}
          </span>
        ) : null}
      </div>
    </article>
  );
}
