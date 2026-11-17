import { useMemo } from "react";
import { StateView } from "@/core/ui";
import { deadlineTasks } from "../domain/dates";
import { useBrisa } from "../state/BrisaContext";
import { strings } from "../strings";
import { TaskCard } from "./TaskCard";

/** Fechas límite: abiertas antes que hechas, por vencimiento; «VENCIDA» solo si lo está (§5.3). */
export function DeadlinesView() {
  const { tasks, today, zone, edit, toggle, busyIds } = useBrisa();
  const list = useMemo(() => deadlineTasks(tasks, today), [tasks, today]);

  if (list.length === 0) {
    return (
      <StateView
        status="empty"
        title={strings.deadlines.emptyTitle}
        description={strings.deadlines.emptyDescription}
      />
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((task) => (
        <li key={task.id}>
          <TaskCard
            task={task}
            today={today}
            zone={zone}
            variant="deadline"
            busy={busyIds.has(task.id)}
            onToggle={toggle}
            onOpen={edit}
          />
        </li>
      ))}
    </ul>
  );
}
