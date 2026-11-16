namespace Pastel.Modules.Huella.Domain;

/// <summary>
/// Lo que nunca se publica ni se envía a una IA sin intención: la historia, «Mi voz», los filtros duros y las
/// preferencias del CV. Se separa de <c>Profile</c> a propósito: lo privado y lo publicable no comparten fila.
/// </summary>
internal sealed class PrivateNote : IProfileOwned
{
    public Guid Id { get; set; }

    public Guid ProfileId { get; set; }

    public string Story { get; set; } = string.Empty;

    public string Voice { get; set; } = string.Empty;

    public string Residence { get; set; } = string.Empty;

    public string WorkMode { get; set; } = string.Empty;

    public string Availability { get; set; } = string.Empty;

    public string WorkAuthorization { get; set; } = string.Empty;

    public string SalaryExpectation { get; set; } = string.Empty;

    public string Avoid { get; set; } = string.Empty;

    public string PreferredPaper { get; set; } = string.Empty;

    public string ExtraBannedPhrases { get; set; } = string.Empty;

    public DateTimeOffset UpdatedAt { get; set; }

    /// <summary>Versión de fila de PostgreSQL (<c>xmin</c>) para la concurrencia optimista.</summary>
    public uint Version { get; set; }
}
