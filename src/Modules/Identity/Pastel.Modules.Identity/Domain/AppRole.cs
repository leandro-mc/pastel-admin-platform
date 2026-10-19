namespace Pastel.Modules.Identity.Domain;

internal sealed class AppRole
{
    public const string AdministratorName = "Administrator";
    public const string MemberName = "Member";

    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Name { get; set; }
    public required string NormalizedName { get; set; }
    public string? Description { get; set; }

    /// <summary>Rol de sistema: Administrator es inmutable (no se renombra ni se le quitan permisos).</summary>
    public bool IsSystemRole { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Token de concurrencia (<c>xmin</c> de PostgreSQL).</summary>
    public uint Version { get; set; }

    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
