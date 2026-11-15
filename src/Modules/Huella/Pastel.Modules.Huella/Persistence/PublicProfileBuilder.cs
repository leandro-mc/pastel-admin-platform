using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Pastel.Modules.Huella.Cv;
using Pastel.Modules.Huella.Domain;

namespace Pastel.Modules.Huella.Persistence;

/// <summary>Arma el <see cref="PublicProfileDocument"/> desde el borrador con una lista blanca de campos.</summary>
internal static class PublicProfileBuilder
{
    public static bool IsPublishable(Profile profile) =>
        profile.DisplayName.Trim().Length > 0 && profile.Headline.Trim().Length > 0;

    public static PublicProfileDocument Build(Profile profile, BankRecords r, int currentYear, bool hasCv)
    {
        bool IsPublic(Achievement a) => a.Visibility is "public" or "both";
        PublicLedgerLine Line(Achievement a) =>
            new(a.ResultValue is { } v ? (a.ResultUnit is { } u ? $"{v} {u}" : v) : null, a.LongText);

        var experiences = r.Experiences.Where(e => e.IsVisible)
            .OrderByDescending(e => e.EndDate ?? DateOnly.MaxValue).ThenByDescending(e => e.StartDate).ToList();
        var current = experiences.FirstOrDefault(e => e.EndDate is null);
        var previous = experiences.FirstOrDefault(e => e != current);
        var professional = r.Experiences
            .Where(e => !TermMatcher.Fold(e.Role).Contains("practicante", StringComparison.Ordinal))
            .Select(e => e.StartDate.Year).ToList();

        var visibleExperienceIds = experiences.Select(e => e.Id).ToHashSet();
        var visibleProjectIds = r.Projects.Where(p => p.IsVisible).Select(p => p.Id).ToHashSet();
        var publicAchievements = r.Achievements
            .Where(a => IsPublic(a)
                && ((a.ExperienceId is { } eid && visibleExperienceIds.Contains(eid)) || (a.ProjectId is { } pid && visibleProjectIds.Contains(pid))))
            .ToList();
        var publicAchievementIds = publicAchievements.Select(a => a.Id).ToHashSet();

        return new PublicProfileDocument(
            profile.DisplayName,
            profile.Headline,
            profile.Summary,
            profile.ShowLocation ? profile.Location : null,
            profile.ShowAvailability ? profile.Availability : null,
            new PublicContact(profile.ShowContactEmail ? profile.ContactEmail : null, profile.ShowContactPhone ? profile.ContactPhone : null),
            r.Links.Where(l => l.IsPublic).Select(l => new PublicLink(l.Kind, l.Label, l.Url)).ToList(),
            new PublicFacts(
                professional.Count == 0 ? 0 : Math.Max(0, currentYear - professional.Min()),
                current?.Role,
                current?.Company,
                current is null ? null : MonthDate.Format(current.StartDate),
                previous?.Role,
                previous?.Company,
                previous is null ? null : $"{previous.StartDate.Year.ToString(CultureInfo.InvariantCulture)}-{(previous.EndDate?.Year ?? currentYear).ToString(CultureInfo.InvariantCulture)}"),
            publicAchievements.Where(a => a.ResultValue is not null || a.LongText.Any(char.IsDigit))
                .OrderByDescending(a => a.Strength).ThenBy(a => a.SortOrder).Take(3).Select(Line).ToList(),
            experiences.Select(e => new PublicExperience(
                e.MarketRole ?? e.Role,
                e.Company,
                e.Location,
                MonthDate.Format(e.StartDate),
                MonthDate.Format(e.EndDate),
                r.AchievementsOf(e).Where(a => publicAchievementIds.Contains(a.Id)).Select(Line).ToList())).ToList(),
            r.Projects.Where(p => p.IsVisible).Select(p => new PublicProject(
                p.Name,
                p.Url,
                p.Stack,
                p.Summary,
                r.AchievementsOf(p).Where(a => publicAchievementIds.Contains(a.Id)).Select(Line).ToList())).ToList(),
            r.Skills.Where(s => s.IsVisible).Select(s =>
            {
                var evidence = r.AchievementSkills.Count(x => x.SkillId == s.Id && publicAchievementIds.Contains(x.AchievementId));
                var last = s.LastUsedYear ?? currentYear;
                var recency = last >= currentYear - 1 ? "current" : last >= currentYear - 3 ? "recent" : "earlier";
                return new PublicSkill(s.Name, s.Category, recency, evidence);
            }).ToList(),
            r.Educations.Where(e => e.IsVisible).Select(e => new PublicEducation(e.Degree, e.Institution, e.StartYear, e.EndYear, e.Note)).ToList(),
            r.Certifications.Where(c => c.IsVisible).Select(c => new PublicCertification(c.Name, c.Issuer, c.IssuedYear, c.CredentialUrl)).ToList(),
            r.Languages.Where(l => l.IsVisible).Select(l => new PublicLanguage(l.Language, l.Level, l.Evidence)).ToList(),
            hasCv);
    }

    /// <summary>Huella digital del contenido: decide si hay cambios sin publicar y alimenta la huella generativa.</summary>
    public static byte[] Hash(string json) => SHA256.HashData(Encoding.UTF8.GetBytes(json));
}
