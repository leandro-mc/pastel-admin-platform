namespace Pastel.Platform.Auditing;

/// <summary>Hecho auditable. <see cref="Before"/> y <see cref="After"/> se guardan como <c>DetailsJson</c>.</summary>
public sealed record AuditRecord(
    string Action,
    string Module,
    Guid? ActorUserId = null,
    Guid? TargetUserId = null,
    string? Target = null,
    object? Before = null,
    object? After = null);

/// <summary>Auditoría de negocio y seguridad (quién, qué, antes y después). Distinta del registro técnico.</summary>
public interface IAuditTrail
{
    /// <summary>
    /// Agrega el hecho a la unidad de trabajo actual: se guarda en la misma transacción que el cambio, cuando el llamador
    /// guarda. Si el cambio falla, no queda rastro. Solo para código de Identity, dueño de la tabla.
    /// </summary>
    void Add(AuditRecord record);

    /// <summary>Guarda el hecho de inmediato y por separado (accesos denegados, eventos sin cambio de datos, otros módulos).</summary>
    Task WriteAsync(AuditRecord record, CancellationToken cancellationToken = default);
}
