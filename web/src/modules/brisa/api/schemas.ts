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
