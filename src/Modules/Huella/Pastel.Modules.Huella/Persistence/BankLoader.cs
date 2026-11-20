using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Huella.Cv;
using Pastel.Modules.Huella.Domain;

namespace Pastel.Modules.Huella.Persistence;

/// <summary>Todas las filas del banco de un perfil, ya ordenadas para mostrarse.</summary>
internal sealed record BankRecords(
    List<ProfileLink> Links,
    List<Experience> Experiences,
    List<Project> Projects,
    List<Achievement> Achievements,
    List<Skill> Skills,
    List<AchievementSkill> AchievementSkills,
    List<Education> Educations,
    List<Certification> Certifications,
    List<LanguageSkill> Languages,
    List<Competency> Competencies)
{
    public IEnumerable<Achievement> AchievementsOf(Experience experience) =>
        Achievements.Where(a => a.ExperienceId == experience.Id).OrderBy(a => a.SortOrder).ThenBy(a => a.CreatedAt);

    public IEnumerable<Achievement> AchievementsOf(Project project) =>
        Achievements.Where(a => a.ProjectId == project.Id).OrderBy(a => a.SortOrder).ThenBy(a => a.CreatedAt);

    public IReadOnlyList<Guid> SkillIdsOf(Achievement achievement) =>
        AchievementSkills.Where(x => x.AchievementId == achievement.Id).Select(x => x.SkillId).ToList();

    public int EvidenceOf(Skill skill) => AchievementSkills.Count(x => x.SkillId == skill.Id);
}

/// <summary>
/// Carga el banco de un perfil. Las consultas parten siempre del <c>Id</c> del perfil del propietario (ver
/// <see cref="OwnerProfiles"/>); los logros y la evidencia se alcanzan solo a través de experiencias y proyectos de ese perfil.
/// </summary>
internal sealed class BankLoader(HuellaDbContext db)
{
    public async Task<BankRecords> LoadAsync(Guid profileId, CancellationToken cancellationToken)
    {
        var links = await db.ProfileLinks.Where(x => x.ProfileId == profileId).OrderBy(x => x.SortOrder).ToListAsync(cancellationToken);
        var experiences = await db.Experiences.Where(x => x.ProfileId == profileId)
            .OrderBy(x => x.SortOrder).ThenByDescending(x => x.StartDate).ToListAsync(cancellationToken);
        var projects = await db.Projects.Where(x => x.ProfileId == profileId).OrderBy(x => x.SortOrder).ToListAsync(cancellationToken);
        var experienceIds = experiences.Select(x => x.Id).ToList();
        var projectIds = projects.Select(x => x.Id).ToList();
        var achievements = await db.Achievements
            .Where(a => (a.ExperienceId != null && experienceIds.Contains(a.ExperienceId.Value))
                || (a.ProjectId != null && projectIds.Contains(a.ProjectId.Value)))
            .ToListAsync(cancellationToken);
        var achievementIds = achievements.Select(a => a.Id).ToList();
        var achievementSkills = await db.AchievementSkills.Where(x => achievementIds.Contains(x.AchievementId)).ToListAsync(cancellationToken);
        var skills = await db.Skills.Where(x => x.ProfileId == profileId).OrderBy(x => x.SortOrder).ThenBy(x => x.Name).ToListAsync(cancellationToken);
        var educations = await db.Educations.Where(x => x.ProfileId == profileId).OrderBy(x => x.SortOrder).ToListAsync(cancellationToken);
        var certifications = await db.Certifications.Where(x => x.ProfileId == profileId).OrderBy(x => x.SortOrder).ToListAsync(cancellationToken);
        var languages = await db.LanguageSkills.Where(x => x.ProfileId == profileId).OrderBy(x => x.SortOrder).ToListAsync(cancellationToken);
        var competencies = await db.Competencies.Where(x => x.ProfileId == profileId).OrderBy(x => x.Kind).ThenBy(x => x.SortOrder).ThenBy(x => x.Name).ToListAsync(cancellationToken);
        return new BankRecords(links, experiences, projects, achievements, skills, achievementSkills, educations, certifications, languages, competencies);
    }

    /// <summary>Vista del banco para el CV: solo logros visibles en CV (<c>cv</c> o <c>both</c>).</summary>
    public static BankData ToBankData(Profile profile, PrivateNote notes, BankRecords r, int currentYear)
    {
        var skillNames = r.Skills.ToDictionary(s => s.Id, s => s.Name);
        BankAchievement Map(Achievement a) => new(
            a.Id,
            a.ShortText,
            a.LongText,
            a.RawText,
            r.SkillIdsOf(a).Where(skillNames.ContainsKey).Select(id => skillNames[id]).ToList(),
            a.Strength);
        bool ForCv(Achievement a) => a.Visibility is "cv" or "both";

        var contact1 = new List<string>();
        var location = profile.Location ?? (notes.Residence.Length > 0 ? notes.Residence : null);
        if (location is not null)
        {
            contact1.Add(location);
        }

        if (profile.ContactEmail is { } email)
        {
            contact1.Add(email);
        }

        if (profile.ContactPhone is { } phone)
        {
            contact1.Add(phone);
        }

        var contact2 = r.Links.Take(Math.Max(0, 5 - contact1.Count)).Select(l => DisplayUrl(l.Url)).ToList();

        return new BankData(
            new BankHeader(profile.DisplayName, profile.Headline, contact1, contact2),
            profile.Summary,
            r.Experiences.Select(e => new BankExperience(e.Id, e.Role, e.Company, e.Location, e.StartDate, e.EndDate,
                r.AchievementsOf(e).Where(ForCv).Select(Map).ToList())).ToList(),
            r.Projects.Select(p => new BankProject(p.Id, p.Name, p.Stack ?? string.Empty,
                r.AchievementsOf(p).Where(ForCv).Select(Map).ToList())).ToList(),
            r.Skills.Where(s => s.IsVisible).Select(s => new BankSkill(
                s.Name,
                s.Category,
                (s.Aliases ?? string.Empty).Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries),
                s.FirstUsedYear,
                s.LastUsedYear,
                r.EvidenceOf(s))).ToList(),
            r.Educations.Select(e => new BankEducation(e.Degree, e.Institution, e.StartYear, e.EndYear, e.Note)).ToList(),
            r.Certifications.Select(c => new BankCertification(c.Name, c.Issuer, c.IssuedYear)).ToList(),
            r.Languages.Select(l => new BankLanguage(l.Language, l.Level, l.Evidence)).ToList(),
            new BankPrivate(notes.Residence, notes.WorkMode, notes.Availability, notes.WorkAuthorization, notes.Avoid),
            notes.ExtraBannedPhrases.Split([',', '\n'], StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries),
            notes.Voice,
            currentYear,
            Competencies: r.Competencies.Select(c => new BankCompetency(c.Id, c.Name, c.Kind, c.Description, c.Evidence)).ToList());
    }

    /// <summary>URL legible para el CV y el perfil: sin <c>https://</c> ni <c>www.</c>, sin barra final.</summary>
    public static string DisplayUrl(string url)
    {
        var text = url.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ? url[8..] : url;
        text = text.StartsWith("www.", StringComparison.OrdinalIgnoreCase) ? text[4..] : text;
        return text.TrimEnd('/');
    }
}
