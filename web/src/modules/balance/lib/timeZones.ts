export const DEFAULT_ZONE = "America/Costa_Rica";

/** Zonas IANA que ofrece el navegador; el servidor valida la elegida. */
export function timeZones(current?: string): string[] {
  const all = "supportedValuesOf" in Intl ? Intl.supportedValuesOf("timeZone") : [];
  const zones = all.filter((zone) => zone.includes("/"));
  const wanted = [DEFAULT_ZONE, current].filter((zone): zone is string => Boolean(zone));
  return [...new Set([...wanted, ...zones])];
}

/** Hoy como fecha de calendario `yyyy-MM-dd` en la zona del navegador. */
export function todayLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
