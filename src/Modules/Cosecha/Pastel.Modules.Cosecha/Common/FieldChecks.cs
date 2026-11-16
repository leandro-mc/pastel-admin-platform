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

    /// <summary>Latitud y longitud opcionales: van juntas, dentro de rango y con hasta 6 decimales.</summary>
    public static (decimal? Latitude, decimal? Longitude) OptionalCoordinates(this FieldErrors errors, decimal? latitude, decimal? longitude)
    {
        if (latitude is null && longitude is null)
        {
            return (null, null);
        }

        if (latitude is null || longitude is null)
        {
            errors.Add(latitude is null ? "latitude" : "longitude", "Indique latitud y longitud juntas, o ninguna.");
            return (null, null);
        }

        var valid = true;
        if (latitude is < -90m or > 90m || decimal.Round(latitude.Value, 6) != latitude)
        {
            errors.Add("latitude", "La latitud va de -90 a 90, con hasta 6 decimales.");
            valid = false;
        }

        if (longitude is < -180m or > 180m || decimal.Round(longitude.Value, 6) != longitude)
        {
            errors.Add("longitude", "La longitud va de -180 a 180, con hasta 6 decimales.");
            valid = false;
        }

        return valid ? (latitude, longitude) : (null, null);
    }

    /// <summary>Enlace opcional: solo http o https (nunca <c>javascript:</c> u otros esquemas), porque la interfaz lo muestra como vínculo.</summary>
    public static string? OptionalHttpUrl(this FieldErrors errors, string field, string? value, int max)
    {
        var text = OptionalText(errors, field, value, max);
        if (text is not null && !(Uri.TryCreate(text, UriKind.Absolute, out var uri) && uri.Scheme is "http" or "https"))
        {
            errors.Add(field, "Escriba un enlace que empiece con http:// o https://.");
            return null;
        }

        return text;
    }
}
