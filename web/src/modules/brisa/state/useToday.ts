import { useEffect, useState } from "react";
import { todayInZone } from "../domain/dates";

const CHECK_MS = 15_000;

/** «Hoy» en la zona; si el navegador no reconoce la zona, se usa el «hoy» que calculó el servidor. */
function safeToday(zone: string, fallback: string): string {
  try {
    return todayInZone(zone);
  } catch {
    return fallback;
  }
}

/**
 * «Hoy» en la zona de la persona (nunca la del navegador). Se vuelve a calcular cada pocos segundos y al volver a la
 * pestaña, así que al pasar la medianoche con la pantalla abierta todo se reubica solo, sin recargar y sin escribir nada
 * (AC1, inventario §13.1).
 */
export function useToday(zone: string, fallback: string): string {
  const [today, setToday] = useState(() => safeToday(zone, fallback));

  useEffect(() => {
    const refresh = () => setToday(safeToday(zone, fallback));
    refresh();
    const timer = window.setInterval(refresh, CHECK_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [zone, fallback]);

  return today;
}
