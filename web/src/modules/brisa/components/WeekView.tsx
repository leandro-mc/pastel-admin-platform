import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Button, StateView } from "@/core/ui";
import type { Task } from "../api/schemas";
import { formatLongInline, formatRange, formatShort, formatWeekdayShort, weekDates } from "../domain/calendar";
import { addDays, effectiveDate } from "../domain/dates";
import { useBrisa } from "../state/BrisaContext";
import { strings } from "../strings";
import { TaskCard } from "./TaskCard";

const RANK = { LOW: 0, MEDIUM: 1, HIGH: 2 } as const;
const byPriority = (a: Task, b: Task) =>
  RANK[b.priority] - RANK[a.priority] || a.createdAt.localeCompare(b.createdAt);

/**
 * Semana: siete columnas (lunes a domingo) con HOY marcado y el día enfocado resaltado. Cada día muestra sus abiertas y,
 * aparte, las HECHAS, según el **día efectivo**. Se recorre con las flechas de las cabeceras o los botones.
 */
export function WeekView() {
  const { tasks, today, zone, focusDate, setFocusDate, createFor, edit, toggle, busyIds } = useBrisa();
  const days = weekDates(focusDate);
  const first = days[0] ?? focusDate;
  const last = days[6] ?? focusDate;
  const columns = useRef(new Map<string, HTMLElement>());

  const byDay = useMemo(() => {
    const map = new Map<string, { open: Task[]; done: Task[] }>();
    for (const date of weekDates(focusDate)) map.set(date, { open: [], done: [] });
    for (const task of tasks) {
      const bucket = map.get(effectiveDate(task, today, zone));
      if (bucket) (task.completed ? bucket.done : bucket.open).push(task);
    }
    for (const bucket of map.values()) {
      bucket.open.sort(byPriority);
      bucket.done.sort(byPriority);
    }
    return map;
  }, [tasks, today, zone, focusDate]);

  const totals = useMemo(() => {
    let open = 0;
    let done = 0;
    for (const bucket of byDay.values()) {
      open += bucket.open.length;
      done += bucket.done.length;
    }
    return { open, done };
  }, [byDay]);

  // La columna del día enfocado queda a la vista (carrusel en pantallas estrechas).
  useEffect(() => {
    columns.current.get(focusDate)?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [focusDate]);

  const move = (date: string, delta: number) => {
    const next = addDays(date, delta);
    setFocusDate(next);
    window.requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-day-button="${next}"]`)?.focus(),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {tasks.length === 0 ? (
        <StateView
          status="empty"
          title={strings.states.firstTitle}
          description={strings.states.firstDescription}
          action={<Button onClick={() => createFor(today)}>{strings.states.firstAction}</Button>}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-fg">{formatRange(first, last)}</p>
          <p className="text-sm text-fg-secondary">
            {strings.week.counts(totals.open, totals.done, totals.open + totals.done)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setFocusDate(addDays(focusDate, -7))}>
            <ChevronLeft aria-hidden="true" className="size-4" />
            {strings.week.weekBack}
          </Button>
          <Button variant="secondary" onClick={() => setFocusDate(today)}>
            {strings.week.goToday}
          </Button>
          <Button variant="secondary" onClick={() => setFocusDate(addDays(focusDate, 7))}>
            {strings.week.weekForward}
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted">{strings.week.hint}</p>

      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 xl:mx-0 xl:px-0">
        {days.map((date) => {
          const bucket = byDay.get(date) ?? { open: [], done: [] };
          const isToday = date === today;
          const isFocus = date === focusDate;
          const count = bucket.open.length + bucket.done.length;
          return (
            <section
              key={date}
              ref={(node) => {
                if (node) columns.current.set(date, node);
                else columns.current.delete(date);
              }}
              aria-label={formatLongInline(date)}
              className={`flex min-w-64 flex-1 snap-start flex-col gap-3 rounded-2xl border bg-surface p-3 ${isFocus ? "border-accent ring-2 ring-accent" : "border-line"}`}
            >
              <header className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  data-day-button={date}
                  onClick={() => setFocusDate(date)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowRight") {
                      event.preventDefault();
                      move(date, 1);
                    } else if (event.key === "ArrowLeft") {
                      event.preventDefault();
                      move(date, -1);
                    }
                  }}
                  aria-current={isToday ? "date" : undefined}
                  className="min-h-11 flex-1 rounded-xl px-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-fg-secondary">
                    {formatWeekdayShort(date)}
                    {isToday ? (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[0.7rem] text-on-accent">
                        {strings.week.today}
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-base font-semibold text-fg">{formatShort(date)}</span>
                  <span className="block text-xs text-muted">
                    {count === 0 ? strings.week.none : strings.week.tasks(count)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFocusDate(date);
                    createFor(date);
                  }}
                  aria-label={strings.week.createFor(formatLongInline(date))}
                  className="inline-grid size-11 shrink-0 place-items-center rounded-xl text-fg-secondary hover:bg-accent-soft hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <Plus aria-hidden="true" className="size-5" />
                </button>
              </header>

              <div className="flex flex-col gap-2">
                {bucket.open.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    today={today}
                    zone={zone}
                    busy={busyIds.has(task.id)}
                    onToggle={toggle}
                    onOpen={edit}
                  />
                ))}
              </div>

              {bucket.done.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold tracking-wide text-muted">{strings.week.done}</h3>
                  {bucket.done.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      today={today}
                      zone={zone}
                      busy={busyIds.has(task.id)}
                      onToggle={toggle}
                      onOpen={edit}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
