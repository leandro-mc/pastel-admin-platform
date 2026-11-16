import { useCallback, useEffect, useRef, useState } from "react";
import type { SaveState } from "./useAutosaveRows";

const DELAY_MS = 800;

/**
 * Autoguardado de un objeto único (p. ej. «Mi historia»). Mismo criterio que `useAutosaveRows`: espera corta, un guardado
 * a la vez (si se edita durante uno, se encadena otro) y guardado de lo pendiente al salir de la pantalla.
 */
export function useAutosaveValue<T>(
  initial: T,
  save: (value: T) => Promise<unknown>,
) {
  const [value, setValue] = useState<T>(initial);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<unknown>(null);
  const valueRef = useRef(value);
  const lastJson = useRef(JSON.stringify(initial));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const queued = useRef(false);
  const persist = useRef(save);
  useEffect(() => {
    persist.current = save;
  });

  const run = useCallback(async function runOnce(): Promise<void> {
    if (inFlight.current) {
      queued.current = true;
      return;
    }
    const sent = valueRef.current;
    const json = JSON.stringify(sent);
    if (json === lastJson.current) {
      setState("idle");
      return;
    }
    inFlight.current = true;
    setState("saving");
    setError(null);
    try {
      await persist.current(sent);
      lastJson.current = json;
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
  }, []);

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

  const busy = state === "pending" || state === "saving";
  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const set = (patch: Partial<T>) => {
    valueRef.current = { ...valueRef.current, ...patch };
    setValue(valueRef.current);
    if (timer.current) clearTimeout(timer.current);
    setState("pending");
    timer.current = setTimeout(() => {
      timer.current = null;
      void run();
    }, DELAY_MS);
  };

  return { value, set, state, error };
}
