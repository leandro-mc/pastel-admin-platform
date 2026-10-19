namespace Pastel.Modules.Identity.Common;

/// <summary>Patrones de <c>ILIKE</c> literales: se escapan los comodines y se acota la longitud del término.</summary>
internal static class LikePattern
{
    public const string EscapeCharacter = "\\";
    private const int MaxTermLength = 100;

    public static string Contains(string term)
    {
        var trimmed = term.Trim();
        if (trimmed.Length > MaxTermLength)
        {
            trimmed = trimmed[..MaxTermLength];
        }

        return "%" + trimmed.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%";
    }
}
