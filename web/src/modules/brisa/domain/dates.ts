/**
 * Reglas de fechas de Brisa. Port de `docs/requirements/brisa/prototype/logic.js` (inventario §13.1–§13.4) y espejo de
 * `Domain/TaskRules.cs` del backend: el servidor calcula el día efectivo al responder y esta función lo recalcula en el
 * navegador (p. ej. al pasar la medianoche con la pantalla abierta) sin pedir datos nuevos.
 *
 * Todo son funciones puras. «Hoy» sale SIEMPRE de la zona IANA de la persona, nunca de la del navegador. Las fechas de
 * calendario son cadenas `aaaa-mm-dd`: comparan bien como texto y no tienen zona.
 */

export type Priority = "LOW" | "MEDIUM" | "HIGH";

/** Lo mínimo de una tarea que interviene en la regla del día efectivo. */
export type DatedTask = {
  scheduledDate: string;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
};

export type RankedTask = DatedTask & {
  priority: Priority;
  deletedAt?: string | null;
};

export const TITLE_MAX = 150;
export const NOTES_MAX = 2000;
export const DAY_AFTER_DEADLINE_MESSAGE =
  "El día de la tarea no puede ser después de su fecha límite. Cambia la fecha límite si necesitas más tiempo.";

const RANK: Record<Priority, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
/** Mediodía UTC: a salvo de cualquier cambio de día por huso al operar con fechas de calendario. */
const noon = (date: string) => new Date(`${date}T12:00:00Z`);

/** Fecha de calendario del instante `now` en la zona IANA indicada. Lanza si la zona no existe. */
export function todayInZone(zone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDays(date: string, days: number): string {
  const d = noon(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fmt(d);
}

/** `aaaa-mm-dd` estricto y existente en el calendario (rechaza `2026-02-30`). */
export function isIsoDate(value: string | null | undefined): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) return false;
  const d = noon(value as string);
  return !Number.isNaN(d.getTime()) && fmt(d) === value;
}

/** Día de calendario (en la zona de la persona) de un instante, p. ej. `completedAt`. Nulo si falta o no se entiende. */
export function dateFromInstant(
  value: string | null | undefined,
  zone: string,
): string | null {
  if (!value) return null;
  try {
    return todayInZone(zone, new Date(value));
  } catch {
    return null;
  }
}

/**
 * Día efectivo (§13.1). Abierta: la referencia es hoy. Hecha: el día local de `completedAt`; si no existe, se queda en su
 * día asignado. Sin fecha límite nunca se mueve. Un dato inconsistente (límite anterior al día) se devuelve sin error.
 */
export function effectiveDate(
  task: DatedTask,
  today: string,
  zone: string,
): string {
  const base = task.scheduledDate;
  if (task.completed && !task.completedAt) return base;
  const reference = task.completed
    ? dateFromInstant(task.completedAt, zone)
    : today;
  if (!task.dueDate || reference === null) return base;
  if (base >= reference) return base;
  if (task.dueDate >= reference) return reference;
  return base > task.dueDate ? base : task.dueDate;
}

/**
 * «Vencida» (§13.2, dos criterios): abierta y, con fecha límite, esa fecha ya pasó; sin ella, su día efectivo ya pasó.
 */
export function isOverdue(
  task: DatedTask & { deletedAt?: string | null },
  today: string,
  zone: string,
): boolean {
  if (task.completed || task.deletedAt) return false;
  return task.dueDate
    ? task.dueDate < today
    : effectiveDate(task, today, zone) < today;
}

const byPriorityDesc = (a: RankedTask, b: RankedTask) =>
  (RANK[b.priority] ?? 0) - (RANK[a.priority] ?? 0);

/** Pantalla «Vencidas» (§5.3): orden por (fecha límite o día efectivo) ascendente y prioridad descendente. */
export function overdueTasks<T extends RankedTask>(
  tasks: readonly T[],
  today: string,
  zone: string,
): T[] {
  return tasks
    .filter((t) => isOverdue(t, today, zone))
    .sort(
      (a, b) =>
        (a.dueDate ?? effectiveDate(a, today, zone)).localeCompare(
          b.dueDate ?? effectiveDate(b, today, zone),
        ) || byPriorityDesc(a, b),
    );
}

/** Pantalla «Fechas límite» (§5.3): con fecha límite y no (hecha y ya vencida). Abiertas antes que hechas, límite ↑, prioridad ↓. */
export function deadlineTasks<T extends RankedTask>(
  tasks: readonly T[],
  today: string,
): T[] {
  return tasks
    .filter(
      (t) => !t.deletedAt && t.dueDate && !(t.completed && t.dueDate < today),
    )
    .sort(
      (a, b) =>
        Number(a.completed) - Number(b.completed) ||
        (a.dueDate as string).localeCompare(b.dueDate as string) ||
        byPriorityDesc(a, b),
    );
}

export type TaskField = "title" | "notes" | "scheduledDate" | "dueDate" | "colorHex";

export type TaskValidation =
  | { ok: true }
  | { ok: false; code: string; field: TaskField; message: string };

/**
 * Validación bloqueante al crear y modificar (§13.2 y §13.4). Se compara el día elegido (o el guardado), no el efectivo.
 * Título y notas se cuentan tras recortar; nada se trunca en silencio. El servidor valida lo mismo y es la garantía.
 */
export function validateTask(task: {
  title: string;
  notes: string;
  scheduledDate: string;
  dueDate: string | null;
  colorHex?: string | null;
}): TaskValidation {
  const title = task.title.trim();
  const notes = task.notes.trim();
  if (!title)
    return fail("brisa.task.title_required", "title", "Escribe un título para guardar la tarea.");
  if (title.length > TITLE_MAX)
    return fail("brisa.task.title_too_long", "title", "El título admite hasta 150 caracteres.");
  if (notes.length > NOTES_MAX)
    return fail("brisa.task.notes_too_long", "notes", "Las notas admiten hasta 2000 caracteres.");
  if (!isIsoDate(task.scheduledDate))
    return fail("brisa.task.date_invalid", "scheduledDate", "Elige un día válido.");
  if (task.dueDate && !isIsoDate(task.dueDate))
    return fail("brisa.task.due_invalid", "dueDate", "Elige una fecha límite válida.");
  if (task.dueDate && task.scheduledDate > task.dueDate)
    return fail("brisa.task.day_after_deadline", "dueDate", DAY_AFTER_DEADLINE_MESSAGE);
  if (task.colorHex && !/^#[0-9a-fA-F]{6}$/.test(task.colorHex))
    return fail("brisa.task.color_invalid", "colorHex", "El color debe tener formato #RRGGBB.");
  return { ok: true };
}

function fail(code: string, field: TaskField, message: string): TaskValidation {
  return { ok: false, code, field, message };
}

/** Texto comparable: sin tildes ni mayúsculas. */
export const normalizeText = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/** Búsqueda (§13.6): título y notas, sin distinguir mayúsculas ni tildes, entre las tareas propias no eliminadas. */
export function searchTasks<
  T extends { title: string; notes: string; deletedAt?: string | null },
>(tasks: readonly T[], query: string): T[] {
  const needle = normalizeText(query);
  if (!needle) return [];
  return tasks.filter(
    (t) =>
      !t.deletedAt && normalizeText(`${t.title} ${t.notes}`).includes(needle),
  );
}

/** Singular correcto (§13.8): «1 hecha», «2 hechas». */
export const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;
