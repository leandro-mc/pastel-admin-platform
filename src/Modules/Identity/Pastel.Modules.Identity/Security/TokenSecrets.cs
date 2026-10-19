using System.Security.Cryptography;
using System.Text;

namespace Pastel.Modules.Identity.Security;

/// <summary>Secretos opacos: el valor original solo viaja en la cookie; en la base se guarda su hash SHA-256.</summary>
internal static class TokenSecrets
{
    public static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    public static string NewOpaqueToken(int bytes = 48) =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(bytes)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
