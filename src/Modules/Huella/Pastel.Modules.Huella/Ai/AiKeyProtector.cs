using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace Pastel.Modules.Huella.Ai;

/// <summary>
/// Cifra las claves de IA del propietario con AES-256-GCM. La clave de cifrado se deriva (HMAC-SHA256 con separación de
/// dominio) del secreto de firma ya configurado en el servidor (<c>Jwt:SigningKey</c>), que nunca está en el repositorio.
/// Cada texto cifrado queda atado a su perfil y proveedor (datos asociados), así que no se puede mover a otra fila.
/// Si el secreto rota, las claves guardadas dejan de poder leerse y la interfaz pide ingresarlas de nuevo.
/// </summary>
internal sealed class AiKeyProtector
{
    private const string Purpose = "Pastel.Huella.AiKey.v1";
    private const int NonceLength = 12;
    private const int TagLength = 16;
    private readonly byte[] _key;

    public AiKeyProtector(IConfiguration configuration)
    {
        var secret = configuration["Jwt:SigningKey"];
        if (string.IsNullOrEmpty(secret))
        {
            throw new InvalidOperationException("Huella necesita Jwt:SigningKey para cifrar las claves de IA.");
        }

        var secretBytes = Encoding.UTF8.GetBytes(secret);
        _key = HMACSHA256.HashData(secretBytes, Encoding.UTF8.GetBytes(Purpose));
        CryptographicOperations.ZeroMemory(secretBytes);
    }

    public string Protect(string apiKey, Guid profileId, string provider)
    {
        var plaintext = Encoding.UTF8.GetBytes(apiKey);
        try
        {
            var nonce = RandomNumberGenerator.GetBytes(NonceLength);
            var ciphertext = new byte[plaintext.Length];
            var tag = new byte[TagLength];
            using (var aes = new AesGcm(_key, TagLength))
            {
                aes.Encrypt(nonce, plaintext, ciphertext, tag, AssociatedData(profileId, provider));
            }

            var result = new byte[NonceLength + TagLength + ciphertext.Length];
            nonce.CopyTo(result, 0);
            tag.CopyTo(result, NonceLength);
            ciphertext.CopyTo(result, NonceLength + TagLength);
            return Convert.ToBase64String(result);
        }
        finally
        {
            CryptographicOperations.ZeroMemory(plaintext);
        }
    }

    public bool TryUnprotect(string? protectedKey, Guid profileId, string provider, out string apiKey)
    {
        apiKey = string.Empty;
        if (string.IsNullOrWhiteSpace(protectedKey))
        {
            return false;
        }

        byte[] payload;
        try
        {
            payload = Convert.FromBase64String(protectedKey);
        }
        catch (FormatException)
        {
            return false;
        }

        if (payload.Length <= NonceLength + TagLength)
        {
            return false;
        }

        var plaintext = new byte[payload.Length - NonceLength - TagLength];
        try
        {
            using var aes = new AesGcm(_key, TagLength);
            aes.Decrypt(
                payload.AsSpan(0, NonceLength),
                payload.AsSpan(NonceLength + TagLength),
                payload.AsSpan(NonceLength, TagLength),
                plaintext,
                AssociatedData(profileId, provider));
            apiKey = Encoding.UTF8.GetString(plaintext);
            return apiKey.Length > 0;
        }
        catch (CryptographicException)
        {
            return false;
        }
        finally
        {
            CryptographicOperations.ZeroMemory(plaintext);
        }
    }

    private static byte[] AssociatedData(Guid profileId, string provider) =>
        Encoding.UTF8.GetBytes($"{Purpose}|{profileId:N}|{provider}");
}
