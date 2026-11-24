using System.Globalization;
using System.Net.Mail;
using System.Text;
using System.Text.RegularExpressions;

namespace Pastel.Modules.Huella.Domain;

/// <summary>
/// Limpieza de texto del usuario. Huella guarda texto plano: se quitan caracteres de control y cualquier etiqueta con forma
/// de HTML (<c>&lt;script&gt;</c>, <c>&lt;img onerror&gt;</c>), se normalizan los saltos de línea y se recorta. La interfaz
/// además escapa todo al mostrarlo; esta capa evita que el contenido peligroso llegue a una publicación o a un CV.
/// </summary>
internal static partial class TextInput
{
    public static string Clean(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        var text = value.Replace("\r\n", "\n", StringComparison.Ordinal).Replace('\r', '\n');
        text = HtmlTag().Replace(text, string.Empty);
        var builder = new StringBuilder(text.Length);
        foreach (var ch in text)
        {
            if (ch == '\n' || ch == '\t' || !char.IsControl(ch))
            {
                builder.Append(ch);
            }
        }

        return builder.ToString().Trim();
    }

    /// <summary>Como <see cref="Clean"/>, pero un texto vacío se guarda como <c>null</c>.</summary>
    public static string? CleanOptional(string? value)
    {
        var text = Clean(value);
        return text.Length == 0 ? null : text;
    }

    /// <summary>Una sola línea: los saltos de línea y tabulaciones se convierten en espacios.</summary>
    public static string CleanLine(string? value) => Spaces().Replace(Clean(value), " ");

    public static string? CleanLineOptional(string? value)
    {
        var text = CleanLine(value);
        return text.Length == 0 ? null : text;
    }

    /// <summary>Forma comparable de un texto: sin tildes, en minúsculas y sin espacios repetidos.</summary>
    public static string Fold(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        // La tabla cubre el español aunque el proceso corra sin ICU; la normalización cubre el resto.
        var builder = new StringBuilder(value.Length);
        foreach (var ch in value.ToLowerInvariant())
        {
            builder.Append(ch switch
            {
                'á' or 'à' or 'ä' or 'â' => 'a',
                'é' or 'è' or 'ë' or 'ê' => 'e',
                'í' or 'ì' or 'ï' or 'î' => 'i',
                'ó' or 'ò' or 'ö' or 'ô' => 'o',
                'ú' or 'ù' or 'ü' or 'û' => 'u',
                'ñ' => 'n',
                _ => ch,
            });
        }

        var decomposed = builder.ToString().Normalize(NormalizationForm.FormD);
        builder.Clear();
        foreach (var ch in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
            {
                builder.Append(ch);
            }
        }

        return Spaces().Replace(builder.ToString(), " ").Trim();
    }

    [GeneratedRegex(@"</?[a-zA-Z!?][^<>]*>", RegexOptions.CultureInvariant)]
    private static partial Regex HtmlTag();

    [GeneratedRegex(@"\s+", RegexOptions.CultureInvariant)]
    private static partial Regex Spaces();
}

/// <summary>Reglas de enlaces externos: solo <c>https</c>, con un dominio real y sin credenciales en la URL.</summary>
internal static class LinkPolicy
{
    public const string InvalidMessage = "Use un enlace https completo, sin usuario ni contraseña (por ejemplo, https://github.com/usuario).";

    /// <summary>
    /// Normaliza el enlace. Sin esquema se asume <c>https://</c> (lo habitual al copiar «github.com/usuario»). Rechaza
    /// <c>http:</c>, <c>javascript:</c>, <c>data:</c>, credenciales (<c>usuario@host</c>), hosts sin dominio y espacios.
    /// </summary>
    public static bool TryNormalize(string? value, out string normalized)
    {
        normalized = string.Empty;
        var text = TextInput.CleanLine(value);
        if (text.Length == 0 || text.Length > HuellaLimits.ProfileLink.Url || text.Contains(' ', StringComparison.Ordinal))
        {
            return false;
        }

        var hasScheme = text.Contains("://", StringComparison.Ordinal)
            || text.StartsWith("javascript:", StringComparison.OrdinalIgnoreCase)
            || text.StartsWith("data:", StringComparison.OrdinalIgnoreCase)
            || text.StartsWith("mailto:", StringComparison.OrdinalIgnoreCase);
        var candidate = hasScheme ? text : "https://" + text;
        if (!Uri.TryCreate(candidate, UriKind.Absolute, out var uri)
            || !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
            || !string.IsNullOrEmpty(uri.UserInfo)
            || string.IsNullOrEmpty(uri.Host)
            || !uri.Host.Contains('.', StringComparison.Ordinal)
            || uri.Host.StartsWith('.')
            || uri.Host.EndsWith('.'))
        {
            return false;
        }

        normalized = uri.GetComponents(UriComponents.AbsoluteUri, UriFormat.UriEscaped);
        return normalized.Length <= HuellaLimits.ProfileLink.Url;
    }
}

/// <summary>Validación de datos de contacto.</summary>
internal static partial class ContactRules
{
    public static bool IsEmail(string value) =>
        value.Length <= HuellaLimits.Profile.ContactEmail
        && MailAddress.TryCreate(value, out var address)
        && string.Equals(address.Address, value, StringComparison.OrdinalIgnoreCase)
        && value.Contains('.', StringComparison.Ordinal);

    public static bool IsPhone(string value) => value.Length <= HuellaLimits.Profile.ContactPhone && Phone().IsMatch(value);

    [GeneratedRegex(@"^\+?[0-9][0-9 ()\-]{6,30}$", RegexOptions.CultureInvariant)]
    private static partial Regex Phone();
}

/// <summary>Fechas con precisión de mes (<c>AAAA-MM</c>), como las pide un CV.</summary>
internal static class MonthDate
{
    public static bool TryParse(string? value, out DateOnly date)
    {
        date = default;
        var text = TextInput.CleanLine(value);
        if (text.Length != 7 || text[4] != '-'
            || !int.TryParse(text.AsSpan(0, 4), NumberStyles.None, CultureInfo.InvariantCulture, out var year)
            || !int.TryParse(text.AsSpan(5, 2), NumberStyles.None, CultureInfo.InvariantCulture, out var month)
            || year < 1950 || year > 2100 || month < 1 || month > 12)
        {
            return false;
        }

        date = new DateOnly(year, month, 1);
        return true;
    }

    public static string Format(DateOnly date) => date.ToString("yyyy-MM", CultureInfo.InvariantCulture);

    public static string? Format(DateOnly? date) => date is { } d ? Format(d) : null;

    private static readonly string[] SpanishMonths = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    private static readonly string[] EnglishMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    /// <summary>Formato del CV: <c>Mmm AAAA</c> (contrato ATS, regla 7).</summary>
    public static string Cv(DateOnly date, string language) =>
        $"{(language == "en" ? EnglishMonths : SpanishMonths)[date.Month - 1]} {date.Year.ToString(CultureInfo.InvariantCulture)}";

    public static string CvRange(DateOnly start, DateOnly? end, string language) =>
        $"{Cv(start, language)} - {(end is { } e ? Cv(e, language) : language == "en" ? "Present" : "Presente")}";
}

/// <summary>Acumula errores por campo para una respuesta de validación (<c>problem+json</c> con <c>errors</c>).</summary>
internal sealed class FieldErrors
{
    private readonly Dictionary<string, List<string>> _errors = new(StringComparer.Ordinal);

    public bool Any => _errors.Count > 0;

    public void Add(string field, string message)
    {
        if (!_errors.TryGetValue(field, out var list))
        {
            list = [];
            _errors[field] = list;
        }

        list.Add(message);
    }

    /// <summary>Exige texto no vacío dentro del límite. Devuelve el texto limpio de una línea.</summary>
    public string RequiredLine(string field, string? value, int max)
    {
        var text = TextInput.CleanLine(value);
        if (text.Length == 0)
        {
            Add(field, "Este dato es obligatorio.");
        }
        else if (text.Length > max)
        {
            Add(field, $"Use como máximo {max} caracteres.");
        }

        return text;
    }

    public string? OptionalLine(string field, string? value, int max)
    {
        var text = TextInput.CleanLineOptional(value);
        if (text is not null && text.Length > max)
        {
            Add(field, $"Use como máximo {max} caracteres.");
        }

        return text;
    }

    /// <summary>Texto largo (con saltos de línea), puede quedar vacío.</summary>
    public string Text(string field, string? value, int max)
    {
        var text = TextInput.Clean(value);
        if (text.Length > max)
        {
            Add(field, $"Use como máximo {max} caracteres.");
        }

        return text;
    }

    public string? OptionalLink(string field, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (!LinkPolicy.TryNormalize(value, out var url))
        {
            Add(field, LinkPolicy.InvalidMessage);
            return null;
        }

        return url;
    }

    public int? Year(string field, int? value)
    {
        if (value is { } year && (year < 1950 || year > 2100))
        {
            Add(field, "Escriba un año entre 1950 y 2100.");
            return null;
        }

        return value;
    }

    public string OneOf(string field, string? value, IReadOnlyCollection<string> allowed, string fallback)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return fallback;
        }

        var text = value.Trim();
        if (!allowed.Contains(text))
        {
            Add(field, "Elija una de las opciones disponibles.");
            return fallback;
        }

        return text;
    }

    public IReadOnlyDictionary<string, string[]> ToDictionary() =>
        _errors.ToDictionary(x => x.Key, x => x.Value.ToArray(), StringComparer.Ordinal);
}
