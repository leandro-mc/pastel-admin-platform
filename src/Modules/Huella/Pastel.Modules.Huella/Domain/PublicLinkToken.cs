using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;

namespace Pastel.Modules.Huella.Domain;

/// <summary>
/// Token del enlace público (<c>/huella/p/:token</c>). Es una capacidad de lectura: 32 bytes aleatorios de
/// <see cref="RandomNumberGenerator"/> en Base64URL (43 caracteres). La búsqueda usa su SHA-256; el valor además se guarda
/// cifrado (AES-GCM) para que el propietario lo copie de nuevo, y nunca en claro en la base, en logs ni en la auditoría.
/// No se deriva de nombres, correos ni identificadores.
/// </summary>
internal static class PublicLinkToken
{
    public const int ByteLength = 32;
    public const int TextLength = 43;

    public static (string Token, byte[] Hash) Generate()
    {
        var bytes = RandomNumberGenerator.GetBytes(ByteLength);
        var token = Base64Url.EncodeToString(bytes);
        return (token, Hash(token));
    }

    /// <summary>Valida la forma (43 caracteres Base64URL) antes de calcular el hash; una forma inválida nunca llega a la base.</summary>
    public static bool TryHash(string? token, out byte[] hash)
    {
        hash = [];
        if (token is null || token.Length != TextLength)
        {
            return false;
        }

        foreach (var ch in token)
        {
            var valid = ch is (>= 'A' and <= 'Z') or (>= 'a' and <= 'z') or (>= '0' and <= '9') or '-' or '_';
            if (!valid)
            {
                return false;
            }
        }

        hash = Hash(token);
        return true;
    }

    private static byte[] Hash(string token) => SHA256.HashData(Encoding.ASCII.GetBytes(token));
}
