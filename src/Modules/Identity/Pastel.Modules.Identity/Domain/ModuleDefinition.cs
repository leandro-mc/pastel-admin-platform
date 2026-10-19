namespace Pastel.Modules.Identity.Domain;

/// <summary>Módulo registrado. Se sincroniza desde el código (<c>IPastelModule</c>); aquí solo se activa o desactiva.</summary>
internal sealed class ModuleDefinition
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Code { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public bool IsEnabled { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Token de concurrencia (<c>xmin</c> de PostgreSQL).</summary>
    public uint Version { get; set; }

    public ICollection<PermissionDefinition> Permissions { get; set; } = new List<PermissionDefinition>();
}
