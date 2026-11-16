namespace Pastel.Modules.Cosecha.Domain;

/// <summary>Envío: reúne pedidos de una fecha y reparte lo necesario entre productores. `BufferPercent` es el margen sobre lo pedido.</summary>
internal sealed class Shipment : IAudited
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid SeasonId { get; set; }
    public DateOnly ShipmentDate { get; set; }
    public ShipmentStatus Status { get; set; }
    public decimal BufferPercent { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset? ClosedAt { get; set; }
    public string? CloseReason { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public Guid? UpdatedBy { get; set; }
    /// <summary>Token de concurrencia (<c>xmin</c> de PostgreSQL).</summary>
    public uint Version { get; set; }
}

/// <summary>Pedido incluido en un envío: lo planeado y lo realmente entregado al comprador. Un pedido puede repartirse en varios envíos.</summary>
internal sealed class ShipmentOrder : IAudited
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid ShipmentId { get; set; }
    public Guid OrderId { get; set; }
    public decimal PlannedKg { get; set; }
    public decimal? DeliveredKg { get; set; }
    public string? DeliveryNote { get; set; }
    public DateTimeOffset? DeliveredAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public Guid? UpdatedBy { get; set; }
    /// <summary>Token de concurrencia (<c>xmin</c> de PostgreSQL).</summary>
    public uint Version { get; set; }
}

/// <summary>Entrega de un productor a un envío: solicitado, recibido, rechazado y monto. `accepted_kg` y `amount_crc` los calcula la base (una sola fuente de verdad).</summary>
internal sealed class ProducerDelivery : IAudited
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid ShipmentId { get; set; }
    public Guid ProducerId { get; set; }
    public decimal RequestedKg { get; set; }
    public decimal? AvailableKg { get; set; }
    public decimal? ReceivedKg { get; set; }
    public decimal RejectedKg { get; set; }
    /// <summary>Columna generada por la base (<c>received_kg - rejected_kg</c>); la aplicación no la escribe.</summary>
    public decimal? AcceptedKg { get; private set; }
    public decimal PricePerKg { get; set; }
    /// <summary>Columna generada por la base (<c>round((received_kg - rejected_kg) * price_per_kg, 2)</c>); la aplicación no la escribe.</summary>
    public decimal? AmountCrc { get; private set; }
    public DeliveryStatus Status { get; set; }
    public DeliveryQuality? Quality { get; set; }
    public string? Notes { get; set; }
    public DateOnly? ExpectedPaymentDate { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public Guid? UpdatedBy { get; set; }
    /// <summary>Token de concurrencia (<c>xmin</c> de PostgreSQL).</summary>
    public uint Version { get; set; }
}
