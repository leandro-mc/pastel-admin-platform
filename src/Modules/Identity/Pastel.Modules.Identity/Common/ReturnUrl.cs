namespace Pastel.Modules.Identity.Common;

/// <summary>
/// Valida retornos de navegación internos cuyo primer segmento corresponda a una ruta conocida.
/// La marca RememberLastApp viaja solo dentro del estado protegido de OAuth, no en una URL pública.
/// </summary>
internal static class ReturnUrl
{
    private const int MaxLength = 512;
    public const string RememberLastApp = "__pastel_remember_last_app__";

    private static readonly HashSet<string> KnownFirstSegments = new(StringComparer.Ordinal)
    {
        "inicio", "configuracion", "cuenta", "brisa", "balance", "agora", "cosecha", "huella",
    };

    public static bool IsSafe(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length > MaxLength)
        {
            return false;
        }

        var decoded = SafeUnescape(value);
        if (decoded is null || !IsInternalPath(value) || !IsInternalPath(decoded))
        {
            return false;
        }

        var path = decoded.Split('?', '#')[0];
        var first = path.Split('/', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        return first is null || KnownFirstSegments.Contains(first);
    }

    public static string Sanitize(string? value) => IsSafe(value) ? value! : "/";

    private static string? SafeUnescape(string value)
    {
        try
        {
            return Uri.UnescapeDataString(value);
        }
        catch (UriFormatException)
        {
            return null;
        }
    }

    private static bool IsInternalPath(string value) =>
        value.StartsWith('/')
        && !value.StartsWith("//", StringComparison.Ordinal)
        && !value.StartsWith("/\\", StringComparison.Ordinal)
        && !value.Contains('\\')
        && !value.Any(char.IsControl);
}
