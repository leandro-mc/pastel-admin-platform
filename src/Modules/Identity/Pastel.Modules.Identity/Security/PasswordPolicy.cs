namespace Pastel.Modules.Identity.Security;

/// <summary>
/// Regla vigente de contraseñas (la de la base anterior). WP4 (S4.2) la reemplaza por una política tipo NIST 800-63B
/// y expone el texto en <c>/api/auth/options</c>; hasta entonces este es el único lugar donde se define.
/// </summary>
internal static class PasswordPolicy
{
    public const int MinLength = 12;
    public const int MaxLength = 128;

    public const string Description =
        "Use entre 12 y 128 caracteres, con mayúsculas, minúsculas, números y un símbolo.";

    public static bool IsStrong(string? password) => password is { Length: >= MinLength and <= MaxLength }
        && password.Any(char.IsUpper)
        && password.Any(char.IsLower)
        && password.Any(char.IsDigit)
        && password.Any(c => !char.IsLetterOrDigit(c));
}
