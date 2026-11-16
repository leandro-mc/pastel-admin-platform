import { useCurrencies } from "../api/queries";
import { balanceSign, formatAmount, type CurrencyInfo } from "../lib/money";
import { strings } from "../strings";

/** Moneda del grupo con su símbolo y decimales; mientras carga el catálogo usa el código como símbolo. */
export function useCurrencyInfo(code: string): CurrencyInfo {
  const currencies = useCurrencies();
  const found = currencies.data?.find((currency) => currency.code === code);
  return found
    ? { code: found.code, symbol: found.symbol, decimals: found.decimals }
    : { code, symbol: code, decimals: 2 };
}

/** Monto formateado. El signo se escribe, nunca depende solo del color. */
export function Amount({
  value,
  code,
  sign = false,
  withCode = false,
}: {
  value: string;
  code: string;
  sign?: boolean;
  withCode?: boolean;
}) {
  const currency = useCurrencyInfo(code);
  return <span className="whitespace-nowrap tabular-nums">{formatAmount(value, currency, { sign, code: withCode })}</span>;
}

/** «Le deben ₡10,00», «Debe ₡5,00» o «Está al día»: texto explícito, con color como refuerzo. */
export function BalanceText({ value, code }: { value: string; code: string }) {
  const currency = useCurrencyInfo(code);
  const kind = balanceSign(value);
  const absolute = value.startsWith("-") ? value.slice(1) : value;
  if (kind === "zero") return <span className="font-medium text-fg">{strings.balance.even}</span>;
  return (
    <span className={`font-semibold ${kind === "credit" ? "text-accent-strong" : "text-danger"}`}>
      {kind === "credit" ? strings.balance.credit : strings.balance.debit}{" "}
      <span className="whitespace-nowrap tabular-nums">{formatAmount(absolute, currency)}</span>
    </span>
  );
}
