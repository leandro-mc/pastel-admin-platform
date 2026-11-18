namespace Pastel.Modules.Cosecha.Domain;

/// <summary>Producto que se vende (rambután, café pilado…). La unidad del MVP es el kilogramo.</summary>
internal sealed class Product : IAudited
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string Name { get; set; }
    public required string NormalizedName { get; set; }
    public required string Unit { get; set; }
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public Guid? UpdatedBy { get; set; }
    /// <summary>Token de concurrencia (<c>xmin</c> de PostgreSQL).</summary>
    public uint Version { get; set; }
}

/// <summary>Temporada de un producto (antes «campaña»; ver `docs/modules/COSECHA.md`). Agrupa pedidos, envíos y capacidades.</summary>
internal sealed class Season : IAudited
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string Name { get; set; }
    public required string NormalizedName { get; set; }
    public Guid ProductId { get; set; }
    public DateOnly StartsOn { get; set; }
    public DateOnly EndsOn { get; set; }
    public SeasonStatus Status { get; set; }
    public decimal DefaultProducerPricePerKg { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public Guid? UpdatedBy { get; set; }
    /// <summary>Token de concurrencia (<c>xmin</c> de PostgreSQL).</summary>
    public uint Version { get; set; }
}
