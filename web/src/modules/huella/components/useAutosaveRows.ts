import { useCallback, useEffect, useRef, useState } from "react";
import { fieldError } from "./Form";

export type Row = { key: string; id?: string };
export type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

const DEFAULT_DELAY_MS = 800;

type Options<S extends { id: string }, R extends Row> = {
  /** Elementos que ya están en el servidor (solo se leen al montar). */
  source: readonly S[];
  toRow: (item: S) => R;
  toPayload: (row: R) => unknown;
  /** Una fila nueva solo se guarda cuando está completa; una que ya existe se envía siempre. */
  isReady: (row: R) => boolean;
  /** Guarda la lista completa y devuelve la lista del servidor, en el mismo orden enviado. */
  save: (items: unknown[]) => Promise<readonly { id: string }[]>;
  delayMs?: number;
};

/**
 * Autoguardado de una lista que el servidor reemplaza completa. Cada cambio programa un guardado (con espera corta para
 * no enviar a cada tecla); borrar guarda al instante. Nunca hay dos guardados a la vez: si se edita mientras uno está en
 * curso, se encadena otro. Al terminar, las filas nuevas reciben el identificador que les dio el servidor (el orden se
 * conserva), así un segundo guardado las actualiza en vez de duplicarlas. Al salir de la pantalla se guarda lo pendiente.
 */
export function useAutosaveRows<S extends { id: string }, R extends Row>({
  source,
  toRow,
  toPayload,
  isReady,
  save,
  delayMs = DEFAULT_DELAY_MS,
}: Options<S, R>) {
  const [rows, setRows] = useState<R[]>(() => source.map(toRow));
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<unknown>(null);

  const rowsRef = useRef(rows);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const queued = useRef(false);
  const submittedKeys = useRef<string[]>([]);
  const lastJson = useRef(
    JSON.stringify(rows.filter((r) => r.id).map(toPayload)),
  );
  const latest = useRef({ toPayload, isReady, save });
  useEffect(() => {
    latest.current = { toPayload, isReady, save };
  });

  const commit = useCallback((change: (current: R[]) => R[]) => {
    rowsRef.current = change(rowsRef.current);
    setRows(rowsRef.current);
  }, []);

  const run = useCallback(async function runOnce(): Promise<void> {
    if (inFlight.current) {
      queued.current = true;
      return;
    }
    const { toPayload: payloadOf, isReady: ready, save: persist } =
      latest.current;
    const submitted = rowsRef.current.filter((r) => r.id || ready(r));
    const payload = submitted.map(payloadOf);
    if (JSON.stringify(payload) === lastJson.current) {
      setState("idle");
      return;
    }

    inFlight.current = true;
    submittedKeys.current = submitted.map((r) => r.key);
    setState("saving");
    setError(null);
    try {
      const result = await persist(payload);
      const idByKey = new Map<string, string>();
      submitted.forEach((r, i) => {
        const id = result[i]?.id;
        if (id) idByKey.set(r.key, id);
      });
      commit((current) =>
        current.map((r) =>
          !r.id && idByKey.has(r.key) ? { ...r, id: idByKey.get(r.key) } : r,
        ),
      );
      lastJson.current = JSON.stringify(
        submitted.map((r) =>
          payloadOf({ ...r, id: r.id ?? idByKey.get(r.key) }),
        ),
      );
      setState("saved");
    } catch (failure) {
      setError(failure);
      setState("error");
    } finally {
      inFlight.current = false;
      if (queued.current) {
        queued.current = false;
        void runOnce();
      }
    }
  }, [commit]);

  const schedule = useCallback(
    (wait: number) => {
      if (timer.current) clearTimeout(timer.current);
      setState("pending");
      timer.current = setTimeout(() => {
        timer.current = null;
        void run();
      }, wait);
    },
    [run],
  );

  // Lo pendiente no se pierde al cambiar de pestaña o de página.
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
        void run();
      }
    },
    [run],
  );

  // Aviso del navegador solo mientras haya algo sin confirmar.
  const busy = state === "pending" || state === "saving";
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const update = (key: string, patch: Partial<R>) => {
    commit((current) =>
      current.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
    schedule(delayMs);
  };
  const add = (...added: R[]) => {
    commit((current) => [...current, ...added]);
    schedule(delayMs);
  };
  const remove = (key: string) => {
    commit((current) => current.filter((r) => r.key !== key));
    schedule(0);
  };

  /** Error de un campo de una fila (el servidor numera según lo enviado, que omite las filas nuevas incompletas). */
  const errorOf = (key: string, field: string) => {
    const index = submittedKeys.current.indexOf(key);
    return index < 0 ? undefined : fieldError(error, `items[${index}].${field}`);
  };

  return { rows, update, add, remove, state, error, errorOf, isReady };
}
