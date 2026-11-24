import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { syncPair } from "../api/hooks";
import type { CvVersion } from "../api/schemas";
import { strings } from "../strings";
import { useAiJob } from "./useAiJob";

const t = strings.studio.editor.pair;

/** Nombre del idioma en palabras («inglés»); un código desconocido se muestra tal cual. */
export const languageName = (code: string) => t.languages[code] ?? code;

/**
 * Mantiene al día las dos versiones (español e inglés) que se generaron juntas. `after(guardada)` se llama tras guardar un
 * cambio: si la pareja quedó con cambios pendientes, la IA la actualiza sola (ventana de progreso, con reintento si falla).
 * `run(pareja)` hace lo mismo a pedido (botón «Actualizar con IA» de una versión desactualizada). `dialog` hay que pintarlo.
 */
export function usePairSync() {
  const job = useAiJob();
  const client = useQueryClient();
  const start = job.start;

  const run = useCallback(
    (twin: { id: string; language: string; name: string }) =>
      start(t.title(languageName(twin.language)), [{ label: t.step(twin.name), run: () => syncPair(twin.id) }]).finally(() => {
        // Cada versión abierta se vuelve a pedir: la otra ya cambió y esta dejó de estar pendiente.
        void client.invalidateQueries({ queryKey: ["huella", "version"] });
      }),
    [client, start],
  );

  const after = useCallback(
    (saved: CvVersion) => {
      const pair = saved.pair;
      if (pair?.twinPending) void run({ id: pair.twinId, language: pair.twinLanguage, name: pair.twinName });
    },
    [run],
  );

  return { run, after, running: job.running, dialog: job.dialog };
}
