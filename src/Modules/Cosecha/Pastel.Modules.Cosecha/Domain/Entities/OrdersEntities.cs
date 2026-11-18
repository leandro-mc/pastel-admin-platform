namespace Pastel.Modules.Cosecha.Domain;

/// <summary>Pedido de un comprador. Guarda Borrador/Confirmado/Cancelado; «Parcial» y «Entregado» se derivan de lo entregado.</summary>
internal sealed class Order : IAudited
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid BuyerId { get; set; }
    public Guid SeasonId { get; set; }
    public DateOnly RequiredOn { get; set; }
    public OrderStatus Status { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset? CancelledAt { get; set; }
    public string? CancelReason { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public Guid? UpdatedBy { get; set; }
    /// <summary>Token de concurrencia (<c>xmin</c> de PostgreSQL).</summary>
    public uint Version { get; set; }
}

/// <summary>Línea de pedido: producto, kilos y precio por kilo al comprador (el modelo admite varias; la interfaz usa una).</summary>
internal sealed class OrderLine
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrderId { get; set; }
    public Guid ProductId { get; set; }
    public decimal Kilograms { get; set; }
    public decimal PricePerKg { get; set; }
    public int SortOrder { get; set; }
}
