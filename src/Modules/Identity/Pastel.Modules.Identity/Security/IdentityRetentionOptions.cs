namespace Pastel.Modules.Identity.Security;

/// <summary>Retención y limpieza periódica de datos de seguridad de Identity.</summary>
internal sealed class IdentityRetentionOptions
{
    public const string SectionName = "Identity:Retention";

    /// <summary>Días desde la expiración antes de borrar un refresh token histórico. El mínimo es 30 días.</summary>
    public int ExpiredRefreshTokenDays { get; init; } = 30;

    /// <summary>Días que se conserva la auditoría de Identity. Ajustar según las necesidades y obligaciones del responsable.</summary>
    public int AuditLogRetentionDays { get; init; } = 365;

    /// <summary>Intervalo entre limpiezas, expresado en horas.</summary>
    public int CleanupIntervalHours { get; init; } = 24;
}
