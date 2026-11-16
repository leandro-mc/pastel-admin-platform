/**
 * Dinero en el cliente. Los montos son siempre cadenas decimales con punto («12.50», «1500»): nunca se pasa por `number`,
 * así que no hay coma flotante. El servidor es quien reparte y liquida; aquí solo se valida lo que se escribe y se da formato.
 */

export type CurrencyInfo = { code: string; symbol: string; decimals: number };

export const MAX_INTEGER_DIGITS = 16;

export type ParsedAmount =
  | { ok: true; value: string }
  | { ok: false; code: AmountErrorCode };

export type AmountErrorCode =
  | "required"
  | "invalid"
  | "not_positive"
  | "too_large"
  | "too_many_decimals";

/**
 * Valida lo que escribe la persona (D4). Acepta punto o una sola coma como separador decimal («12.50», «12,50»);
 * rechaza separadores de miles, ceros, negativos y más decimales de los que admite la moneda. Devuelve la forma canónica con punto.
 */
export function parseAmount(text: string, decimals: number): ParsedAmount {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: false, code: "required" };
  const negative = trimmed.startsWith("-");
  const body = negative ? trimmed.slice(1) : trimmed;
  const match = /^([0-9]+)(?:[.,]([0-9]+))?$/.exec(body);
  if (!match) return { ok: false, code: "invalid" };
  if (negative) return { ok: false, code: "not_positive" };
  const integer = (match[1] ?? "").replace(/^0+/, "");
  const fraction = match[2] ?? "";
  if (integer.length > MAX_INTEGER_DIGITS) return { ok: false, code: "too_large" };
  if (fraction.length > decimals) return { ok: false, code: "too_many_decimals" };
  if (/^0*$/.test(integer + fraction)) return { ok: false, code: "not_positive" };
  const padded = fraction.padEnd(decimals, "0");
  return { ok: true, value: (integer || "0") + (decimals > 0 ? "." + padded : "") };
}

const THIN_SPACE = "\u202f";
const MINUS = "\u2212";

export type FormatOptions = {
  /** Muestra «+» en positivos y «−» en negativos (el signo nunca depende solo del color). */
  sign?: boolean;
  /** Agrega el código de la moneda al final: «+$66,66 USD». */
  code?: boolean;
};

/** Cadena decimal con punto → texto es-CR: miles con espacio fino, coma decimal, símbolo y signo explícito. */
export function formatAmount(
  value: string,
  currency: CurrencyInfo,
  options: FormatOptions = {},
): string {
  const negative = value.startsWith("-");
  const [integerPart = "0", fractionPart = ""] = (negative ? value.slice(1) : value).split(".");
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, THIN_SPACE);
  const number = currency.decimals > 0 ? `${grouped},${fractionPart.padEnd(currency.decimals, "0")}` : grouped;
  const isZero = /^[0.]*$/.test(value.replace("-", ""));
  const prefix = isZero ? "" : negative ? MINUS : options.sign ? "+" : "";
  return `${prefix}${currency.symbol}${number}${options.code ? ` ${currency.code}` : ""}`;
}

/** Signo del saldo: positivo (le deben), negativo (debe) o cero. */
export function balanceSign(value: string): "credit" | "debit" | "zero" {
  if (/^-?[0.]*$/.test(value)) return "zero";
  return value.startsWith("-") ? "debit" : "credit";
}
