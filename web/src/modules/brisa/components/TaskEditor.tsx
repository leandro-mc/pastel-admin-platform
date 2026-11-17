import { Check, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { isApiError } from "@/core/api";
import { Alert, Button, ConfirmDialog, Dialog, SelectField, TextField } from "@/core/ui";
import { focusClass, inputClass, labelClass } from "@/core/ui/styles";
import { useCreateTask, useUpdateTask } from "../api/mutations";
import type { Task, TaskInput } from "../api/schemas";
import { effectiveDate, NOTES_MAX, TITLE_MAX, validateTask, type Priority, type TaskField } from "../domain/dates";
import { brisaMessage } from "../state/errors";
import { priorityNames, strings, taskPalette } from "../strings";

export type EditorTarget =
  | { kind: "create"; date: string }
  | { kind: "edit"; task: Task };

type TaskEditorProps = {
  target: EditorTarget;
  today: string;
  zone: string;
  onClose: () => void;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
};

/** Qué campo del formulario corresponde a cada código de error del servidor. */
const FIELD_BY_CODE: Record<string, TaskField> = {
  "brisa.task.title_required": "title",
  "brisa.task.title_too_long": "title",
  "brisa.task.notes_too_long": "notes",
  "brisa.task.date_invalid": "scheduledDate",
  "brisa.task.due_invalid": "dueDate",
  "brisa.task.day_after_deadline": "dueDate",
  "brisa.task.color_invalid": "colorHex",
};

const priorities: Priority[] = ["LOW", "MEDIUM", "HIGH"];
/** Desde cuántos caracteres del título se muestra el contador. */
const TITLE_WARN_AT = 120;

const randomColor = () =>
  taskPalette[Math.floor(Math.random() * taskPalette.length)]?.hex ?? "#DDE8D5";

/**
 * Editor de tarea (crear y modificar). Foco en el título; «Enter» guarda; pide confirmación al cerrar solo si hay texto
 * escrito (en una nueva: título o notas; en una existente: distintos de lo guardado). En «Día asignado» muestra el día
 * efectivo, pero `ScheduledDate` solo se envía si la persona lo cambia (inventario §13.1, §13.6).
 */
export function TaskEditor({ target, today, zone, onClose, onToggle, onDelete }: TaskEditorProps) {
  const task = target.kind === "edit" ? target.task : null;
  const create = useCreateTask();
  const update = useUpdateTask();
  const pending = create.isPending || update.isPending;

  const [title, setTitle] = useState(task?.title ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [day, setDay] = useState(
    target.kind === "edit" ? effectiveDate(target.task, today, zone) : target.date,
  );
  const [dayTouched, setDayTouched] = useState(false);
  const [due, setDue] = useState<string | null>(task?.dueDate ?? null);
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "MEDIUM");
  const [color, setColor] = useState(task?.colorHex ?? randomColor());
  const [errors, setErrors] = useState<Partial<Record<TaskField, string>>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"discard" | "delete" | null>(null);

  const titleId = useId();
  const notesId = useId();
  const titleRef = useRef<HTMLInputElement>(null);

  // Al abrir, el cursor queda en el título (el diálogo enfoca primero su contenedor).
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => titleRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const hasText = task
    ? title !== task.title || notes !== task.notes
    : title.trim() !== "" || notes.trim() !== "";

  // Día que se compara con la fecha límite: el elegido o, si no se tocó, el guardado (no el efectivo).
  const comparedDay = task && !dayTouched ? task.scheduledDate : day;

  const requestClose = () => {
    if (pending) return;
    if (hasText) setConfirm("discard");
    else onClose();
  };

  const fail = (error: unknown) => {
    const message = brisaMessage(error);
    const field = isApiError(error) ? FIELD_BY_CODE[error.code] : undefined;
    if (field) {
      setErrors({ [field]: message });
      setGeneral(null);
    } else {
      setGeneral(message);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const check = validateTask({
      title,
      notes,
      scheduledDate: comparedDay,
      dueDate: due,
      colorHex: color,
    });
    if (!check.ok) {
      setErrors({ [check.field]: check.message });
      setGeneral(null);
      return;
    }
    setErrors({});
    setGeneral(null);

    const input: TaskInput = {
      title: title.trim(),
      notes: notes.trim(),
      scheduledDate: comparedDay,
      dueDate: due,
      priority,
      colorHex: color,
    };
    const handlers = { onSuccess: onClose, onError: fail };
    if (task) update.mutate({ id: task.id, version: task.version, input }, handlers);
    else create.mutate(input, handlers);
  };

  const notesLength = notes.trim().length;
  const titleLength = title.trim().length;

  return (
    <>
      <Dialog
        title={task ? strings.editor.titleEdit : strings.editor.titleNew}
        description={task ? strings.editor.subtitleEdit : strings.editor.subtitleNew}
        onClose={requestClose}
        maxWidthClassName="max-w-xl"
      >
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          {general ? <Alert variant="error" message={general} /> : null}

          <TextField
            ref={titleRef}
            id={titleId}
            label={strings.editor.titleLabel}
            placeholder={strings.editor.titlePlaceholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
            hint={
              titleLength >= TITLE_WARN_AT
                ? strings.editor.counter(titleLength, TITLE_MAX)
                : undefined
            }
            autoComplete="off"
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor={notesId} className={labelClass}>
              {strings.editor.notesLabel}
            </label>
            <textarea
              id={notesId}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={strings.editor.notesPlaceholder}
              rows={3}
              aria-invalid={errors.notes ? true : undefined}
              aria-describedby={`${notesId}-count`}
              className={`${inputClass} min-h-24 py-2`}
            />
            <p
              id={`${notesId}-count`}
              className={`text-xs ${errors.notes ? "text-danger" : "text-muted"}`}
            >
              {errors.notes ?? strings.editor.counter(notesLength, NOTES_MAX)}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              type="date"
              label={strings.editor.dayLabel}
              hint={strings.editor.dayHint}
              value={day}
              max={due ?? undefined}
              onChange={(e) => {
                setDay(e.target.value);
                setDayTouched(true);
              }}
              error={errors.scheduledDate}
            />

            <SelectField
              label={strings.editor.priorityLabel}
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              options={priorities.map((p) => ({ value: p, label: priorityNames[p] }))}
            />
          </div>

          {due === null ? (
            <div className="flex flex-col items-start gap-1">
              <Button variant="secondary" onClick={() => setDue(comparedDay)}>
                {strings.editor.dueAdd}
              </Button>
              <p className="text-xs text-muted">{strings.editor.dueHint}</p>
              {errors.dueDate ? (
                <p role="alert" className="text-sm text-danger">
                  {errors.dueDate}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-48 flex-1">
                <TextField
                  type="date"
                  label={strings.editor.dueLabel}
                  value={due}
                  min={comparedDay}
                  onChange={(e) => setDue(e.target.value)}
                  error={errors.dueDate}
                />
              </div>
              <Button variant="ghost" onClick={() => setDue(null)}>
                {strings.editor.dueRemove}
              </Button>
            </div>
          )}

          <fieldset className="flex flex-col gap-2">
            <legend className={labelClass}>{strings.editor.colorLabel}</legend>
            <p className="text-xs text-muted">{strings.editor.colorHint}</p>
            <div className="flex flex-wrap gap-2">
              {taskPalette.map((swatch) => (
                <button
                  key={swatch.hex}
                  type="button"
                  title={swatch.name}
                  aria-label={swatch.name}
                  aria-pressed={color.toLowerCase() === swatch.hex.toLowerCase()}
                  onClick={() => setColor(swatch.hex)}
                  style={{ backgroundColor: swatch.hex }}
                  className={`inline-grid size-11 place-items-center rounded-xl border border-line-strong text-[#26342e] ${focusClass}`}
                >
                  {color.toLowerCase() === swatch.hex.toLowerCase() ? (
                    <Check aria-hidden="true" className="size-5" />
                  ) : null}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap gap-2">
              {task ? (
                <>
                  <Button variant="danger" onClick={() => setConfirm("delete")} disabled={pending}>
                    <Trash2 aria-hidden="true" className="size-4" />
                    {strings.editor.delete}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={pending}
                    onClick={() => {
                      onToggle(task);
                      onClose();
                    }}
                  >
                    {task.completed ? strings.editor.markOpen : strings.editor.markDone}
                  </Button>
                </>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={requestClose} disabled={pending}>
                {strings.editor.cancel}
              </Button>
              <Button type="submit" loading={pending} loadingLabel={strings.editor.saving}>
                {strings.editor.save}
              </Button>
            </div>
          </div>
        </form>
      </Dialog>

      {confirm === "discard" ? (
        <ConfirmDialog
          title={strings.editor.discardTitle}
          message={strings.editor.discardDescription}
          confirmLabel={strings.editor.discardConfirm}
          cancelLabel={strings.editor.discardKeep}
          onConfirm={onClose}
          onClose={() => setConfirm(null)}
        />
      ) : null}
      {confirm === "delete" && task ? (
        <ConfirmDialog
          title={strings.editor.deleteTitle}
          message={strings.editor.deleteDescription}
          confirmLabel={strings.editor.deleteConfirm}
          cancelLabel={strings.editor.deleteKeep}
          onConfirm={() => {
            onDelete(task);
            onClose();
          }}
          onClose={() => setConfirm(null)}
        />
      ) : null}
    </>
  );
}
