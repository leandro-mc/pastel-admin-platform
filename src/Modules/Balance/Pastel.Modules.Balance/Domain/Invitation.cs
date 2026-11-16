using System.Security.Cryptography;
using System.Text;

namespace Pastel.Modules.Balance.Domain;

/// <summary>
/// Credenciales de ingreso de un grupo (inventario §12.3.5): token aleatorio de 192 bits (≥ 128 exigidos) y código de 4 dígitos.
/// Nunca se derivan del identificador del grupo. No vencen: solo dejan de servir al regenerarse.
/// El token y el código nunca se registran en logs.
/// </summary>
internal static class Invitation
{
    public const int TokenBytes = 24;
    public const int MaxTokenLength = 64;

    public static string NewToken() => Base64Url(RandomNumberGenerator.GetBytes(TokenBytes));

    public static string NewCode() => RandomNumberGenerator.GetInt32(0, 10_000).ToString("D4", System.Globalization.CultureInfo.InvariantCulture);

    public static bool IsCodeFormat(string? code) => code is { Length: 4 } && code.All(char.IsAsciiDigit);

    /// <summary>Comparación en tiempo constante, para no filtrar cuánto del código coincidió.</summary>
    public static bool FixedTimeEquals(string expected, string? actual) =>
        actual is not null && CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(actual));

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
