namespace Pastel.Modules.Cosecha.Domain;

/// <summary>Productor. Sin cuenta en el MVP: `UserId` es opcional y sin clave foránea (otro esquema). Se archiva, nunca se borra.</summary>
internal sealed class Producer : IAudited
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string Name { get; set; }
    public required string NormalizedName { get; set; }
    public string? PickupPoint { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public string? MapUrl { get; set; }
    public string? Notes { get; set; }
    public Guid? UserId { get; set; }
    public DateTimeOffset? ArchivedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public Guid? UpdatedBy { get; set; }
    /// <summary>Token de concurrencia (<c>xmin</c> de PostgreSQL).</summary>
    public uint Version { get; set; }
}

/// <summary>Teléfonos de un productor, normalizados a 8 dígitos de Costa Rica.</summary>
internal sealed class ProducerPhone
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid ProducerId { get; set; }
    public required string Phone { get; set; }
    public string? Label { get; set; }
    public bool IsPrimary { get; set; }
    public int SortOrder { get; set; }
}

/// <summary>Capacidad estimada de un productor en una temporada: base del reparto proporcional.</summary>
internal sealed class ProducerSeasonCapacity
{
    public Guid ProducerId { get; set; }
    public Guid SeasonId { get; set; }
    public decimal EstimatedCapacityKg { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public Guid? UpdatedBy { get; set; }
    /// <summary>Token de concurrencia (<c>xmin</c> de PostgreSQL).</summary>
    public uint Version { get; set; }
}

/// <summary>Comprador. `UserId` vincula una cuenta de comprador (solo lectura); sin clave foránea (otro esquema). Se archiva, nunca se borra.</summary>
internal sealed class Buyer : IAudited
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string Name { get; set; }
    public required string NormalizedName { get; set; }
    public string? Address { get; set; }
    public string? Zone { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public string? MapUrl { get; set; }
    public string? DeliveryConditions { get; set; }
    public string? Notes { get; set; }
    public Guid? UserId { get; set; }
    public DateTimeOffset? ArchivedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public Guid? UpdatedBy { get; set; }
    /// <summary>Token de concurrencia (<c>xmin</c> de PostgreSQL).</summary>
    public uint Version { get; set; }
}

/// <summary>Contactos de un comprador (nombre, teléfono, cargo).</summary>
internal sealed class BuyerContact
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid BuyerId { get; set; }
    public required string Name { get; set; }
    public string? Phone { get; set; }
    public string? RoleTitle { get; set; }
    public bool IsPrimary { get; set; }
    public int SortOrder { get; set; }
}
