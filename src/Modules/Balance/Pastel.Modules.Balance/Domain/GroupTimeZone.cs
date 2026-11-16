namespace Pastel.Modules.Balance.Domain;

/// <summary>
/// D9: cada grupo tiene una zona IANA (por defecto Costa Rica). Los instantes se guardan en UTC; la fecha de un gasto es una
/// fecha de calendario, así que cambiar la zona nunca altera las fechas de los gastos.
/// </summary>
internal static class GroupTimeZone
{
    public const string Default = "America/Costa_Rica";
    public const int MaxLength = 64;

    public static bool TryResolve(string? id, out TimeZoneInfo zone)
    {
        zone = TimeZoneInfo.Utc;
        if (string.IsNullOrWhiteSpace(id) || id.Length > MaxLength || !id.Contains('/') && id != "UTC")
        {
            return false;
        }

        try
        {
            zone = TimeZoneInfo.FindSystemTimeZoneById(id);
            return true;
        }
        catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            return false;
        }
    }

    /// <summary>La fecha de calendario de un instante en la zona del grupo («hoy», fecha de cierre).</summary>
    public static DateOnly LocalDate(string zoneId, DateTimeOffset instant) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instant, TimeZoneInfo.FindSystemTimeZoneById(zoneId)).DateTime);
}
