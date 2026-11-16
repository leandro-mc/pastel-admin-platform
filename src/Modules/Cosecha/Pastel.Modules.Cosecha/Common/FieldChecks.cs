namespace Pastel.Modules.Cosecha.Common;

/// <summary>Validaciones de entrada comunes. Cada una anota el error por campo y devuelve el valor limpio (o <c>null</c> si no es válido).</summary>
internal static class FieldChecks
{
    public static string? RequiredText(this FieldErrors errors, string field, string? value, int min, int max)
    {
        var text = Texts.Clean(value);
        if (text is null || text.Length < min || text.Length > max)
        {
            errors.Add(field, $"Escriba entre {min} y {max} caracteres.");
            return null;
        }

        return text;
    }

    public static string? OptionalText(this FieldErrors errors, string field, string? value, int max)
    {
        var text = Texts.Clean(value);
        if (text is not null && text.Length > max)
        {
            errors.Add(field, $"Admite hasta {max} caracteres.");
            return null;
        }

        return text;
    }

    /// <summary>Número obligatorio dentro de un rango y con hasta 2 decimales.</summary>
    public static decimal? RequiredDecimal(this FieldErrors errors, string field, decimal? value, decimal min, decimal max)
    {
        if (value is null)
        {
            errors.Add(field, "Este dato es obligatorio.");
            return null;
        }

        return OptionalDecimal(errors, field, value, min, max);
    }

    public static decimal? OptionalDecimal(this FieldErrors errors, string field, decimal? value, decimal min, decimal max)
    {
        if (value is null)
        {
            return null;
        }

        if (value < min || value > max)
        {
            errors.Add(field, $"Indique un valor entre {min:0.##} y {max:0.##}.".Replace('.', ','));
            return null;
        }

        if (decimal.Round(value.Value, 2) != value.Value)
        {
            errors.Add(field, "Use hasta 2 decimales.");
            return null;
        }

        return value;
    }

    public static DateOnly? RequiredDate(this FieldErrors errors, string field, DateOnly? value)
    {
        if (value is null)
        {
            errors.Add(field, "Este dato es obligatorio.");
        }

        return value;
    }
}
