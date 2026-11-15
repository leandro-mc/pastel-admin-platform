using System.Text;

namespace Pastel.Modules.Identity.Security;

/// <summary>
/// Política única de contraseñas (WP4 / S4.2): longitud, frases permitidas y rechazo de contraseñas comunes.
/// No aplica reglas de composición: la persona puede usar frases largas y espacios.
/// La API expondrá estas reglas mediante /api/auth/options cuando se implemente ese contrato.
/// </summary>
internal static class PasswordPolicy
{
    public const int MinLength = 12;
    public const int MaxLength = 128;

    public const string Description =
        "Use entre 12 y 128 caracteres. Puede usar una frase larga y espacios; evite contraseñas comunes o fáciles de adivinar.";

    private static readonly HashSet<string> CommonPasswords = new(StringComparer.OrdinalIgnoreCase)
    {
        "password",
        "password123",
        "password123!",
        "Password123!",
        "p@ssw0rd",
        "P@ssw0rd123!",
        "123456",
        "12345678",
        "123456789",
        "1234567890",
        "123456789012",
        "000000000000",
        "111111111111",
        "qwerty",
        "qwerty123",
        "qwertyuiop",
        "abc123",
        "abc123456789",
        "letmein",
        "welcome",
        "welcome123",
        "iloveyou",
        "admin",
        "admin123",
        "Admin123!",
        "changeme",
        "changeme123",
        "defaultpassword",
        "correcthorsebatterystaple",
        "correct horse battery staple",
        "pasteladmin",
        "pastel-dev-only-2026!",
    };

    public static bool IsStrong(string? password)
    {
        if (password is null || password.Length < MinLength || password.Length > MaxLength)
        {
            return false;
        }

        // FormKC normaliza variantes Unicode para que no evadan la lista común. No se recortan espacios:
        // los espacios forman parte válida de una frase de contraseña.
        var comparable = password.Normalize(NormalizationForm.FormKC);
        return !CommonPasswords.Contains(comparable) && !CommonPasswords.Contains(comparable.Trim());
    }
}
