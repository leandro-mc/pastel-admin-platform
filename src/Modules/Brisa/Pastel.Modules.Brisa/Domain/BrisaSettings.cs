namespace Pastel.Modules.Brisa.Domain;

/// <summary>Ajustes de una persona. Hoy solo la zona horaria (IANA); sin fila se usa <see cref="TaskRules.DefaultTimeZoneId"/>.</summary>
internal sealed class BrisaSettings
{
    public Guid UserId { get; set; }

    public required string TimeZoneId { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
