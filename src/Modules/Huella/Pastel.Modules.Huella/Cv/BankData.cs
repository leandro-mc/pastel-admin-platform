namespace Pastel.Modules.Huella.Cv;

/// <summary>
/// Vista del banco que usan el análisis, la composición y el guardián del CV. Es una copia en memoria, sin EF: así las
/// reglas son deterministas y se prueban sin base de datos. La arma <c>BankLoader</c> a partir del perfil del propietario.
/// No incluye nada de <c>PrivateNote</c> salvo lo que los filtros duros necesitan, y nunca se envía completa a una IA.
/// </summary>
internal sealed record BankData(
    BankHeader Header,
    string ProfileSummary,
    IReadOnlyList<BankExperience> Experiences,
    IReadOnlyList<BankProject> Projects,
    IReadOnlyList<BankSkill> Skills,
    IReadOnlyList<BankEducation> Education,
    IReadOnlyList<BankCertification> Certifications,
    IReadOnlyList<BankLanguage> Languages,
    BankPrivate Private,
    IReadOnlyList<string> ExtraBannedPhrases,
    string Voice,
    int CurrentYear)
{
    public IEnumerable<BankAchievement> AllAchievements() =>
        Experiences.SelectMany(e => e.Achievements).Concat(Projects.SelectMany(p => p.Achievements));

    /// <summary>Años de experiencia profesional (sin prácticas), desde el primer cargo.</summary>
    public int ProfessionalYears()
    {
        var starts = Experiences
            .Where(e => !TermMatcher.Fold(e.Role).Contains("practicante", StringComparison.Ordinal)
                && !TermMatcher.Fold(e.Role).Contains("intern", StringComparison.Ordinal))
            .Select(e => e.Start.Year)
            .ToList();
        return starts.Count == 0 ? 0 : Math.Max(0, CurrentYear - starts.Min());
    }
}

internal sealed record BankHeader(string Name, string Headline, IReadOnlyList<string> ContactLine1, IReadOnlyList<string> ContactLine2);

internal sealed record BankExperience(
    Guid Id,
    string Role,
    string Company,
    string? Location,
    DateOnly Start,
    DateOnly? End,
    IReadOnlyList<BankAchievement> Achievements);

internal sealed record BankProject(Guid Id, string Name, string Stack, IReadOnlyList<BankAchievement> Achievements);

internal sealed record BankAchievement(
    Guid Id,
    string ShortText,
    string LongText,
    string? RawText,
    IReadOnlyList<string> Skills,
    int Strength)
{
    public bool HasFigure => ShortText.Any(char.IsDigit) || LongText.Any(char.IsDigit);
}

internal sealed record BankSkill(string Name, string Category, IReadOnlyList<string> Aliases, int? FirstUsedYear, int? LastUsedYear, int Evidence);

internal sealed record BankEducation(string Degree, string Institution, int? StartYear, int? EndYear, string? Note);

internal sealed record BankCertification(string Name, string? Issuer, int? Year);

internal sealed record BankLanguage(string Language, string Level, string? Evidence);

internal sealed record BankPrivate(string Residence, string WorkMode, string Availability, string WorkAuthorization, string Avoid);
