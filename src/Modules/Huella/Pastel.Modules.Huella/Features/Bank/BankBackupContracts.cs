using Pastel.Modules.Huella.Features.MyProfile;

namespace Pastel.Modules.Huella.Features.Bank;

// ── Respaldo del banco: documento portable (JSON) para llevarlo a otra computadora o conservarlo ──

/// <summary>
/// Lo que se descarga: el perfil (nombre, contacto, enlaces) y el banco completo con sus logros, tal como los muestran
/// <c>GET /profile</c> y <c>GET /bank</c>. No incluye claves de IA, el enlace público, ofertas, CV ni cartas.
/// </summary>
internal sealed record BankBackupExport(string Format, int Version, DateTimeOffset ExportedAt, ProfileInput Profile, BankView Bank);

/// <summary>Lo que se importa (todo opcional: el servidor valida y dice qué falta). Ver <see cref="BankBackupRules"/>.</summary>
internal sealed record BankBackup(string? Format, int? Version, DateTimeOffset? ExportedAt, ProfileInput? Profile, BankBackupData? Bank);

internal sealed record BankBackupData(
    NotesInput? Notes,
    IReadOnlyList<BackupExperience>? Experiences,
    IReadOnlyList<BackupProject>? Projects,
    IReadOnlyList<SkillInput>? Skills,
    IReadOnlyList<CompetencyInput>? Competencies,
    IReadOnlyList<EducationInput>? Educations,
    IReadOnlyList<CertificationInput>? Certifications,
    IReadOnlyList<LanguageInput>? Languages);

internal sealed record BackupExperience(
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
    bool? IsVisible,
    IReadOnlyList<AchievementInput>? Achievements);

internal sealed record BackupProject(
    Guid? Id,
    string? Name,
    string? Url,
    string? Summary,
    string? Approach,
    string? Stack,
    int? StartYear,
    int? EndYear,
    bool? IsVisible,
    IReadOnlyList<AchievementInput>? Achievements);

/// <summary>Cuánto quedó en el banco tras importar (la interfaz lo muestra como resumen).</summary>
internal sealed record BankImportView(
    bool ProfileUpdated,
    int Experiences,
    int Projects,
    int Achievements,
    int Skills,
    int Competencies,
    int Educations,
    int Certifications,
    int Languages);
