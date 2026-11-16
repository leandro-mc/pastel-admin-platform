namespace Pastel.Modules.Huella.Features.Bank;

// ── Lectura ──
internal sealed record BankView(
    NotesView Notes,
    IReadOnlyList<ExperienceView> Experiences,
    IReadOnlyList<ProjectView> Projects,
    IReadOnlyList<SkillView> Skills,
    IReadOnlyList<EducationView> Educations,
    IReadOnlyList<CertificationView> Certifications,
    IReadOnlyList<LanguageView> Languages);

internal sealed record NotesView(
    string Story,
    string Voice,
    string Residence,
    string WorkMode,
    string Availability,
    string WorkAuthorization,
    string SalaryExpectation,
    string Avoid,
    string PreferredPaper,
    string ExtraBannedPhrases);

internal sealed record AchievementView(
    Guid Id,
    string ShortText,
    string LongText,
    string? RawText,
    string? ResultValue,
    string? ResultUnit,
    string? ResultBaseline,
    string ImpactType,
    int Strength,
    bool Verified,
    string Source,
    string Visibility,
    IReadOnlyList<Guid> SkillIds);

internal sealed record ExperienceView(
    Guid Id,
    string Role,
    string? MarketRole,
    string Company,
    string? Location,
    string? EmploymentType,
    string? WorkMode,
    string Start,
    string? End,
    string Narrative,
    string? CompanyContext,
    int? TeamSize,
    bool IsVisible,
    IReadOnlyList<AchievementView> Achievements);

internal sealed record ProjectView(
    Guid Id,
    string Name,
    string? Url,
    string Summary,
    string Approach,
    string? Stack,
    int? StartYear,
    int? EndYear,
    bool IsVisible,
    IReadOnlyList<AchievementView> Achievements);

internal sealed record SkillView(Guid Id, string Name, string? Aliases, string Category, int? FirstUsedYear, int? LastUsedYear, string Why, bool IsVisible, int Evidence);

internal sealed record EducationView(Guid Id, string Degree, string Institution, int? StartYear, int? EndYear, string? Note, bool IsVisible);

internal sealed record CertificationView(Guid Id, string Name, string? Issuer, int? IssuedYear, int? ExpiresYear, string? CredentialUrl, bool IsVisible);

internal sealed record LanguageView(Guid Id, string Language, string Level, string? Evidence, bool IsVisible);

// ── Escritura (cada sección se guarda completa; un elemento sin Id es nuevo) ──
internal sealed record NotesInput(
    string? Story,
    string? Voice,
    string? Residence,
    string? WorkMode,
    string? Availability,
    string? WorkAuthorization,
    string? SalaryExpectation,
    string? Avoid,
    string? PreferredPaper,
    string? ExtraBannedPhrases);

internal sealed record ExperienceInput(
    Guid? Id,
    string? Role,
    string? MarketRole,
    string? Company,
    string? Location,
    string? EmploymentType,
    string? WorkMode,
    string? Start,
    string? End,
    string? Narrative,
    string? CompanyContext,
    int? TeamSize,
    bool? IsVisible);

internal sealed record ProjectInput(Guid? Id, string? Name, string? Url, string? Summary, string? Approach, string? Stack, int? StartYear, int? EndYear, bool? IsVisible);

internal sealed record SkillInput(Guid? Id, string? Name, string? Aliases, string? Category, int? FirstUsedYear, int? LastUsedYear, string? Why, bool? IsVisible);

internal sealed record EducationInput(Guid? Id, string? Degree, string? Institution, int? StartYear, int? EndYear, string? Note, bool? IsVisible);

internal sealed record CertificationInput(Guid? Id, string? Name, string? Issuer, int? IssuedYear, int? ExpiresYear, string? CredentialUrl, bool? IsVisible);

internal sealed record LanguageInput(Guid? Id, string? Language, string? Level, string? Evidence, bool? IsVisible);

internal sealed record AchievementInput(
    Guid? Id,
    string? ShortText,
    string? LongText,
    string? RawText,
    string? ResultValue,
    string? ResultUnit,
    string? ResultBaseline,
    string? ImpactType,
    int? Strength,
    bool? Verified,
    string? Source,
    string? Visibility,
    IReadOnlyList<Guid>? SkillIds);

internal sealed record ListInput<T>(IReadOnlyList<T>? Items);

// ── Derivación ──
internal sealed record AchievementProposalView(
    string ShortText,
    string LongText,
    string RawText,
    string? ResultValue,
    string? ResultUnit,
    string ImpactType,
    int Strength,
    bool NeedsFigure,
    IReadOnlyList<Guid> SkillIds,
    IReadOnlyList<string> UnknownSkills);

internal sealed record DerivationView(string Source, IReadOnlyList<AchievementProposalView> Proposals, IReadOnlyList<string> Rejected);

internal sealed record AiPackageView(string Task, string Prompt, string Schema);

internal sealed record AiResultInput(string? Json);
