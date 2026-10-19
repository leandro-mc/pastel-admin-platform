namespace Pastel.Modules.Identity.Domain;

/// <summary>
/// Vínculo entre una cuenta y una identidad de un proveedor externo (Google). La clave estable es el <c>sub</c> del proveedor,
/// nunca el correo. No se guardan tokens del proveedor.
/// </summary>
internal sealed class ExternalLogin
{
    public const string GoogleProvider = "google";

    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;

    /// <summary>Proveedor en minúsculas (<see cref="GoogleProvider"/>).</summary>
    public required string Provider { get; set; }

    /// <summary>Identificador estable de la persona en el proveedor (<c>sub</c>).</summary>
    public required string ProviderSubject { get; set; }

    /// <summary>Correo que informó el proveedor al vincular.</summary>
    public required string EmailAtLink { get; set; }

    public bool EmailVerified { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LastLoginAt { get; set; }
}
