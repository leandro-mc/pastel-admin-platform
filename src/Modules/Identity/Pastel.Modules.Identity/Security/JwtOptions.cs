namespace Pastel.Modules.Identity.Security;

internal sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; init; } = "PastelAdmin";
    public string Audience { get; init; } = "PastelAdmin.Web";

    /// <summary>Clave actual para emitir JWT. Debe tener al menos 32 bytes UTF-8.</summary>
    public string SigningKey { get; init; } = string.Empty;

    /// <summary>Identificador publicado en el encabezado JWT para seleccionar la clave actual.</summary>
    public string SigningKeyId { get; init; } = "primary";

    /// <summary>Clave anterior opcional para permitir la rotación gradual; deja de aceptarse al retirarla.</summary>
    public string? PreviousSigningKey { get; init; }

    /// <summary>Identificador de la clave anterior, requerido cuando se configura dicha clave.</summary>
    public string? PreviousSigningKeyId { get; init; }

    public int AccessTokenMinutes { get; init; } = 10;
    public int RefreshTokenDays { get; init; } = 7;
}
