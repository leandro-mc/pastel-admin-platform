import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "@/core/api";
import { brisaKeys } from "./keys";
import {
  importReportSchema,
  revertResultSchema,
  settingsSchema,
  taskChangeSchema,
  taskDeletedSchema,
  taskSchema,
  type Task,
  type TaskInput,
} from "./schemas";

/** Reemplaza (o agrega) una tarea en la caché de la lista sin volver a pedirla toda. */
function upsertTask(client: QueryClient, task: Task) {
  client.setQueryData<Task[]>(brisaKeys.tasks, (current) => {
    if (!current) return [task];
    return current.some((t) => t.id === task.id)
      ? current.map((t) => (t.id === task.id ? task : t))
      : [...current, task];
  });
}

function removeTask(client: QueryClient, id: string) {
  client.setQueryData<Task[]>(brisaKeys.tasks, (current) =>
    current?.filter((t) => t.id !== id),
  );
}

const body = (input: TaskInput) => ({ ...input, dueDate: input.dueDate ?? "" });

/** Alta: crea la tarea. Con solo el título basta; el resto toma valores por defecto en el servidor. */
export function useCreateTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) =>
      api.post("/api/brisa/tasks", taskSchema, body(input)),
    onSuccess: (task) => upsertTask(client, task),
  });
}

/** Modificación con control de versión: si la tarea cambió mientras se editaba, el servidor responde 409. */
export function useUpdateTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      version,
      input,
    }: {
      id: string;
      version: string;
      input: TaskInput;
    }) =>
      api.put(`/api/brisa/tasks/${id}`, taskSchema, { ...body(input), version }),
    onSuccess: (task) => upsertTask(client, task),
    onError: () => client.invalidateQueries({ queryKey: brisaKeys.tasks }),
  });
}

/** Marca o reabre. Devuelve la tarea y, si hubo cambio, el identificador para «Deshacer». */
export function useSetCompleted() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      api.put(`/api/brisa/tasks/${id}/completed`, taskChangeSchema, {
        completed,
      }),
    onSuccess: ({ task }) => upsertTask(client, task),
    onError: () => client.invalidateQueries({ queryKey: brisaKeys.tasks }),
  });
}

/** Eliminación lógica: la tarea deja de verse y se puede restaurar con «Deshacer». */
export function useDeleteTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      api.post(`/api/brisa/tasks/${id}/delete`, taskDeletedSchema),
    onSuccess: ({ taskId }) => removeTask(client, taskId),
  });
}

/** «Deshacer» seguro: devuelve la tarea restaurada. Si cambió después, el servidor responde 409. */
export function useUndo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ undoId }: { undoId: string }) =>
      api.post(`/api/brisa/undo/${undoId}`, taskSchema),
    onSuccess: (task) => upsertTask(client, task),
    onError: () => client.invalidateQueries({ queryKey: brisaKeys.tasks }),
  });
}

export function useUpdateSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (timeZoneId: string) =>
      api.put("/api/brisa/settings", settingsSchema, { timeZoneId }),
    onSuccess: (settings) => client.setQueryData(brisaKeys.settings, settings),
  });
}

/** Importa un archivo. Con `dryRun` solo devuelve la vista previa; no escribe nada. */
export function useImport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ content, dryRun }: { content: string; dryRun: boolean }) =>
      api.post("/api/brisa/import", importReportSchema, { content, dryRun }),
    onSuccess: (report) => {
      if (report.dryRun || !report.accepted) return;
      void client.invalidateQueries({ queryKey: brisaKeys.tasks });
      void client.invalidateQueries({ queryKey: brisaKeys.imports });
    },
  });
}

/** Revierte un lote: quita lo importado que no se editó después. */
export function useRevertImport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId }: { batchId: string }) =>
      api.post(`/api/brisa/import/${batchId}/revert`, revertResultSchema),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: brisaKeys.tasks });
      void client.invalidateQueries({ queryKey: brisaKeys.imports });
    },
  });
}
