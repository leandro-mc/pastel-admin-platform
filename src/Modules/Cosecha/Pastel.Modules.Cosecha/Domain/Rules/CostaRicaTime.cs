namespace Pastel.Modules.Cosecha.Domain.Rules;

/// <summary>
/// Fechas de negocio en <c>America/Costa_Rica</c>. El país no usa horario de verano (UTC−6 fijo), así que no depende de
/// la base de zonas horarias del sistema operativo.
/// </summary>
internal static class CostaRicaTime
{
    public static readonly TimeSpan Offset = TimeSpan.FromHours(-6);

    public static DateOnly Today(DateTimeOffset utcNow) => DateOnly.FromDateTime(utcNow.ToOffset(Offset).DateTime);

    /// <summary>Primer día de la semana indicado estrictamente posterior a la fecha («el viernes siguiente a la entrega»).</summary>
    public static DateOnly NextWeekdayAfter(DateOnly date, DayOfWeek weekday)
    {
        var days = (((int)weekday - (int)date.DayOfWeek) + 7) % 7;
        return date.AddDays(days == 0 ? 7 : days);
    }

    /// <summary>Día de la semana ISO (1 = lunes … 7 = domingo) a <see cref="DayOfWeek"/>.</summary>
    public static DayOfWeek FromIsoWeekday(int isoWeekday) => isoWeekday == 7 ? DayOfWeek.Sunday : (DayOfWeek)isoWeekday;
}
