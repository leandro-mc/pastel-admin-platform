using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Pastel.Modules.Huella.Cv;
using Pastel.Modules.Huella.Domain;
using Pastel.Modules.Huella.Features.PublicContent;

namespace Pastel.Modules.Huella.Persistence;

/// <summary>
/// Arma el <see cref="PublicProfileDocument"/> con una lista blanca de campos. El texto sale del contenido redactado
/// (<see cref="ProfileContent"/>, español e inglés), no del banco; del banco solo salen datos objetivos como los años de
/// experiencia. Si una sección todavía no existe en inglés se publica la versión en español en su lugar, para que ninguna
/// página quede vacía.
/// </summary>
internal static class PublicProfileBuilder
{
    public static bool IsPublishable(Profile profile) =>
        profile.DisplayName.Trim().Length > 0 && profile.Headline.Trim().Length > 0;

    public static PublicProfileDocument Build(Profile profile, BankRecords r, ProfileContent? content, int currentYear, bool hasCv)
    {
        var es = HuellaJson.Deserialize<ContentDoc>(content?.EsJson) ?? new ContentDoc();
        var en = HuellaJson.Deserialize<ContentDoc>(content?.EnJson) ?? new ContentDoc();
        // Lo que la persona ocultó o borró del banco después de redactar el perfil no se publica.
        FilterToBank(es, r);
        FilterToBank(en, r);
        if (es.Headline.Length == 0)
        {
            es.Headline = profile.Headline;
        }

        if (es.Summary.Length == 0)
        {
            es.Summary = profile.Summary;
        }

        foreach (var section in ContentSections.All.Where(s => ContentSections.IsEmpty(en, s)))
        {
            ContentSections.Copy(es, en, section);
        }

        return new PublicProfileDocument(
            profile.DisplayName,
            profile.ShowLocation ? profile.Location : null,
            profile.ShowAvailability ? profile.Availability : null,
            new PublicContact(profile.ShowContactEmail ? profile.ContactEmail : null, profile.ShowContactPhone ? profile.ContactPhone : null),
            r.Links.Where(l => l.IsPublic).Select(l => new PublicLink(l.Kind, l.Label, l.Url, l.Icon)).ToList(),
            hasCv,
            Localize(es, r, currentYear),
            Localize(en, r, currentYear));
    }

    private static void FilterToBank(ContentDoc doc, BankRecords r)
    {
        var experiences = r.Experiences.Where(e => e.IsVisible).Select(e => e.Id).ToHashSet();
        var projects = r.Projects.Where(p => p.IsVisible).Select(p => p.Id).ToHashSet();
        var education = r.Educations.Where(e => e.IsVisible).Select(e => e.Id).ToHashSet();
        var certifications = r.Certifications.Where(c => c.IsVisible).Select(c => c.Id).ToHashSet();
        var languages = r.Languages.Where(l => l.IsVisible).Select(l => l.Id).ToHashSet();
        var hiddenSkills = r.Skills.Where(x => !x.IsVisible).Select(x => TermMatcher.Fold(x.Name)).ToHashSet(StringComparer.Ordinal);
        doc.Experience.RemoveAll(x => !experiences.Contains(x.SourceId));
        doc.Projects.RemoveAll(x => !projects.Contains(x.SourceId));
        doc.Education.RemoveAll(x => !education.Contains(x.SourceId));
        doc.Certifications.RemoveAll(x => !certifications.Contains(x.SourceId));
        doc.Languages.RemoveAll(x => !languages.Contains(x.SourceId));
        foreach (var group in doc.Skills)
        {
            group.Items.RemoveAll(item => hiddenSkills.Contains(TermMatcher.Fold(item)));
        }

        doc.Skills.RemoveAll(g => g.Items.Count == 0);
    }

    private static PublicLocalized Localize(ContentDoc doc, BankRecords r, int currentYear) =>
        new(
            doc.Headline,
            doc.Summary,
            Facts(doc, r, currentYear),
            doc.Highlights.Select(h => new PublicLedgerLine(h.Figure, h.Text)).ToList(),
            doc.Experience.Select(e => new PublicExperience(e.Role, e.Company, e.Location, e.Start, e.End, e.Bullets.Select(b => new PublicLedgerLine(null, b)).ToList())).ToList(),
            doc.Projects.Select(p => new PublicProject(p.Name, p.Url, p.Stack, p.Summary)).ToList(),
            doc.Skills.Select(g => new PublicSkillGroup(g.Label, g.Items)).ToList(),
            doc.Education.Select(e => new PublicEducation(e.Degree, e.Institution, e.StartYear, e.EndYear, e.Note)).ToList(),
            doc.Certifications.Select(c => new PublicCertification(c.Name, c.Issuer, c.Year, c.Url)).ToList(),
            doc.Languages.Select(l => new PublicLanguage(l.Language, l.Level)).ToList());

    /// <summary>Ficha objetiva: años de experiencia del banco y cargo actual y anterior (con el nombre del cargo en el idioma del perfil).</summary>
    private static PublicFacts Facts(ContentDoc doc, BankRecords r, int currentYear)
    {
        var experiences = r.Experiences.Where(e => e.IsVisible)
            .OrderByDescending(e => e.EndDate ?? DateOnly.MaxValue).ThenByDescending(e => e.StartDate).ToList();
        var current = experiences.FirstOrDefault(e => e.EndDate is null);
        var previous = experiences.FirstOrDefault(e => e != current);
        var professional = r.Experiences
            .Where(e => !TermMatcher.Fold(e.Role).Contains("practicante", StringComparison.Ordinal) && !TermMatcher.Fold(e.Role).Contains("intern", StringComparison.Ordinal))
            .Select(e => e.StartDate.Year).ToList();

        string? RoleOf(Experience? e) => e is null ? null : doc.Experience.FirstOrDefault(x => x.SourceId == e.Id)?.Role ?? e.MarketRole ?? e.Role;

        return new PublicFacts(
            professional.Count == 0 ? 0 : Math.Max(0, currentYear - professional.Min()),
            RoleOf(current),
            current?.Company,
            current is null ? null : MonthDate.Format(current.StartDate),
            RoleOf(previous),
            previous?.Company,
            previous is null ? null : $"{previous.StartDate.Year.ToString(CultureInfo.InvariantCulture)}-{(previous.EndDate?.Year ?? currentYear).ToString(CultureInfo.InvariantCulture)}");
    }

    /// <summary>Huella digital del contenido: decide si hay cambios sin publicar y alimenta la huella generativa.</summary>
    public static byte[] Hash(string json) => SHA256.HashData(Encoding.UTF8.GetBytes(json));
}
