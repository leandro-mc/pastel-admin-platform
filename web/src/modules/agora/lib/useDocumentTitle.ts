import { useEffect } from "react";
import { strings } from "../strings";

/** Título de la pestaña para la pantalla actual; restaura el anterior al salir. */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · ${strings.name}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
