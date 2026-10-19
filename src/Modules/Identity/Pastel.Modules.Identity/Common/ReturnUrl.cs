namespace Pastel.Modules.Identity.Common;

/// <summary>
/// <c>returnUrl</c> solo puede ser una ruta interna de la aplicación (empieza por «/», sin esquema, host, «//» ni «/\»,
/// también tras decodificar) cuyo primer segmento sea una sección conocida. Todo lo demás vuelve a «/» (evita redirección abierta).
/// </summary>
internal static class ReturnUrl
{
    private const int MaxLength = 512;

    // Primer segmento de las rutas del shell: ver docs/ARCHITECTURE.md y los módulos de web/src/modules.
    private static readonly HashSet<string> KnownFirstSegments = new(StringComparer.Ordinal)
    {
        "inicio", "configuracion", "cuenta", "brisa", "balance", "agora", "cosecha", "huella",
    };

    public static string Sanitize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length > MaxLength)
        {
            return "/";
        }

        var decoded = SafeUnescape(value);
        if (decoded is null || !IsInternalPath(value) || !IsInternalPath(decoded))
        {
            return "/";
        }

        var path = decoded.Split('?', '#')[0];
        var first = path.Split('/', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        return first is null || KnownFirstSegments.Contains(first) ? value : "/";
    }

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
