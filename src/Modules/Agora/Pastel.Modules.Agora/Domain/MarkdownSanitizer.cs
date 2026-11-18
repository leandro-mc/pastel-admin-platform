using System.Text;
using System.Text.RegularExpressions;

namespace Pastel.Modules.Agora.Domain;

/// <summary>
/// Sanitización estricta del Markdown de una pieza (ficha §5): sin HTML crudo, sin scripts, sin imágenes remotas y solo enlaces
/// <c>http</c>, <c>https</c>, <c>mailto</c> o ancla. El cliente además renderiza sin HTML, así que son dos barreras independientes.
/// Los bloques de código con vallas se conservan tal cual (se muestran como texto).
/// </summary>
internal static partial class MarkdownSanitizer
{
    public const int MaxLength = 60_000;
    private const int MaxPasses = 5;

    public static string Sanitize(string? markdown)
    {
        if (string.IsNullOrWhiteSpace(markdown))
        {
            return string.Empty;
        }

        var text = markdown.Replace("\r\n", "\n", StringComparison.Ordinal).Replace('\r', '\n');
        var output = new StringBuilder(text.Length);
        var prose = new StringBuilder();
        var code = new StringBuilder();
        var inFence = false;

        foreach (var line in text.Split('\n'))
        {
            var trimmed = line.TrimStart();
            var indent = line.Length - trimmed.Length;
            var isFence = indent <= 3
                && (trimmed.StartsWith("```", StringComparison.Ordinal) || trimmed.StartsWith("~~~", StringComparison.Ordinal));

            if (isFence)
            {
                if (!inFence)
                {
                    output.Append(SanitizeProse(prose.ToString()));
                    prose.Clear();
                }
                else
                {
                    code.Append(line).Append('\n');
                    output.Append(code);
                    code.Clear();
                    inFence = false;
                    continue;
                }

                inFence = true;
                code.Append(line).Append('\n');
                continue;
            }

            (inFence ? code : prose).Append(line).Append('\n');
        }

        output.Append(SanitizeProse(prose.ToString()));
        if (code.Length > 0)
        {
            // Valla sin cerrar: no se confía en ella; se trata como texto común.
            output.Append(SanitizeProse(code.ToString()));
        }

        return output.ToString().Trim();
    }

    /// <summary>Indica si una dirección es aceptable como destino de enlace.</summary>
    public static bool IsAllowedUrl(string? url)
    {
        if (string.IsNullOrEmpty(url) || url.Length > 500 || url.Any(c => char.IsControl(c) || char.IsWhiteSpace(c)))
        {
            return false;
        }

        if (url.StartsWith('#'))
        {
            return true;
        }

        if (url.StartsWith("mailto:", StringComparison.OrdinalIgnoreCase))
        {
            return url.Length > "mailto:".Length;
        }

        return Uri.TryCreate(url, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp)
            && string.IsNullOrEmpty(uri.UserInfo)
            && !string.IsNullOrEmpty(uri.Host);
    }

    /// <summary>Dirección web <c>http</c> o <c>https</c> segura (fuentes y noticias enlazadas).</summary>
    public static bool IsHttpUrl(string? url) =>
        IsAllowedUrl(url)
        && Uri.TryCreate(url, UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp);

    private static string SanitizeProse(string text)
    {
        var current = text;
        for (var pass = 0; pass < MaxPasses; pass++)
        {
            var next = HtmlComment().Replace(current, string.Empty);
            next = DangerousBlock().Replace(next, string.Empty);
            next = Image().Replace(next, "${alt}");
            next = Link().Replace(next, KeepLinkIfAllowed);
            next = ReferenceDefinition().Replace(next, KeepDefinitionIfAllowed);
            next = HtmlTag().Replace(next, string.Empty);
            if (next == current)
            {
                break;
            }

            current = next;
        }

        return current;
    }

    private static string KeepLinkIfAllowed(Match match) =>
        IsAllowedUrl(match.Groups["url"].Value) ? match.Value : match.Groups["text"].Value;

    private static string KeepDefinitionIfAllowed(Match match) =>
        IsAllowedUrl(match.Groups["url"].Value) ? match.Value : string.Empty;

    [GeneratedRegex("<!--.*?-->", RegexOptions.Singleline | RegexOptions.CultureInvariant)]
    private static partial Regex HtmlComment();

    [GeneratedRegex(
        @"<(?<tag>script|style|iframe|object|embed|svg|math|template|noscript)\b[^>]*>.*?</\k<tag>\s*>",
        RegexOptions.Singleline | RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex DangerousBlock();

    [GeneratedRegex(@"!\[(?<alt>[^\]]*)\]\([^)]*\)", RegexOptions.CultureInvariant)]
    private static partial Regex Image();

    [GeneratedRegex(@"\[(?<text>[^\]]*)\]\(\s*(?<url>[^)\s]*)(?<title>\s+""[^""]*"")?\s*\)", RegexOptions.CultureInvariant)]
    private static partial Regex Link();

    [GeneratedRegex(@"^[ ]{0,3}\[[^\]]+\]:[ \t]*(?<url>\S+).*$", RegexOptions.Multiline | RegexOptions.CultureInvariant)]
    private static partial Regex ReferenceDefinition();

    [GeneratedRegex(@"</?[A-Za-z][^>]*>|<[!?][^>]*>", RegexOptions.CultureInvariant)]
    private static partial Regex HtmlTag();
}
