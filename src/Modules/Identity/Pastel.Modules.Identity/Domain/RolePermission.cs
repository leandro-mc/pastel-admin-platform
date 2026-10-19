namespace Pastel.Domain.Entities;

public sealed class RolePermission
{
    public Guid RoleId { get; set; }
    public AppRole Role { get; set; } = null!;
    public Guid PermissionId { get; set; }
    public PermissionDefinition Permission { get; set; } = null!;
}
