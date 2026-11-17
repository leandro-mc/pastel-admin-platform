const TZ = "America/Costa_Rica";

const kgFormat = new Intl.NumberFormat("es-CR", { maximumFractionDigits: 2 });
const crcFormat = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 2,
});

const EMPTY = "—";

/** Kilos con separador de miles y coma decimal (es-CR). */
export function formatKg(value: number | null | undefined): string {
  return value == null ? EMPTY : `${kgFormat.format(value)} kg`;
}

export function formatNumber(value: number | null | undefined): string {
  return value == null ? EMPTY : kgFormat.format(value);
}

/** Colones (₡). */
export function formatCrc(value: number | null | undefined): string {
  return value == null ? EMPTY : crcFormat.format(value);
}

/** Fecha `aaaa-mm-dd` del servidor a `dd/mm/aaaa`, sin pasar por `Date` para no mover el día por la zona horaria. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return EMPTY;
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return EMPTY;
  return new Date(iso).toLocaleString("es-CR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: TZ,
  });
}

/** Número escrito por la persona: acepta «1 234,5» y «1234.5». Devuelve `null` si no es un número. */
export function parseDecimal(text: string): number | null {
  const compact = text.replace(/\s/g, "");
  if (compact === "") return null;
  const normalized = compact.includes(",")
    ? compact.replace(/\./g, "").replace(",", ".")
    : compact;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Número para mostrar dentro de un campo de texto (coma decimal, sin separador de miles). */
export function toFieldText(value: number | null | undefined): string {
  return value == null ? "" : String(value).replace(".", ",");
}

/** Fecha de hoy en Costa Rica como `aaaa-mm-dd`. */
export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

/** Próximo jueves (hoy si ya es jueves): fecha sugerida para un envío nuevo. */
export function nextThursdayIso(): string {
  const [year, month, day] = todayIso().split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  const THURSDAY = 4;
  const days = (THURSDAY - date.getUTCDay() + 7) % 7;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Enlace de WhatsApp (`wa.me`) para un teléfono ya normalizado de 8 dígitos de Costa Rica. */
export function whatsAppLink(phone: string, message: string): string {
  return `https://wa.me/506${phone}?text=${encodeURIComponent(message)}`;
}
