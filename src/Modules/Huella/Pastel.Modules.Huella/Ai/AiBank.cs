using System.Globalization;
using System.Text;
using System.Text.Json;
using Pastel.Modules.Huella.Cv;
using Pastel.Modules.Huella.Domain;
using Pastel.Modules.Huella.Persistence;

namespace Pastel.Modules.Huella.Ai;

/// <summary>Para qué documento se arma el contexto: decide qué logros y qué elementos se pueden usar.</summary>
internal enum AiPurpose
{
    Cv,
    Profile,
}

/// <summary>
/// El banco en crudo, tal como lo necesita una IA para redactar: relatos completos, sin exigir logros ya pulidos. Es la
/// única fuente de hechos: las empresas, los cargos y las fechas salen de aquí y nunca de lo que escriba la IA. Se excluyen
/// siempre el nombre, el correo, el teléfono y los enlaces de la persona; los datos de contacto los pone el servidor.
/// También ofrece lo que el guardián necesita para comprobar una respuesta (texto de cada entrada y cifras conocidas).
/// </summary>
internal sealed class AiBank
{
    /// <summary>Tope del contexto que se envía. Por encima se recortan primero los relatos de las experiencias más antiguas.</summary>
    public const int ContextBudgetChars = 90_000;

    private static readonly int[] NarrativeCaps = [HuellaLimits.Experience.Narrative, 3000, 1200, 500];

    private readonly Dictionary<Guid, string> _entryText = [];

    public AiBank(Profile profile, PrivateNote notes, BankRecords records, int currentYear)
    {
        Profile = profile;
        Notes = notes;
        Records = records;
        CurrentYear = currentYear;
        Data = BankLoader.ToBankData(profile, notes, records, currentYear);

        var all = new StringBuilder();
        void Take(string? text)
        {
            if (!string.IsNullOrWhiteSpace(text))
            {
                all.Append(text).Append('\n');
            }
        }

        foreach (var e in records.Experiences)
        {
            var text = new StringBuilder().Append(e.Role).Append(' ').Append(e.Company).Append(' ').Append(e.Narrative).Append(' ').Append(e.CompanyContext).Append(' ').Append(e.TeamSize);
            foreach (var a in records.AchievementsOf(e))
            {
                text.Append(' ').Append(a.ShortText).Append(' ').Append(a.LongText).Append(' ').Append(a.RawText).Append(' ').Append(a.ResultValue);
            }

            _entryText[e.Id] = text.ToString();
            Take(text.ToString());
        }

        foreach (var p in records.Projects)
        {
            var text = new StringBuilder().Append(p.Name).Append(' ').Append(p.Stack).Append(' ').Append(p.Summary).Append(' ').Append(p.Approach);
            foreach (var a in records.AchievementsOf(p))
            {
                text.Append(' ').Append(a.ShortText).Append(' ').Append(a.LongText).Append(' ').Append(a.RawText).Append(' ').Append(a.ResultValue);
            }

            _entryText[p.Id] = text.ToString();
            Take(text.ToString());
        }

        Take(profile.Summary);
        Take(profile.Headline);
        Take(notes.Story);
        foreach (var s in records.Skills)
        {
            Take(s.Name + " " + s.Aliases);
        }

        foreach (var e in records.Educations)
        {
            Take($"{e.Degree} {e.Institution} {e.StartYear} {e.EndYear} {e.Note}");
        }

        foreach (var c in records.Certifications)
        {
            Take($"{c.Name} {c.Issuer} {c.IssuedYear}");
        }

        AllText = all.ToString();
        Numbers = AchievementRules.Numbers(AllText).Append(Data.ProfessionalYears().ToString(CultureInfo.InvariantCulture)).ToHashSet(StringComparer.Ordinal);
        FoldedText = TermMatcher.Fold(AllText);
        Data = Data with { EntryTexts = _entryText, AllText = AllText };
    }

    public Profile Profile { get; }

    public PrivateNote Notes { get; }

    public BankRecords Records { get; }

    public int CurrentYear { get; }

    /// <summary>Misma vista que usan el análisis de la oferta, el reporte y el contacto del CV.</summary>
    public BankData Data { get; private set; }

    /// <summary>Todo el texto del banco (relatos, logros, habilidades, formación).</summary>
    public string AllText { get; }

    /// <summary>Cifras que existen en el banco: ninguna otra puede aparecer en un texto redactado por la IA.</summary>
    public IReadOnlySet<string> Numbers { get; }

    public string FoldedText { get; }

    public bool HasContent => Records.Experiences.Count > 0 || Records.Projects.Count > 0;

    /// <summary>Texto en bruto de una experiencia o un proyecto (para comprobar las cifras de sus viñetas).</summary>
    public string EntryText(Guid id) => _entryText.TryGetValue(id, out var text) ? text : string.Empty;

    /// <summary>Cifras que respaldan un texto de una entrada: las de su texto, más las fechas de esa entrada.</summary>
    public IReadOnlySet<string> NumbersOf(Guid entryId)
    {
        var numbers = AchievementRules.Numbers(EntryText(entryId)).ToHashSet(StringComparer.Ordinal);
        if (Records.Experiences.SingleOrDefault(e => e.Id == entryId) is { } e)
        {
            numbers.Add(e.StartDate.Year.ToString(CultureInfo.InvariantCulture));
            numbers.Add((e.EndDate?.Year ?? CurrentYear).ToString(CultureInfo.InvariantCulture));
        }

        return numbers;
    }

    /// <summary>¿El banco menciona este término (habilidad, herramienta)? Sin tildes ni mayúsculas, como palabra completa.</summary>
    public bool Mentions(string term) =>
        TermMatcher.Fold(term) is { Length: > 0 } folded && TermMatcher.Contains(FoldedText, folded);

    private static bool Usable(Achievement a, AiPurpose purpose) =>
        purpose == AiPurpose.Cv ? a.Visibility is "cv" or "both" : a.Visibility is "public" or "both";

    /// <summary>JSON del banco para el prompt. Mismo contenido para el proveedor configurado y para una IA externa.</summary>
    public string ContextJson(AiPurpose purpose)
    {
        var json = string.Empty;
        foreach (var cap in NarrativeCaps)
        {
            json = JsonSerializer.Serialize(Context(purpose, cap), HuellaJson.Options);
            if (json.Length <= ContextBudgetChars)
            {
                break;
            }
        }

        return json;
    }

    private object Context(AiPurpose purpose, int olderNarrativeCap)
    {
        var records = Records;
        var forProfile = purpose == AiPurpose.Profile;
        var skillNames = records.Skills.ToDictionary(s => s.Id, s => s.Name);

        var experiences = records.Experiences
            .Where(e => !forProfile || e.IsVisible)
            .OrderByDescending(e => e.EndDate ?? DateOnly.MaxValue).ThenByDescending(e => e.StartDate)
            .Select((e, rank) =>
            {
                var achievements = records.AchievementsOf(e).Where(a => Usable(a, purpose)).ToList();
                return new
                {
                    id = e.Id,
                    role = e.Role,
                    marketRole = e.MarketRole,
                    company = e.Company,
                    location = e.Location,
                    employmentType = e.EmploymentType,
                    workMode = e.WorkMode,
                    start = MonthDate.Format(e.StartDate),
                    end = MonthDate.Format(e.EndDate),
                    current = e.EndDate is null,
                    companyContext = e.CompanyContext,
                    teamSize = e.TeamSize,
                    narrative = rank < 3 ? e.Narrative : Cap(e.Narrative, olderNarrativeCap),
                    achievements = achievements.Select(a => new { id = a.Id, text = a.LongText, result = Result(a) }),
                    skills = achievements.SelectMany(a => records.SkillIdsOf(a)).Where(skillNames.ContainsKey).Select(id => skillNames[id]).Distinct(),
                };
            }).ToList();

        var projects = records.Projects
            .Where(p => !forProfile || p.IsVisible)
            .OrderByDescending(p => p.EndYear ?? int.MaxValue).ThenByDescending(p => p.StartYear)
            .Select(p =>
            {
                var achievements = records.AchievementsOf(p).Where(a => Usable(a, purpose)).ToList();
                return new
                {
                    id = p.Id,
                    name = p.Name,
                    stack = p.Stack,
                    url = p.Url,
                    years = Years(p.StartYear, p.EndYear),
                    summary = p.Summary,
                    approach = p.Approach,
                    achievements = achievements.Select(a => new { id = a.Id, text = a.LongText, result = Result(a) }),
                };
            }).ToList();

        var doNotUse = records.Achievements
            .Where(a => !Usable(a, purpose))
            .Select(a => a.LongText)
            .ToList();

        return new
        {
            person = new
            {
                yearsOfExperience = Data.ProfessionalYears(),
                currentHeadline = Profile.Headline,
                currentSummary = Profile.Summary,
                story = Notes.Story,
                voice = Notes.Voice,
                avoid = Notes.Avoid,
            },
            experiences,
            projects,
            skills = records.Skills.Where(s => !forProfile || s.IsVisible)
                .Select(s => new { name = s.Name, category = s.Category, firstUsed = s.FirstUsedYear, lastUsed = s.LastUsedYear }),
            education = records.Educations.Where(e => !forProfile || e.IsVisible)
                .Select(e => new { id = e.Id, degree = e.Degree, institution = e.Institution, years = Years(e.StartYear, e.EndYear), note = e.Note }),
            certifications = records.Certifications.Where(c => !forProfile || c.IsVisible)
                .Select(c => new { id = c.Id, name = c.Name, issuer = c.Issuer, year = c.IssuedYear }),
            languages = records.Languages.Where(l => !forProfile || l.IsVisible)
                .Select(l => new { id = l.Id, language = l.Language, level = l.Level, evidence = l.Evidence }),
            doNotUse,
        };
    }

    private static string? Result(Achievement a) =>
        a.ResultValue is { Length: > 0 } v ? (a.ResultUnit is { Length: > 0 } u ? $"{v} {u}" : v) : null;

    private static string? Years(int? start, int? end) =>
        (start, end) switch
        {
            ({ } s, { } e) => $"{s}-{e}",
            ({ } s, null) => $"{s}-",
            (null, { } e) => $"-{e}",
            _ => null,
        };

    private static string Cap(string text, int max) => text.Length <= max ? text : text[..max] + "…";
}
