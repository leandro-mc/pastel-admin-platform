namespace Pastel.Modules.Identity.Domain;

/// <summary>Evento de auditoría de negocio y seguridad. <see cref="DetailsJson"/> guarda <c>{ "before": …, "after": … }</c>.</summary>
internal sealed class AuditLog
{
    public long Id { get; set; }
    public Guid? ActorUserId { get; set; }
    public Guid? TargetUserId { get; set; }
    public required string Action { get; set; }

    /// <summary>Código del módulo de origen (<c>identity</c>, <c>platform</c>, <c>brisa</c>, …).</summary>
    public required string Module { get; set; }

    public string? Target { get; set; }
    public string? DetailsJson { get; set; }
    public string? IpAddress { get; set; }

    /// <summary>Correlaciona el evento con el registro técnico y con la respuesta <c>problem+json</c>.</summary>
    public string? TraceId { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
