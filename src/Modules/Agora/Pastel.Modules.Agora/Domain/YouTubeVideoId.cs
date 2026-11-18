namespace Pastel.Modules.Agora.Domain;

/// <summary>
/// Valida y normaliza el video de una pieza (ficha §5). Solo se guarda el identificador de 11 caracteres; la URL de incrustación
/// la arma el cliente sobre <c>youtube-nocookie.com</c>. Una URL de otro sitio o un identificador manipulado se rechaza.
/// </summary>
internal static class YouTubeVideoId
{
    private const int IdLength = 11;

    private static readonly HashSet<string> WatchHosts = new(StringComparer.OrdinalIgnoreCase)
    {
        "youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com",
    };

    public static bool IsValidId(string? value) =>
        value is { Length: IdLength } && value.All(c => char.IsAsciiLetterOrDigit(c) || c is '_' or '-');

    public static bool TryNormalize(string? input, out string id)
    {
        id = string.Empty;
        var text = input?.Trim();
        if (string.IsNullOrEmpty(text))
        {
            return false;
        }

        if (IsValidId(text))
        {
            id = text;
            return true;
        }

        if (!Uri.TryCreate(text, UriKind.Absolute, out var uri)
            || uri.Scheme != Uri.UriSchemeHttps
            || !string.IsNullOrEmpty(uri.UserInfo)
            || !uri.IsDefaultPort)
        {
            return false;
        }

        string? candidate = null;
        var segments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (uri.Host.Equals("youtu.be", StringComparison.OrdinalIgnoreCase))
        {
            candidate = segments.Length == 1 ? segments[0] : null;
        }
        else if (WatchHosts.Contains(uri.Host))
        {
            if (segments.Length == 1 && segments[0] == "watch")
            {
                candidate = QueryValue(uri.Query, "v");
            }
            else if (segments.Length == 2 && segments[0] is "embed" or "shorts" or "live")
            {
                candidate = segments[1];
            }
        }

        if (!IsValidId(candidate))
        {
            return false;
        }

        id = candidate!;
        return true;
    }

    private static string? QueryValue(string query, string name)
    {
        foreach (var pair in query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var separator = pair.IndexOf('=', StringComparison.Ordinal);
            if (separator > 0 && pair[..separator] == name)
            {
                return pair[(separator + 1)..];
            }
        }

        return null;
    }
}
