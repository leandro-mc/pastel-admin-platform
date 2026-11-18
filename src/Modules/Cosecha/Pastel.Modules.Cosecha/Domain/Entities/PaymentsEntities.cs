namespace Pastel.Modules.Cosecha.Domain;

/// <summary>Pago a un productor. No se edita: si hubo error se anula con motivo (queda el rastro).</summary>
internal sealed class ProducerPayment : IAudited
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid ProducerId { get; set; }
    public DateOnly PaidOn { get; set; }
    public decimal AmountCrc { get; set; }
    public PaymentMethod Method { get; set; }
    public string? Reference { get; set; }
    public string? Note { get; set; }
    public DateTimeOffset? VoidedAt { get; set; }
    public Guid? VoidedBy { get; set; }
    public string? VoidReason { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public Guid? UpdatedBy { get; set; }
    /// <summary>Token de concurrencia (<c>xmin</c> de PostgreSQL).</summary>
    public uint Version { get; set; }
}

/// <summary>A qué entrega se aplicó cada parte de un pago. Un disparador impide aplicar más que el monto de la entrega.</summary>
internal sealed class ProducerPaymentAllocation
{
    public Guid PaymentId { get; set; }
    public Guid DeliveryId { get; set; }
    public decimal AmountCrc { get; set; }
}
