using System.Security.Cryptography;
using System.Text;

namespace Pastel.Platform.Observability;

/// <summary>
/// HMAC truncado para correlacionar intentos con un correo desconocido sin registrar el correo.
/// La clave es aleatoria por proceso: no se puede revertir ni comparar entre reinicios.
/// </summary>
public sealed class LogHasher
{
    private readonly byte[] _key = RandomNumberGenerator.GetBytes(32);

    public string Hash(string? value)
    {
        var bytes = HMACSHA256.HashData(_key, Encoding.UTF8.GetBytes(value ?? string.Empty));
        return Convert.ToHexString(bytes)[..12];
    }
}
