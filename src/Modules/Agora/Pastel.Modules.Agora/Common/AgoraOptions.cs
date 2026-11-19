namespace Pastel.Modules.Agora.Common;

/// <summary>Configuración de Ágora (sección <c>Agora</c>). Variables de entorno: <c>Agora__Verification__RequiredReviewers</c>.</summary>
internal sealed class AgoraOptions
{
    public const string SectionName = "Agora";

    public VerificationOptions Verification { get; set; } = new();
}

internal sealed class VerificationOptions
{
    /// <summary>
    /// Revisores distintos que deben verificar la versión actual de una pieza para mostrar «Verificado» (AG-VER-02).
    /// Es configuración, no una constante: por defecto 1; se acota entre 1 y 10.
    /// </summary>
    public int RequiredReviewers { get; set; } = 1;

    public int EffectiveRequiredReviewers =>
        Math.Clamp(RequiredReviewers, Domain.SealCalculator.MinRequiredReviewers, Domain.SealCalculator.MaxRequiredReviewers);
}
