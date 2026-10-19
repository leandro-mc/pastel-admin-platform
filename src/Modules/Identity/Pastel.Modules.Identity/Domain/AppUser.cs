namespace Pastel.Modules.Identity.Domain;

internal sealed class AppUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Email { get; set; }
    public required string NormalizedEmail { get; set; }
    public required string DisplayName { get; set; }

    /// <summary>Nulo en cuentas que solo ingresan con Google (o cuya contraseña temporal fue invalidada al vincular).</summary>
    public string? PasswordHash { get; set; }

    public bool IsActive { get; set; } = true;
    public bool MustChangePassword { get; set; }

    /// <summary>Fallos consecutivos de contraseña. Solo afecta el ingreso con contraseña.</summary>
    public int AccessFailedCount { get; set; }

    /// <summary>Fin del bloqueo temporal por contraseña. No invalida sesiones ya abiertas.</summary>
    public DateTimeOffset? LockoutEnd { get; set; }

    public int TokenVersion { get; set; } = 1;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Token de concurrencia (<c>xmin</c> de PostgreSQL).</summary>
    public uint Version { get; set; }

    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<UserPermissionOverride> PermissionOverrides { get; set; } = new List<UserPermissionOverride>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
