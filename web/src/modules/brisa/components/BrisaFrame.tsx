import { Plus } from "lucide-react";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { Button, PageHeader, StateView } from "@/core/ui";
import { useDeleteTask, useSetCompleted, useUndo } from "../api/mutations";
import { useSettings, useTasks } from "../api/queries";
import type { Settings, Task } from "../api/schemas";
import { BrisaContext, type BrisaContextValue } from "../state/BrisaContext";
import { brisaMessage } from "../state/errors";
import { useFocusDate } from "../state/useFocusDate";
import { useToday } from "../state/useToday";
import { strings } from "../strings";
import { SearchPanel } from "./SearchPanel";
import { TaskEditor, type EditorTarget } from "./TaskEditor";
import { UndoBar, type BarInput, type BarMessage } from "./UndoBar";

type BrisaFrameProps = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
};

/**
 * Marco común de las pantallas de Brisa: carga los datos (con carga, error y «Reintentar»), muestra la cabecera con la
 * búsqueda, el botón flotante «Nueva tarea», el editor y el aviso «Deshacer». Las pantallas leen todo con `useBrisa()`.
 */
export function BrisaFrame({ title, description, children }: BrisaFrameProps) {
  const settings = useSettings();
  const tasks = useTasks();

  const retry = () => {
    void settings.refetch();
    void tasks.refetch();
  };

  let body: ReactNode;
  if (settings.isError || tasks.isError) {
    body = (
      <StateView
        status="error"
        title={strings.states.errorTitle}
        description={strings.states.errorDescription}
        action={<Button onClick={retry}>{strings.states.retry}</Button>}
      />
    );
  } else if (!settings.data || !tasks.data) {
    body = <StateView status="loading" title={strings.states.loading} />;
  } else {
    return (
      <Ready settings={settings.data} tasks={tasks.data} title={title} description={description}>
        {children}
      </Ready>
    );
  }

  return (
    <section data-module="brisa" className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
      <PageHeader eyebrow={strings.name} title={title} description={description} />
      {body}
    </section>
  );
}

type ReadyProps = BrisaFrameProps & { settings: Settings; tasks: Task[] };

function Ready({ settings, tasks, title, description, children }: ReadyProps) {
  const zone = settings.timeZoneId;
  const today = useToday(zone, settings.today);
  const [focusDate, setFocusDate] = useFocusDate(today);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [bar, setBar] = useState<BarMessage | null>(null);
  const counter = useRef(0);

  const setCompleted = useSetCompleted();
  const deleteTask = useDeleteTask();
  const undo = useUndo();

  const show = useCallback((message: BarInput) => {
    counter.current += 1;
    setBar({ ...message, id: counter.current });
  }, []);
  const dismiss = useCallback(() => setBar(null), []);

  const toggle = useCallback(
    (task: Task) => {
      setCompleted.mutate(
        { id: task.id, completed: !task.completed },
        {
          onSuccess: ({ task: changed, undoId }) => {
            if (!undoId) return;
            show({
              kind: "undo",
              undoId,
              message: changed.completed ? strings.undo.completed : strings.undo.reopened,
            });
          },
          onError: (error) => show({ kind: "error", message: brisaMessage(error) }),
        },
      );
    },
    [setCompleted, show],
  );

  const remove = useCallback(
    (task: Task) => {
      deleteTask.mutate(
        { id: task.id },
        {
          onSuccess: ({ undoId }) =>
            show({ kind: "undo", undoId, message: strings.undo.deleted }),
          onError: (error) => show({ kind: "error", message: brisaMessage(error) }),
        },
      );
    },
    [deleteTask, show],
  );

  const runUndo = useCallback(
    (undoId: string) => {
      undo.mutate(
        { undoId },
        {
          onSuccess: () => show({ kind: "info", message: strings.undo.undone }),
          onError: (error) => show({ kind: "error", message: brisaMessage(error) }),
        },
      );
    },
    [undo, show],
  );

  const openCount = tasks.filter((t) => !t.completed).length;
  const busyIds = useMemo<ReadonlySet<string>>(
    () => new Set(setCompleted.isPending && setCompleted.variables ? [setCompleted.variables.id] : []),
    [setCompleted.isPending, setCompleted.variables],
  );

  const value = useMemo<BrisaContextValue>(
    () => ({
      tasks,
      today,
      zone,
      focusDate,
      setFocusDate,
      createFor: (date) => setEditor({ kind: "create", date }),
      edit: (task) => setEditor({ kind: "edit", task }),
      toggle,
      busyIds,
    }),
    [tasks, today, zone, focusDate, setFocusDate, toggle, busyIds],
  );

  return (
    <BrisaContext.Provider value={value}>
      <section data-module="brisa" className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 pb-28 sm:p-6">
        <PageHeader
          eyebrow={`${strings.name} · ${strings.pending(openCount)}`}
          title={title}
          description={description}
          actions={
            <SearchPanel
              tasks={tasks}
              today={today}
              zone={zone}
              onOpen={(task) => setEditor({ kind: "edit", task })}
            />
          }
        />
        {children}
      </section>

      <button
        type="button"
        onClick={() => setEditor({ kind: "create", date: today })}
        className="fixed right-4 bottom-[calc(var(--shell-bottomnav-height)+1rem)] z-30 inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent shadow-lg hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:right-6 md:bottom-6"
      >
        <Plus aria-hidden="true" className="size-5" />
        {strings.newTask}
      </button>

      {editor ? (
        <TaskEditor
          // Al cambiar de tarea (p. ej. desde la búsqueda) el formulario empieza limpio.
          key={editor.kind === "edit" ? editor.task.id : `new-${editor.date}`}
          target={editor}
          today={today}
          zone={zone}
          onClose={() => setEditor(null)}
          onToggle={toggle}
          onDelete={remove}
        />
      ) : null}

      <UndoBar bar={bar} busy={undo.isPending} onUndo={runUndo} onDismiss={dismiss} />
    </BrisaContext.Provider>
  );
}
