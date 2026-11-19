namespace Pastel.Modules.Agora.Common;

/// <summary>
/// Fecha larga en español de Costa Rica («2 de noviembre de 2026») sin depender de los datos de cultura del sistema.
/// Costa Rica no tiene horario de verano: se usa UTC-6 fijo.
/// </summary>
internal static class SpanishDate
{
    private static readonly string[] Months =
    [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ];

    private static readonly TimeSpan CostaRicaOffset = TimeSpan.FromHours(-6);

    public static string Format(DateTimeOffset value)
    {
        var local = value.ToOffset(CostaRicaOffset);
        return $"{local.Day} de {Months[local.Month - 1]} de {local.Year}";
    }
}
