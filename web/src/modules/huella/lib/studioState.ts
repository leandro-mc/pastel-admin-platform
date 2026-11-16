import { useSearchParams } from "react-router";

export type StudioTab = "ofertas" | "generar" | "documentos";
const tabs: readonly StudioTab[] = ["ofertas", "generar", "documentos"];

/**
 * Qué está viendo la persona en «Crear CV», guardado en la dirección (`?oferta=…&vista=…&doc=…`): se puede volver con el
 * botón atrás, recargar sin perder el lugar y llegar desde el historial directo a los documentos de una oferta.
 */
export function useStudioState() {
  const [params, setParams] = useSearchParams();
  const offerId = params.get("oferta");
  const docId = params.get("doc");
  const requested = params.get("vista");
  const tab: StudioTab = tabs.find((t) => t === requested) ?? "ofertas";

  const go = (patch: {
    oferta?: string | null;
    vista?: StudioTab;
    doc?: string | null;
  }) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === undefined) next.delete(key);
        else next.set(key, value);
      }
      return next;
    });

  return { offerId, docId, tab, go };
}
