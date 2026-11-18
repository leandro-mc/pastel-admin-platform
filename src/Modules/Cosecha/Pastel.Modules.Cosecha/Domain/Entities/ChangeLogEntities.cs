namespace Pastel.Modules.Cosecha.Domain;

/// <summary>Registro de cambios de cantidades y precios (antes/después, nota y quién). Solo se agrega; un disparador impide editarlo o borrarlo.</summary>
internal sealed class ChangeLogEntry
{
    public long Id { get; set; }
    public required string EntityType { get; set; }
    public Guid EntityId { get; set; }
    public required string Field { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string? Note { get; set; }
    public Guid? ChangedBy { get; set; }
    public string? ChangedByName { get; set; }
    public DateTimeOffset ChangedAt { get; set; }
}
