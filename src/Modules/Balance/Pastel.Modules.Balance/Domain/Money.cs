using System.Globalization;
using System.Text.RegularExpressions;
using Pastel.SharedKernel;

namespace Pastel.Modules.Balance.Domain;

/// <summary>
/// Dinero en <b>unidades mínimas enteras</b> (<see cref="Int128"/>): centavos en monedas de 2 decimales, unidades en las de 0.
/// Nunca se usa coma flotante. Los montos viajan como cadena decimal con punto («12.50», «1500») y se guardan en <c>numeric(18,2)</c>.
/// </summary>
internal static partial class Money
{
    /// <summary>Dígitos enteros máximos: lo que admite <c>numeric(18,2)</c> (también en monedas sin decimales).</summary>
    public const int MaxIntegerDigits = 16;

    public static Int128 Pow10(int exponent)
    {
        Int128 result = 1;
        for (var i = 0; i < exponent; i++)
        {
            result *= 10;
        }

        return result;
    }

    /// <summary>Valida y convierte lo que llega por la API (D4): mayor que cero, con a lo sumo los decimales de la moneda y dentro del máximo.</summary>
    public static Result<Int128> Parse(string? text, Currency currency)
    {
        var t = text?.Trim() ?? string.Empty;
        if (t.Length == 0)
        {
            return BalanceErrors.AmountRequired;
        }

        var negative = t[0] == '-';
        var match = AmountPattern().Match(negative ? t[1..] : t);
        if (!match.Success)
        {
            return BalanceErrors.AmountInvalid;
        }

        if (negative)
        {
            return BalanceErrors.AmountNotPositive;
        }

        var integer = match.Groups[1].Value.TrimStart('0');
        var fraction = match.Groups[2].Value;
        if (integer.Length > MaxIntegerDigits)
        {
            return BalanceErrors.AmountTooLarge;
        }

        if (fraction.Length > currency.Decimals)
        {
            return BalanceErrors.AmountTooManyDecimals(currency.Decimals);
        }

        var units = (integer.Length == 0 ? Int128.Zero : Int128.Parse(integer, CultureInfo.InvariantCulture)) * Pow10(currency.Decimals);
        if (currency.Decimals > 0)
        {
            units += Int128.Parse(fraction.PadRight(currency.Decimals, '0'), CultureInfo.InvariantCulture);
        }

        return units <= 0 ? BalanceErrors.AmountNotPositive : units;
    }

    /// <summary>Unidades mínimas → cadena decimal canónica con punto (puede ser negativa: saldos).</summary>
    public static string Format(Int128 units, Currency currency)
    {
        var negative = units < 0;
        var digits = (negative ? -units : units).ToString(CultureInfo.InvariantCulture).PadLeft(currency.Decimals + 1, '0');
        var body = currency.Decimals == 0
            ? digits
            : digits[..^currency.Decimals] + "." + digits[^currency.Decimals..];
        return negative ? "-" + body : body;
    }

    /// <summary>Unidades mínimas → <see cref="decimal"/> exacto para guardar en <c>numeric(18,2)</c>.</summary>
    public static decimal ToDecimal(Int128 units, Currency currency) =>
        (decimal)units / (decimal)Pow10(currency.Decimals);

    /// <summary>
    /// <see cref="decimal"/> guardado → unidades mínimas. Falla si el monto tiene más decimales de los que admite la moneda
    /// (cambio de moneda sin conversión, D8).
    /// </summary>
    public static bool TryFromDecimal(decimal value, Currency currency, out Int128 units)
    {
        var scaled = value * (decimal)Pow10(currency.Decimals);
        if (decimal.Truncate(scaled) != scaled)
        {
            units = 0;
            return false;
        }

        units = (Int128)scaled;
        return true;
    }

    public static Int128 FromDecimal(decimal value, Currency currency) =>
        TryFromDecimal(value, currency, out var units)
            ? units
            : throw new BalanceInvariantException($"El monto {value} no es válido en {currency.Code}.");

    [GeneratedRegex("^([0-9]+)(?:\\.([0-9]+))?$", RegexOptions.CultureInvariant)]
    private static partial Regex AmountPattern();
}
