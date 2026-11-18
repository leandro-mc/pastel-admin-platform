import { z } from "zod";

/** Contratos de `/api/brisa/*`. Los nombres de campo no cambian respecto de la API. */
export const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  notes: z.string(),
  /** Día que eligió la persona. Nunca se reescribe. */
  scheduledDate: z.string(),
  dueDate: z.string().nullable(),
  /** Día efectivo calculado por el servidor al responder; el cliente lo recalcula con la misma regla. */
  effectiveDate: z.string(),
  priority: prioritySchema,
  colorHex: z.string(),
  completed: z.boolean(),
  completedAt: z.string().nullable(),
  isOverdue: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  /** Versión para detectar ediciones simultáneas (409). */
  version: z.string(),
});

export const tasksPageSchema = z.object({
  items: z.array(taskSchema),
  page: z.number(),
  pageSize: z.number(),
  totalCount: z.number(),
});

export const taskChangeSchema = z.object({
  task: taskSchema,
  undoId: z.string().nullable(),
});

export const taskDeletedSchema = z.object({
  taskId: z.string(),
  undoId: z.string(),
});

export const settingsSchema = z.object({
  timeZoneId: z.string(),
  today: z.string(),
});

const importIssueSchema = z.object({
  row: z.number().nullable(),
  field: z.string().nullable(),
  message: z.string(),
});

export const importReportSchema = z.object({
  /** Falso si el archivo tiene algún error: no se crea nada (todo o nada). */
  accepted: z.boolean(),
  dryRun: z.boolean(),
  batchId: z.string().nullable(),
  totals: z.object({
    records: z.number(),
    open: z.number(),
    done: z.number(),
    withDeadline: z.number(),
    from: z.string().nullable(),
    to: z.string().nullable(),
  }),
  /** Tareas que se crearían (vista previa) o que se crearon. */
  toCreate: z.number(),
  alreadyExisting: z.number(),
  withDifferences: z.number(),
  existingDeleted: z.number(),
  errors: z.array(importIssueSchema),
  warnings: z.array(importIssueSchema),
  skipped: z.array(importIssueSchema),
});

export const importBatchSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  taskCount: z.number(),
  revertedAt: z.string().nullable(),
});

export const revertResultSchema = z.object({
  reverted: z.number(),
  kept: z.number(),
});

export type ImportReport = z.infer<typeof importReportSchema>;
export type ImportBatch = z.infer<typeof importBatchSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type { Priority } from "../domain/dates";

/** Lo que la persona edita de una tarea. */
export type TaskInput = {
  title: string;
  notes: string;
  scheduledDate: string;
  dueDate: string | null;
  priority: z.infer<typeof prioritySchema>;
  colorHex: string;
};
