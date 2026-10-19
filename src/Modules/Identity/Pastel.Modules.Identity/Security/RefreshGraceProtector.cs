using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;

namespace Pastel.Modules.Identity.Security;

/// <summary>
/// Protege temporalmente el refresh token sustituto para que dos peticiones concurrentes con el mismo token
/// puedan recibir el mismo sustituto durante la ventana de gracia. Solo persiste ciphertext y el hash del token.
/// La clave se deriva con separación de dominio de la clave JWT configurada; una rotación de clave puede cerrar
/// esta ventana breve, pero nunca permite recuperar el token sin la clave activa.
/// </summary>
internal sealed class RefreshGraceProtector
{
    private const string Purpose = "Pastel.Identity.RefreshGrace.v1";
    private const int NonceLength = 12;
    private const int TagLength = 16;
    private static readonly byte[] AssociatedData = Encoding.UTF8.GetBytes(Purpose);
    private readonly byte[] _key;

    public RefreshGraceProtector(IOptions<JwtOptions> options)
    {
        var signingKey = Encoding.UTF8.GetBytes(options.Value.SigningKey);
        _key = HMACSHA256.HashData(signingKey, AssociatedData);
        CryptographicOperations.ZeroMemory(signingKey);
    }

    public string Protect(string token)
    {
        var plaintext = Encoding.UTF8.GetBytes(token);
        try
        {
            var nonce = RandomNumberGenerator.GetBytes(NonceLength);
            var ciphertext = new byte[plaintext.Length];
            var tag = new byte[TagLength];
            using (var aes = new AesGcm(_key, TagLength))
            {
                aes.Encrypt(nonce, plaintext, ciphertext, tag, AssociatedData);
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

    public bool TryUnprotect(string? protectedToken, out string token)
    {
        token = string.Empty;
        if (string.IsNullOrWhiteSpace(protectedToken))
        {
            return false;
        }

        byte[] payload;
        try
        {
            payload = Convert.FromBase64String(protectedToken);
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
                AssociatedData);
            token = Encoding.UTF8.GetString(plaintext);
            return token.Length > 0;
        }
        catch (CryptographicException)
        {
            token = string.Empty;
            return false;
        }
        finally
        {
            CryptographicOperations.ZeroMemory(plaintext);
        }
    }
}
