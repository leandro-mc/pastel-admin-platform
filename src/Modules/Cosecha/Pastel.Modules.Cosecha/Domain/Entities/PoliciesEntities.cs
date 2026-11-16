namespace Pastel.Modules.Cosecha.Domain;

/// <summary>Parámetros del modelo de pago, versionados y sin valores sembrados: siguen pendientes de validación y de ratificación en asamblea.</summary>
internal sealed class PaymentPolicyVersion
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public DateOnly EffectiveFrom { get; set; }
    public decimal? AdvancePct { get; set; }
    public decimal? ReferencePricePerKg { get; set; }
    public decimal? GradeBWeightPct { get; set; }
    public decimal? FundPct { get; set; }
    public decimal? ManagementPct { get; set; }
    public decimal? MaxAdvancePct { get; set; }
    public short? PaymentWeekday { get; set; }
    public bool Ratified { get; set; }
    public string? Note { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public string? CreatedByName { get; set; }
}

/// <summary>Parámetros de la política de reclamos, versionados y sin valores sembrados (pendientes de validación). Aún no hay flujo de reclamos que los use.</summary>
internal sealed class ClaimsPolicyVersion
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public DateOnly EffectiveFrom { get; set; }
    public int? ClaimWindowHours { get; set; }
    public short? RequiredPhotos { get; set; }
    public decimal? TolerancePct { get; set; }
    public decimal? MajorClaimPct { get; set; }
    public decimal? CreditPctRot { get; set; }
    public decimal? CreditPctDiscoloration { get; set; }
    public int? AckHours { get; set; }
    public int? ResolutionDays { get; set; }
    public int? MajorResolutionDays { get; set; }
    public bool Ratified { get; set; }
    public string? Note { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public string? CreatedByName { get; set; }
}
