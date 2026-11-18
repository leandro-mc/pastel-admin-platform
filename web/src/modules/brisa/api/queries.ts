import { useQuery } from "@tanstack/react-query";
import { api } from "@/core/api";
import { brisaKeys, toQuery } from "./keys";
import { z } from "zod";
import { importBatchSchema, settingsSchema, tasksPageSchema, type Task } from "./schemas";

const PAGE_SIZE = 100;

/**
 * Todas las tareas propias no eliminadas. La API pagina (máximo 100); se recorren las páginas porque las pantallas
 * (Vencidas, Fechas límite, búsqueda) necesitan el conjunto completo y la regla del día efectivo se calcula aquí.
 */
async function fetchAllTasks(signal: AbortSignal): Promise<Task[]> {
  const all: Task[] = [];
  let page = 1;
  let more = true;
  while (more) {
    const result = await api.get(
      `/api/brisa/tasks${toQuery({ page, pageSize: PAGE_SIZE })}`,
      tasksPageSchema,
      { signal },
    );
    all.push(...result.items);
    more = result.items.length > 0 && all.length < result.totalCount;
    page += 1;
  }
  return all;
}

export function useTasks() {
  return useQuery({
    queryKey: brisaKeys.tasks,
    queryFn: ({ signal }) => fetchAllTasks(signal),
  });
}

/** Zona horaria de la persona y su «hoy» en esa zona. */
export function useSettings() {
  return useQuery({
    queryKey: brisaKeys.settings,
    queryFn: ({ signal }) =>
      api.get("/api/brisa/settings", settingsSchema, { signal }),
  });
}

/** Últimos lotes de importación de la persona (para poder revertirlos). */
export function useImportBatches() {
  return useQuery({
    queryKey: brisaKeys.imports,
    queryFn: ({ signal }) =>
      api.get("/api/brisa/import", z.array(importBatchSchema), { signal }),
  });
}
