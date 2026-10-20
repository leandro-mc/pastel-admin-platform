namespace Pastel.Modules.Identity.Domain;

internal sealed class AppRole
{
    public const string AdministratorName = "Administrator";
    public const string OwnerName = "Owner/Superuser";
    public const string MemberName = "Member";

    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Name { get; set; }
    public required string NormalizedName { get; set; }
    public string? Description { get; set; }

    /// <summary>Los roles de sistema (Administrator y Owner/Superuser) se sincronizan desde código y son inmutables por API.</summary>
    public bool IsSystemRole { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Token de concurrencia (<c>xmin</c> de PostgreSQL).</summary>
    public uint Version { get; set; }

    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
