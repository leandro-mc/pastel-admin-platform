import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBlocker } from "react-router";
import type { CvDocument } from "../api/schemas";
import { fingerprintOf, toDraft, type Draft } from "./cvDraft";

/**
 * Borrador de la edición libre de un CV. Vive en el editor (no en la pestaña) para que cambiar de pestaña no lo pierda.
 *  - `dirty`: hay cambios sin guardar (el contenido difiere del documento guardado).
 *  - Si el CV cambia en el servidor (se guardó, o se volvió a redactar con IA) y no hay cambios propios, el borrador se
 *    recarga solo; si los hay, se respetan.
 *  - Con cambios sin guardar avisa antes de cerrar la pestaña del navegador y bloquea salir de la pantalla (`blocker`).
 */
export function useCvDraft(document: CvDocument) {
  const saved = useMemo(() => fingerprintOf(toDraft(document)), [document]);
  const [draft, setDraftState] = useState<Draft>(() => toDraft(document));
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const lastSaved = useRef(saved);

  useEffect(() => {
    if (lastSaved.current === saved) return;
    const clean = fingerprintOf(draftRef.current) === lastSaved.current;
    lastSaved.current = saved;
    if (clean) setDraftState(toDraft(document));
  }, [saved, document]);

  const dirty = useMemo(() => fingerprintOf(draft) !== saved, [draft, saved]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const blocker = useBlocker(dirty);

  /** Reemplaza el borrador (tras guardar o descartar). */
  const reset = useCallback((next: CvDocument) => setDraftState(toDraft(next)), []);

  return { draft, setDraft: setDraftState, dirty, reset, blocker };
}
