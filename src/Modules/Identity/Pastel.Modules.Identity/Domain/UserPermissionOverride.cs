namespace Pastel.Modules.Identity.Domain;

internal enum PermissionEffect { Deny = 0, Grant = 1 }

internal sealed class UserPermissionOverride
{
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;
    public Guid PermissionId { get; set; }
    public PermissionDefinition Permission { get; set; } = null!;
    public PermissionEffect Effect { get; set; }
    public Guid? AssignedByUserId { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
