namespace Pastel.Modules.Cosecha.Common;

internal static class Texts
{
    /// <summary>Forma comparable de un nombre (espacios colapsados y mayúsculas): sirve para búsquedas y unicidad sin distinguir mayúsculas.</summary>
    public static string Normalize(string value) =>
        string.Join(' ', value.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)).ToUpperInvariant();

    /// <summary>Texto recortado, o <c>null</c> si queda vacío.</summary>
    public static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    public static string Truncate(string value, int max) => value.Length <= max ? value : value[..max];
}
