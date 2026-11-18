import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/core/ui";
import { MONTH_HEADERS, formatLongInline, formatMonthYear, monthGrid, shiftMonth } from "../domain/calendar";
import { effectiveDate } from "../domain/dates";
import { useBrisa } from "../state/BrisaContext";
import { strings } from "../strings";

/** Ruta de la Semana: el día elegido en el Mes se enfoca y se abre ahí (`basePath` del manifiesto). */
const WEEK_PATH = "/brisa";

/** Mes: cuadrícula L M X J V S D con el conteo de tareas por día (según su día efectivo). Elegir un día lo abre en Semana. */
export function MonthView() {
  const { tasks, today, zone, focusDate, setFocusDate } = useBrisa();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(focusDate);

  const grid = useMemo(() => monthGrid(anchor), [anchor]);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of tasks) {
      const date = effectiveDate(task, today, zone);
      map.set(date, (map.get(date) ?? 0) + 1);
    }
    return map;
  }, [tasks, today, zone]);

  const open = (date: string) => {
    setFocusDate(date);
    void navigate(WEEK_PATH);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-fg">{formatMonthYear(anchor)}</p>
          <p className="text-sm text-fg-secondary">{strings.month.hint}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setAnchor(shiftMonth(anchor, -1))}>
            <ChevronLeft aria-hidden="true" className="size-4" />
            {strings.month.previous}
          </Button>
          <Button variant="secondary" onClick={() => setAnchor(shiftMonth(anchor, 1))}>
            {strings.month.next}
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {MONTH_HEADERS.map((header) => (
          <p key={header} aria-hidden="true" className="text-center text-xs font-semibold text-muted">
            {header}
          </p>
        ))}
        {grid.flat().map((cell) => {
          const count = counts.get(cell.date) ?? 0;
          const isToday = cell.date === today;
          const countText = count === 0 ? strings.week.none : strings.month.tasks(count);
          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => open(cell.date)}
              aria-label={strings.month.openDay(formatLongInline(cell.date), countText)}
              aria-current={isToday ? "date" : undefined}
              className={`flex min-h-16 flex-col items-start gap-0.5 rounded-xl border p-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:min-h-20 sm:p-2 ${
                isToday ? "border-accent bg-accent-soft" : "border-line bg-surface hover:bg-accent-soft"
              } ${cell.inMonth ? "text-fg" : "text-muted opacity-70"}`}
            >
              <span className="text-sm font-semibold">{Number(cell.date.slice(8))}</span>
              {isToday ? (
                <span className="text-[0.65rem] font-semibold text-accent-strong">{strings.month.today}</span>
              ) : null}
              {count > 0 ? (
                <span className="text-[0.7rem] leading-tight text-fg-secondary">{strings.month.tasks(count)}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
