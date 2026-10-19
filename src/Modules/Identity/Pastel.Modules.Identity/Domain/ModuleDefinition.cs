namespace Pastel.Domain.Entities;

public sealed class ModuleDefinition
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Code { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public bool IsEnabled { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<PermissionDefinition> Permissions { get; set; } = new List<PermissionDefinition>();
}
