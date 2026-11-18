import type { CSSProperties } from "react";
import type { Priority } from "../domain/dates";
import { priorityStyle, strings } from "../strings";

/** Prioridad = punto de color **y** texto, nunca solo color. En oscuro el fondo se mezcla al 28 % con la superficie. */
export function PriorityChip({ priority }: { priority: Priority }) {
  const style = priorityStyle[priority];
  return (
    <span
      style={{ "--chip": style.chip } as CSSProperties}
      className="inline-flex items-center gap-1.5 rounded-full bg-(--chip) px-2.5 py-1 text-xs font-medium text-fg dark:bg-[color-mix(in_srgb,var(--chip)_28%,var(--surface))]"
    >
      <span
        aria-hidden="true"
        style={{ backgroundColor: style.dot }}
        className="size-2 shrink-0 rounded-full"
      />
      {strings.task.priority(priority)}
    </span>
  );
}
