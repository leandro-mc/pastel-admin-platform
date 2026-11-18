import { useMemo } from "react";
import { StateView } from "@/core/ui";
import { overdueTasks } from "../domain/dates";
import { useBrisa } from "../state/BrisaContext";
import { strings } from "../strings";
import { TaskCard } from "./TaskCard";

/** Vencidas («Pendientes atrasados»): por (fecha límite o día efectivo) y prioridad. Cada tarjeta dice «PROGRAMADA PARA». */
export function OverdueView() {
  const { tasks, today, zone, edit, toggle, busyIds } = useBrisa();
  const overdue = useMemo(() => overdueTasks(tasks, today, zone), [tasks, today, zone]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-semibold text-fg">{strings.overdue.count(overdue.length)}</p>
      {overdue.length === 0 ? (
        <StateView
          status="success"
          title={strings.overdue.emptyTitle}
          description={strings.overdue.emptyDescription}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {overdue.map((task) => (
            <li key={task.id}>
              <TaskCard
                task={task}
                today={today}
                zone={zone}
                variant="overdue"
                busy={busyIds.has(task.id)}
                onToggle={toggle}
                onOpen={edit}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
