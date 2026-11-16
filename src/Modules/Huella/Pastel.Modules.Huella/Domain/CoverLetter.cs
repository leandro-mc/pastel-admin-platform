namespace Pastel.Modules.Huella.Domain;

/// <summary>
/// Carta de presentación para una oferta. Se redacta con IA desde el banco en crudo y la oferta (mismo guardián de verdad
/// que el CV) y se edita aquí. <c>ContentJson</c> es un <c>LetterDoc</c>. Una carta por idioma, igual que el CV.
/// </summary>
internal sealed class CoverLetter : IProfileOwned
{
    public Guid Id { get; set; }

    public Guid ProfileId { get; set; }

    /// <summary>Oferta para la que se escribió; se suelta (<c>null</c>) si la oferta se elimina.</summary>
    public Guid? JobOfferId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Language { get; set; } = string.Empty;

    /// <summary><c>formal</c> o <c>cercano</c>.</summary>
    public string Tone { get; set; } = string.Empty;

    public string ContentJson { get; set; } = string.Empty;

    /// <summary><c>ai</c> (redactada por IA) o <c>manual</c> (editada después por la persona).</summary>
    public string Source { get; set; } = string.Empty;

    /// <summary>Cuándo se envió; <c>null</c> = sin enviar.</summary>
    public DateTimeOffset? SentAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>Versión de fila de PostgreSQL (<c>xmin</c>) para la concurrencia optimista.</summary>
    public uint Version { get; set; }
}
