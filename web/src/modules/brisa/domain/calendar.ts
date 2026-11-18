import { addDays } from "./dates";

/**
 * Calendario y formato de fechas de Brisa (inventario §13.8). Los nombres se escriben aquí (no con `Intl`) para que el
 * texto sea idéntico en cualquier navegador: «Sábado 17 de octubre», «17 oct», «Octubre 2026», «LUN».
 */

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
] as const;
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const;
const WEEKDAYS_UPPER = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"] as const;

/** Encabezado de la cuadrícula del mes, de lunes a domingo. */
export const MONTH_HEADERS = ["L", "M", "X", "J", "V", "S", "D"] as const;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const parts = (date: string) => {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  return { year, month, day };
};
const dayOfWeek = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

/** Posición en la semana con el lunes primero (0 = lunes … 6 = domingo). */
export const mondayIndex = (date: string) => (dayOfWeek(date) + 6) % 7;

/** Lunes de la semana de la fecha. */
export const weekStart = (date: string) => addDays(date, -mondayIndex(date));

/** Los siete días (lunes a domingo) de la semana de la fecha. */
export const weekDates = (date: string): string[] => {
  const start = weekStart(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

/** Primer día del mes que está `delta` meses de distancia de la fecha. */
export function shiftMonth(date: string, delta: number): string {
  const { year, month } = parts(date);
  const index = year * 12 + (month - 1) + delta;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-01`;
}

export type MonthCell = { date: string; inMonth: boolean };

/** Cuadrícula del mes: semanas completas de lunes a domingo, con los días vecinos marcados como fuera del mes. */
export function monthGrid(date: string): MonthCell[][] {
  const first = `${date.slice(0, 7)}-01`;
  const monthKey = date.slice(0, 7);
  const start = weekStart(first);
  const rows: MonthCell[][] = [];
  for (let cursor = start; ; cursor = addDays(cursor, 7)) {
    const row = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(cursor, i);
      return { date: d, inMonth: d.startsWith(monthKey) };
    });
    if (rows.length > 0 && !row.some((cell) => cell.inMonth)) break;
    rows.push(row);
  }
  return rows;
}

/** «Sábado 17 de octubre». */
export function formatLong(date: string): string {
  const { month, day } = parts(date);
  return `${capitalize(WEEKDAYS[dayOfWeek(date)]!)} ${day} de ${MONTHS[month - 1]!}`;
}

/** «sábado 17 de octubre», para frases («Crear tarea para el sábado 17 de octubre»). */
export function formatLongInline(date: string): string {
  const { month, day } = parts(date);
  return `${WEEKDAYS[dayOfWeek(date)]!} ${day} de ${MONTHS[month - 1]!}`;
}

/** «17 oct». */
export function formatShort(date: string): string {
  const { month, day } = parts(date);
  return `${day} ${MONTHS_SHORT[month - 1]!}`;
}

/** «Octubre 2026». */
export function formatMonthYear(date: string): string {
  const { year, month } = parts(date);
  return `${capitalize(MONTHS[month - 1]!)} ${year}`;
}

/** «LUN». */
export const formatWeekdayShort = (date: string) => WEEKDAYS_UPPER[dayOfWeek(date)]!;

/** «12 oct – 18 oct». */
export const formatRange = (from: string, to: string) =>
  `${formatShort(from)} – ${formatShort(to)}`;
