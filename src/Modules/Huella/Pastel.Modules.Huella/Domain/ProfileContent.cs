namespace Pastel.Modules.Huella.Domain;

/// <summary>
/// Contenido del perfil público ya redactado, en español (la versión que la persona edita) y en inglés (la que se mantiene
/// sincronizada con una IA). No es una copia del banco: es un texto corto, priorizado y con un máximo por sección que sale
/// de la IA y de lo que la persona edita. Una fila por perfil; el JSON de cada idioma es un <c>ContentDoc</c>.
/// </summary>
internal sealed class ProfileContent : IProfileOwned
{
    public Guid Id { get; set; }

    public Guid ProfileId { get; set; }

    /// <summary><c>ContentDoc</c> en español.</summary>
    public string EsJson { get; set; } = "{}";

    /// <summary><c>ContentDoc</c> en inglés.</summary>
    public string EnJson { get; set; } = "{}";

    /// <summary>Estado por sección (<c>ContentState</c>): decide si el inglés está al día con el español.</summary>
    public string StateJson { get; set; } = "{}";

    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>Versión de fila de PostgreSQL (<c>xmin</c>) para la concurrencia optimista.</summary>
    public uint Version { get; set; }
}
