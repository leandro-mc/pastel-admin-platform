namespace Pastel.Modules.Identity.Domain;

internal sealed class RefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;
    public required string TokenHash { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
    public string? ReplacedByTokenHash { get; set; }

    /// <summary>Fin de la gracia para repetir legítimamente una rotación concurrente.</summary>
    public DateTimeOffset? GraceUntil { get; set; }

    /// <summary>Refresh token sustituto cifrado y guardado solo durante la breve ventana de gracia.</summary>
    public string? ReplacedByEncryptedToken { get; set; }

    public string? CreatedByIp { get; set; }
}
