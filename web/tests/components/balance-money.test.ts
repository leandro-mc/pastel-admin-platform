import { describe, expect, it } from "vitest";
import { balanceSign, formatAmount, parseAmount } from "../../src/modules/balance/lib/money";

const crc = { code: "CRC", symbol: "₡", decimals: 2 };
const jpy = { code: "JPY", symbol: "¥", decimals: 0 };

describe("Balance: validación de montos (D4)", () => {
  it.each([
    ["12.50", "12.50"],
    ["12,50", "12.50"],
    ["0.01", "0.01"],
    ["1500", "1500.00"],
    ["9999999999999999.99", "9999999999999999.99"],
  ])("acepta %s", (input, canonical) => {
    expect(parseAmount(input, 2)).toEqual({ ok: true, value: canonical });
  });

  it.each([
    ["12.505", "too_many_decimals"],
    ["0", "not_positive"],
    ["0,00", "not_positive"],
    ["-5", "not_positive"],
    ["", "required"],
    ["   ", "required"],
    ["abc", "invalid"],
    ["1.234,50", "invalid"],
    ["10000000000000000", "too_large"],
  ])("rechaza %s sin redondear", (input, code) => {
    expect(parseAmount(input, 2)).toEqual({ ok: false, code });
  });

  it("las monedas sin decimales no admiten decimales", () => {
    expect(parseAmount("1500", 0)).toEqual({ ok: true, value: "1500" });
    expect(parseAmount("1500,5", 0)).toEqual({ ok: false, code: "too_many_decimals" });
  });
});

describe("Balance: formato de montos", () => {
  it("usa coma decimal, espacio fino de miles y símbolo", () => {
    expect(formatAmount("1234567.50", crc)).toBe("₡1\u202f234\u202f567,50");
    expect(formatAmount("1500", jpy)).toBe("¥1\u202f500");
  });

  it("escribe el signo y el código cuando se piden", () => {
    expect(formatAmount("66.66", crc, { sign: true, code: true })).toBe("+₡66,66 CRC");
    expect(formatAmount("-33.33", crc)).toBe("\u2212₡33,33");
    expect(formatAmount("0.00", crc, { sign: true })).toBe("₡0,00");
  });

  it("clasifica el saldo en le deben, debe o al día", () => {
    expect(balanceSign("66.66")).toBe("credit");
    expect(balanceSign("-0.01")).toBe("debit");
    expect(balanceSign("0.00")).toBe("zero");
  });
});
