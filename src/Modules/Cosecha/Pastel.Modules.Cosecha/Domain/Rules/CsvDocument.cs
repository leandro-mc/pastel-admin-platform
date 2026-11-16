using System.Globalization;
using System.Text;

namespace Pastel.Modules.Cosecha.Domain.Rules;

/// <summary>
/// CSV para Excel en español: UTF-8 con BOM, separador «;», decimales con coma y saltos CRLF. Los textos que empiezan con
/// <c>= + - @</c> se neutralizan para que una hoja de cálculo no los ejecute como fórmula (los números no se tocan).
/// </summary>
internal static class CsvDocument
{
    private const char Separator = ';';
    private static readonly char[] QuotedChars = [Separator, '"', '\r', '\n'];

    public static byte[] Write(IReadOnlyList<string> headers, IEnumerable<IReadOnlyList<object?>> rows)
    {
        var builder = new StringBuilder();
        builder.Append(string.Join(Separator, headers.Select(Text))).Append("\r\n");
        foreach (var row in rows)
        {
            builder.Append(string.Join(Separator, row.Select(Cell))).Append("\r\n");
        }

        var encoding = new UTF8Encoding(encoderShouldEmitUTF8Identifier: true);
        return [.. encoding.GetPreamble(), .. encoding.GetBytes(builder.ToString())];
    }

    public static string Cell(object? value) => value switch
    {
        null => string.Empty,
        decimal number => number.ToString("0.00", CultureInfo.InvariantCulture).Replace('.', ','),
        int or long or short => Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty,
        bool flag => flag ? "Sí" : "No",
        DateOnly date => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        DateTimeOffset moment => moment.ToOffset(CostaRicaTime.Offset).ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture),
        _ => Text(Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty),
    };

    private static string Text(string text)
    {
        if (text.Length > 0 && text[0] is '=' or '+' or '-' or '@' or '\t' or '\r')
        {
            text = "'" + text;
        }

        return text.IndexOfAny(QuotedChars) >= 0 ? "\"" + text.Replace("\"", "\"\"", StringComparison.Ordinal) + "\"" : text;
    }
}
