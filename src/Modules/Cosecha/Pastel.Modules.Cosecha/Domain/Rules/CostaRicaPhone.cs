namespace Pastel.Modules.Cosecha.Domain.Rules;

/// <summary>Teléfonos de Costa Rica: 8 dígitos. Acepta espacios, guiones, paréntesis y el prefijo +506 y los guarda sin adornos.</summary>
internal static class CostaRicaPhone
{
    private const string CountryCode = "506";

    public static bool TryNormalize(string? raw, out string normalized)
    {
        normalized = string.Empty;
        if (string.IsNullOrWhiteSpace(raw))
        {
            return false;
        }

        var digits = new List<char>(raw.Length);
        foreach (var ch in raw)
        {
            if (char.IsAsciiDigit(ch))
            {
                digits.Add(ch);
            }
            else if (ch is not (' ' or '-' or '(' or ')' or '+' or '.'))
            {
                return false;
            }
        }

        var text = new string(digits.ToArray());
        if (text.Length == 11 && text.StartsWith(CountryCode, StringComparison.Ordinal))
        {
            text = text[CountryCode.Length..];
        }

        if (text.Length != 8)
        {
            return false;
        }

        normalized = text;
        return true;
    }
}
