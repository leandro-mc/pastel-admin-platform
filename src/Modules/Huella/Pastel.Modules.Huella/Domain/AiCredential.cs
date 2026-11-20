namespace Pastel.Modules.Huella.Domain;

/// <summary>
/// Clave de un proveedor de IA del propietario. La clave se guarda cifrada (AES-GCM, ver <c>AiKeyProtector</c>) y nunca
/// se devuelve por la API ni se registra: solo se muestran sus últimos cuatro caracteres (<see cref="KeyHint"/>). Una fila
/// por proveedor; <see cref="IsActive"/> marca el que se usa al pedir «Mejorar con IA».
/// </summary>
internal sealed class AiCredential : IProfileOwned
{
    public Guid Id { get; set; }

    public Guid ProfileId { get; set; }

    /// <summary><c>gemini</c>, <c>openai</c> o <c>anthropic</c>.</summary>
    public string Provider { get; set; } = string.Empty;

    public string Model { get; set; } = string.Empty;

    public string EncryptedApiKey { get; set; } = string.Empty;

    public string KeyHint { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public uint Version { get; set; }
}
