using System.Globalization;

namespace Pastel.Modules.Balance.Common;

/// <summary>Conversión de la entrada de texto: fechas de calendario <c>yyyy-MM-dd</c> y textos con su longitud.</summary>
internal static class Parsing
{
    public const int DescriptionMin = 4;
    public const int DescriptionMax = 500;
    public const int NameMax = 200;
    public const int GroupDescriptionMax = 500;

    public static bool TryDate(string? text, out DateOnly date) =>
        DateOnly.TryParseExact(text?.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out date);

    public static string DateText(DateOnly date) => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    public static string Truncate(string value, int max) => value.Length <= max ? value : value[..max];

    /// <summary>Escapa los comodines de <c>LIKE</c> para que lo que escribe la persona se busque literalmente.</summary>
    public static string LikeContains(string text) =>
        "%" + text.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("%", "\\%", StringComparison.Ordinal).Replace("_", "\\_", StringComparison.Ordinal) + "%";
}
