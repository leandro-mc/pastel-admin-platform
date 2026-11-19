namespace Pastel.Modules.Agora.Domain;

/// <summary>Lo que el cálculo del sello necesita saber de una verificación.</summary>
internal sealed record VerificationFact(Guid ReviewerUserId, string ReviewerName, DateTimeOffset VerifiedAt, int SubstantiveVersion, bool IsActive);

internal sealed record SealVerifier(string Name, DateTimeOffset VerifiedAt);

/// <summary>Estado del sello con el avance hacia la cantidad de revisores requerida.</summary>
internal sealed record Seal(SealState State, int ActiveForCurrentVersion, int RequiredReviewers, IReadOnlyList<SealVerifier> Verifiers);

/// <summary>
/// Regla central del módulo (ficha §3). «Verificado» exige tantas verificaciones vigentes de personas distintas, para la
/// <b>versión actual</b> del contenido, como revisores requiera la configuración. Sin eso: «Modificada tras la verificación»
/// si hubo verificaciones vigentes de una versión anterior, o «Pendiente de verificación» si no.
/// </summary>
internal static class SealCalculator
{
    public const int MinRequiredReviewers = 1;
    public const int MaxRequiredReviewers = 10;

    public static Seal Compute(IEnumerable<VerificationFact> facts, int currentSubstantiveVersion, int requiredReviewers)
    {
        var required = Math.Clamp(requiredReviewers, MinRequiredReviewers, MaxRequiredReviewers);
        var active = facts.Where(fact => fact.IsActive).ToList();

        var current = active
            .Where(fact => fact.SubstantiveVersion == currentSubstantiveVersion)
            .GroupBy(fact => fact.ReviewerUserId)
            .Select(group => group.OrderByDescending(fact => fact.VerifiedAt).First())
            .OrderBy(fact => fact.VerifiedAt)
            .ToList();

        if (current.Count >= required)
        {
            return new Seal(SealState.Verified, current.Count, required, ToVerifiers(current));
        }

        var state = active.Any(fact => fact.SubstantiveVersion < currentSubstantiveVersion)
            ? SealState.ModifiedAfterVerification
            : SealState.Pending;
        return new Seal(state, current.Count, required, ToVerifiers(current));
    }

    private static List<SealVerifier> ToVerifiers(IEnumerable<VerificationFact> facts) =>
        facts.Select(fact => new SealVerifier(fact.ReviewerName, fact.VerifiedAt)).ToList();
}

/// <summary>Separación de funciones: nadie verifica una pieza que escribió o editó, sea cual sea la cantidad de revisores.</summary>
internal static class VerificationPolicy
{
    public static Pastel.SharedKernel.Error? CanVerify(
        ArticleStatus status,
        Guid reviewerUserId,
        IReadOnlySet<Guid> contributorUserIds,
        IEnumerable<VerificationFact> facts,
        int currentSubstantiveVersion)
    {
        if (contributorUserIds.Contains(reviewerUserId))
        {
            return AgoraErrors.SelfVerification;
        }

        if (status != ArticleStatus.Published)
        {
            return AgoraErrors.VerificationNotPublished;
        }

        var already = facts.Any(fact =>
            fact.IsActive && fact.ReviewerUserId == reviewerUserId && fact.SubstantiveVersion == currentSubstantiveVersion);
        return already ? AgoraErrors.VerificationDuplicate : null;
    }
}
