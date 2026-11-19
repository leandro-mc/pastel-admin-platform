using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace Pastel.Modules.Agora.Domain;

/// <summary>Fuente tal como cuenta para la huella del contenido sustantivo.</summary>
internal sealed record SourceContent(string Title, string Url, SourceKind Kind, string? Author, DateOnly? PublishedOn, string? ContextNote);

/// <summary>
/// Contenido que una verificación avala. Si su <see cref="Fingerprint"/> cambia, la pieza cambió de forma material y
/// su <see cref="Article.SubstantiveVersion"/> sube (ficha §3). Etiquetas, categoría, serie y video no cuentan.
/// </summary>
internal sealed record SubstantiveContent(
    string Title,
    string Summary,
    ContentType ContentType,
    string? KnownText,
    string? UnknownText,
    string? WhyItMatters,
    string Body,
    IReadOnlyList<SourceContent> Sources)
{
    public string Fingerprint()
    {
        var builder = new StringBuilder();
        Append(builder, Title);
        Append(builder, Summary);
        Append(builder, ContentType.ToString());
        Append(builder, KnownText);
        Append(builder, UnknownText);
        Append(builder, WhyItMatters);
        Append(builder, Body);
        foreach (var source in Sources)
        {
            Append(builder, source.Title);
            Append(builder, source.Url);
            Append(builder, source.Kind.ToString());
            Append(builder, source.Author);
            Append(builder, source.PublishedOn?.ToString("O", CultureInfo.InvariantCulture));
            Append(builder, source.ContextNote);
        }

        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(builder.ToString())));
    }

    private static void Append(StringBuilder builder, string? value) =>
        builder.Append((value ?? string.Empty).Replace("\r\n", "\n", StringComparison.Ordinal).Trim()).Append('\u001f');
}

internal static class ReadingTime
{
    private const int WordsPerMinute = 200;

    public static int Minutes(params string?[] texts)
    {
        var words = texts
            .Where(text => !string.IsNullOrWhiteSpace(text))
            .Sum(text => text!.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).Length);
        return Math.Max(1, (int)Math.Ceiling(words / (double)WordsPerMinute));
    }
}

internal static class Slugs
{
    public static string From(string? text, int maxLength = 100)
    {
        var decomposed = (text ?? string.Empty).Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);
        var pendingHyphen = false;
        foreach (var c in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            var lower = char.ToLowerInvariant(c);
            if (char.IsAsciiLetterOrDigit(lower))
            {
                if (pendingHyphen && builder.Length > 0)
                {
                    builder.Append('-');
                }

                pendingHyphen = false;
                builder.Append(lower);
            }
            else
            {
                pendingHyphen = true;
            }
        }

        var slug = builder.ToString();
        if (slug.Length > maxLength)
        {
            slug = slug[..maxLength].TrimEnd('-');
        }

        return slug.Length == 0 ? "pieza" : slug;
    }
}
