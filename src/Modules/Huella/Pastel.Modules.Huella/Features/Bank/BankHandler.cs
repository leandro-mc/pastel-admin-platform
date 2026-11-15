using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Huella.Cv;
using Pastel.Modules.Huella.Domain;
using Pastel.Modules.Huella.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Huella.Features.Bank;

/// <summary>
/// Banco privado del propietario. Cada sección se guarda completa: los elementos con <c>Id</c> se actualizan, los que
/// faltan se borran y los nuevos se crean con un <c>Guid</c> v7 del servidor. Un <c>Id</c> que no pertenece al perfil de
/// la sesión responde 404 sin tocar nada (aislamiento del propietario).
/// </summary>
internal sealed class BankHandler(HuellaDbContext db, OwnerProfiles owners, BankLoader loader, IClock clock)
{
    public const int MaxExperiences = 40;
    public const int MaxProjects = 40;
    public const int MaxSkills = 150;
    public const int MaxEducation = 20;
    public const int MaxCertifications = 40;
    public const int MaxLanguages = 15;
    public const int MaxAchievementsPerParent = 40;

    private static readonly string[] EmploymentTypes = ["full_time", "part_time", "contract", "freelance", "internship", "volunteer"];
    private static readonly string[] WorkModes = ["remote", "hybrid", "onsite"];
    private static readonly string[] LanguageLevels = ["Nativo", "C2", "C1", "B2", "B1", "A2", "A1"];
    private static readonly string[] Sources = ["rules", "ai", "manual"];

    public async Task<Result<BankView>> GetAsync(CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        return await ViewAsync(profile.Value, cancellationToken);
    }

    private async Task<BankView> ViewAsync(Profile profile, CancellationToken cancellationToken)
    {
        var notes = await owners.GetNotesAsync(profile, cancellationToken);
        var r = await loader.LoadAsync(profile.Id, cancellationToken);
        AchievementView A(Achievement a) => new(
            a.Id, a.ShortText, a.LongText, a.RawText, a.ResultValue, a.ResultUnit, a.ResultBaseline, a.ImpactType, a.Strength,
            a.Verified, a.Source, a.Visibility, r.SkillIdsOf(a));
        return new BankView(
            new NotesView(notes.Story, notes.Voice, notes.Residence, notes.WorkMode, notes.Availability, notes.WorkAuthorization,
                notes.SalaryExpectation, notes.Avoid, notes.PreferredLanguage, notes.PreferredPaper, notes.ExtraBannedPhrases),
            r.Experiences.Select(e => new ExperienceView(
                e.Id, e.Role, e.MarketRole, e.Company, e.Location, e.EmploymentType, e.WorkMode, MonthDate.Format(e.StartDate),
                MonthDate.Format(e.EndDate), e.Narrative, e.CompanyContext, e.TeamSize, e.IsVisible, r.AchievementsOf(e).Select(A).ToList())).ToList(),
            r.Projects.Select(p => new ProjectView(
                p.Id, p.Name, p.Url, p.Summary, p.Approach, p.Stack, p.StartYear, p.EndYear, p.IsVisible, r.AchievementsOf(p).Select(A).ToList())).ToList(),
            r.Skills.Select(s => new SkillView(s.Id, s.Name, s.Aliases, s.Category, s.FirstUsedYear, s.LastUsedYear, s.Why, s.IsVisible, r.EvidenceOf(s))).ToList(),
            r.Educations.Select(e => new EducationView(e.Id, e.Degree, e.Institution, e.StartYear, e.EndYear, e.Note, e.IsVisible)).ToList(),
            r.Certifications.Select(c => new CertificationView(c.Id, c.Name, c.Issuer, c.IssuedYear, c.ExpiresYear, c.CredentialUrl, c.IsVisible)).ToList(),
            r.Languages.Select(l => new LanguageView(l.Id, l.Language, l.Level, l.Evidence, l.IsVisible)).ToList());
    }

    // ───────────────────────────── Notas privadas ─────────────────────────────
    public async Task<Result<BankView>> SaveNotesAsync(NotesInput input, CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var errors = new FieldErrors();
        var story = errors.Text("story", input.Story, HuellaLimits.PrivateNote.Story);
        var voice = errors.Text("voice", input.Voice, HuellaLimits.PrivateNote.Voice);
        var residence = errors.Text("residence", input.Residence, HuellaLimits.PrivateNote.Residence);
        var workMode = errors.Text("workMode", input.WorkMode, HuellaLimits.PrivateNote.WorkMode);
        var availability = errors.Text("availability", input.Availability, HuellaLimits.PrivateNote.Availability);
        var authorization = errors.Text("workAuthorization", input.WorkAuthorization, HuellaLimits.PrivateNote.WorkAuthorization);
        var salary = errors.Text("salaryExpectation", input.SalaryExpectation, HuellaLimits.PrivateNote.SalaryExpectation);
        var avoid = errors.Text("avoid", input.Avoid, HuellaLimits.PrivateNote.Avoid);
        var language = errors.OneOf("preferredLanguage", input.PreferredLanguage, CvLimits.Languages.ToArray(), "es");
        var paper = errors.OneOf("preferredPaper", input.PreferredPaper, CvLimits.Papers.ToArray(), "letter");
        var banned = errors.Text("extraBannedPhrases", input.ExtraBannedPhrases, HuellaLimits.PrivateNote.ExtraBannedPhrases);
        if (errors.Any)
        {
            return HuellaErrors.Invalid(errors.ToDictionary());
        }

        var notes = await owners.GetNotesAsync(profile.Value, cancellationToken);
        notes.Story = story;
        notes.Voice = voice;
        notes.Residence = residence;
        notes.WorkMode = workMode;
        notes.Availability = availability;
        notes.WorkAuthorization = authorization;
        notes.SalaryExpectation = salary;
        notes.Avoid = avoid;
        notes.PreferredLanguage = language;
        notes.PreferredPaper = paper;
        notes.ExtraBannedPhrases = banned;
        notes.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return await ViewAsync(profile.Value, cancellationToken);
    }

    // ───────────────────────────── Experiencias ─────────────────────────────
    public Task<Result<BankView>> SaveExperiencesAsync(IReadOnlyList<ExperienceInput>? items, CancellationToken cancellationToken) =>
        SaveSectionAsync(
            items, MaxExperiences, db.Experiences, x => x.Id, x => x.Id,
            (i, item, errors) =>
            {
                var prefix = $"items[{i}].";
                var role = errors.RequiredLine(prefix + "role", item.Role, HuellaLimits.Experience.Role);
                var company = errors.RequiredLine(prefix + "company", item.Company, HuellaLimits.Experience.Company);
                var hasStart = MonthDate.TryParse(item.Start, out var start);
                if (!hasStart)
                {
                    errors.Add(prefix + "start", "Escriba el mes de inicio como AAAA-MM.");
                }

                DateOnly? end = null;
                if (!string.IsNullOrWhiteSpace(item.End))
                {
                    if (MonthDate.TryParse(item.End, out var e))
                    {
                        end = e;
                        if (hasStart && e < start)
                        {
                            errors.Add(prefix + "end", "La fecha de fin no puede ser anterior al inicio.");
                        }
                    }
                    else
                    {
                        errors.Add(prefix + "end", "Escriba el mes de fin como AAAA-MM o déjelo vacío si es su cargo actual.");
                    }
                }

                var employment = item.EmploymentType is null ? null : errors.OneOf(prefix + "employmentType", item.EmploymentType, EmploymentTypes, string.Empty);
                var mode = item.WorkMode is null ? null : errors.OneOf(prefix + "workMode", item.WorkMode, WorkModes, string.Empty);
                if (item.TeamSize is < 0 or > 100000)
                {
                    errors.Add(prefix + "teamSize", "Escriba un número entre 0 y 100000.");
                }

                var values = new
                {
                    role,
                    company,
                    start,
                    end,
                    employment,
                    mode,
                    market = errors.OptionalLine(prefix + "marketRole", item.MarketRole, HuellaLimits.Experience.MarketRole),
                    location = errors.OptionalLine(prefix + "location", item.Location, HuellaLimits.Experience.Location),
                    narrative = errors.Text(prefix + "narrative", item.Narrative, HuellaLimits.Experience.Narrative),
                    context = errors.OptionalLine(prefix + "companyContext", item.CompanyContext, HuellaLimits.Experience.CompanyContext),
                };
                return (Experience x, int order, DateTimeOffset now) =>
                {
                    x.Role = values.role;
                    x.Company = values.company;
                    x.MarketRole = values.market;
                    x.Location = values.location;
                    x.EmploymentType = string.IsNullOrEmpty(values.employment) ? null : values.employment;
                    x.WorkMode = string.IsNullOrEmpty(values.mode) ? null : values.mode;
                    x.StartDate = values.start;
                    x.EndDate = values.end;
                    x.Narrative = values.narrative;
                    x.CompanyContext = values.context;
                    x.TeamSize = item.TeamSize;
                    x.IsVisible = item.IsVisible ?? true;
                    x.SortOrder = order;
                    x.UpdatedAt = now;
                };
            },
            (profileId, now) => new Experience { Id = Guid.CreateVersion7(), ProfileId = profileId, CreatedAt = now },
            cancellationToken);

    // ───────────────────────────── Proyectos ─────────────────────────────
    public Task<Result<BankView>> SaveProjectsAsync(IReadOnlyList<ProjectInput>? items, CancellationToken cancellationToken) =>
        SaveSectionAsync(
            items, MaxProjects, db.Projects, x => x.Id, x => x.Id,
            (i, item, errors) =>
            {
                var prefix = $"items[{i}].";
                var name = errors.RequiredLine(prefix + "name", item.Name, HuellaLimits.Project.Name);
                var url = errors.OptionalLink(prefix + "url", item.Url);
                var summary = errors.Text(prefix + "summary", item.Summary, HuellaLimits.Project.Summary);
                var approach = errors.Text(prefix + "approach", item.Approach, HuellaLimits.Project.Approach);
                var stack = errors.OptionalLine(prefix + "stack", item.Stack, HuellaLimits.Project.Stack);
                var startYear = errors.Year(prefix + "startYear", item.StartYear);
                var endYear = errors.Year(prefix + "endYear", item.EndYear);
                return (Project x, int order, DateTimeOffset now) =>
                {
                    x.Name = name;
                    x.Url = url;
                    x.Summary = summary;
                    x.Approach = approach;
                    x.Stack = stack;
                    x.StartYear = startYear;
                    x.EndYear = endYear;
                    x.IsVisible = item.IsVisible ?? true;
                    x.SortOrder = order;
                    x.UpdatedAt = now;
                };
            },
            (profileId, now) => new Project { Id = Guid.CreateVersion7(), ProfileId = profileId, CreatedAt = now },
            cancellationToken);

    // ───────────────────────────── Habilidades ─────────────────────────────
    public Task<Result<BankView>> SaveSkillsAsync(IReadOnlyList<SkillInput>? items, CancellationToken cancellationToken)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);
        return SaveSectionAsync(
            items, MaxSkills, db.Skills, x => x.Id, x => x.Id,
            (i, item, errors) =>
            {
                var prefix = $"items[{i}].";
                var name = errors.RequiredLine(prefix + "name", item.Name, HuellaLimits.Skill.Name);
                var normalized = TermMatcher.Fold(name);
                if (normalized.Length > 0 && !seen.Add(normalized))
                {
                    errors.Add(prefix + "name", "Esta habilidad ya está en la lista.");
                }

                var aliases = errors.OptionalLine(prefix + "aliases", item.Aliases, HuellaLimits.Skill.Aliases);
                var category = errors.OptionalLine(prefix + "category", item.Category, HuellaLimits.Skill.Category) ?? "Otras";
                var first = errors.Year(prefix + "firstUsedYear", item.FirstUsedYear);
                var last = errors.Year(prefix + "lastUsedYear", item.LastUsedYear);
                if (first is { } f && last is { } l && l < f)
                {
                    errors.Add(prefix + "lastUsedYear", "El último año de uso no puede ser anterior al primero.");
                }

                var why = errors.Text(prefix + "why", item.Why, HuellaLimits.Skill.Why);
                return (Skill x, int order, DateTimeOffset now) =>
                {
                    x.Name = name;
                    x.NormalizedName = normalized.Length > HuellaLimits.Skill.NormalizedName ? normalized[..HuellaLimits.Skill.NormalizedName] : normalized;
                    x.Aliases = aliases;
                    x.Category = category;
                    x.FirstUsedYear = first;
                    x.LastUsedYear = last;
                    x.Why = why;
                    x.IsVisible = item.IsVisible ?? true;
                    x.SortOrder = order;
                    x.UpdatedAt = now;
                };
            },
            (profileId, now) => new Skill { Id = Guid.CreateVersion7(), ProfileId = profileId, CreatedAt = now },
            cancellationToken);
    }

    // ───────────────────────────── Educación, certificaciones, idiomas ─────────────────────────────
    public Task<Result<BankView>> SaveEducationsAsync(IReadOnlyList<EducationInput>? items, CancellationToken cancellationToken) =>
        SaveSectionAsync(
            items, MaxEducation, db.Educations, x => x.Id, x => x.Id,
            (i, item, errors) =>
            {
                var prefix = $"items[{i}].";
                var degree = errors.RequiredLine(prefix + "degree", item.Degree, HuellaLimits.Education.Degree);
                var institution = errors.RequiredLine(prefix + "institution", item.Institution, HuellaLimits.Education.Institution);
                var start = errors.Year(prefix + "startYear", item.StartYear);
                var end = errors.Year(prefix + "endYear", item.EndYear);
                var note = errors.OptionalLine(prefix + "note", item.Note, HuellaLimits.Education.Note);
                return (Education x, int order, DateTimeOffset now) =>
                {
                    x.Degree = degree;
                    x.Institution = institution;
                    x.StartYear = start;
                    x.EndYear = end;
                    x.Note = note;
                    x.IsVisible = item.IsVisible ?? true;
                    x.SortOrder = order;
                    x.UpdatedAt = now;
                };
            },
            (profileId, now) => new Education { Id = Guid.CreateVersion7(), ProfileId = profileId, CreatedAt = now },
            cancellationToken);

    public Task<Result<BankView>> SaveCertificationsAsync(IReadOnlyList<CertificationInput>? items, CancellationToken cancellationToken) =>
        SaveSectionAsync(
            items, MaxCertifications, db.Certifications, x => x.Id, x => x.Id,
            (i, item, errors) =>
            {
                var prefix = $"items[{i}].";
                var name = errors.RequiredLine(prefix + "name", item.Name, HuellaLimits.Certification.Name);
                var issuer = errors.OptionalLine(prefix + "issuer", item.Issuer, HuellaLimits.Certification.Issuer);
                var issued = errors.Year(prefix + "issuedYear", item.IssuedYear);
                var expires = errors.Year(prefix + "expiresYear", item.ExpiresYear);
                var url = errors.OptionalLink(prefix + "credentialUrl", item.CredentialUrl);
                return (Certification x, int order, DateTimeOffset now) =>
                {
                    x.Name = name;
                    x.Issuer = issuer;
                    x.IssuedYear = issued;
                    x.ExpiresYear = expires;
                    x.CredentialUrl = url;
                    x.IsVisible = item.IsVisible ?? true;
                    x.SortOrder = order;
                    x.UpdatedAt = now;
                };
            },
            (profileId, now) => new Certification { Id = Guid.CreateVersion7(), ProfileId = profileId, CreatedAt = now },
            cancellationToken);

    public Task<Result<BankView>> SaveLanguagesAsync(IReadOnlyList<LanguageInput>? items, CancellationToken cancellationToken) =>
        SaveSectionAsync(
            items, MaxLanguages, db.LanguageSkills, x => x.Id, x => x.Id,
            (i, item, errors) =>
            {
                var prefix = $"items[{i}].";
                var language = errors.RequiredLine(prefix + "language", item.Language, HuellaLimits.LanguageSkill.Language);
                var level = errors.OneOf(prefix + "level", item.Level, LanguageLevels, "B1");
                var evidence = errors.OptionalLine(prefix + "evidence", item.Evidence, HuellaLimits.LanguageSkill.Evidence);
                return (LanguageSkill x, int order, DateTimeOffset now) =>
                {
                    x.Language = language;
                    x.Level = level;
                    x.Evidence = evidence;
                    x.IsVisible = item.IsVisible ?? true;
                    x.SortOrder = order;
                    x.UpdatedAt = now;
                };
            },
            (profileId, now) => new LanguageSkill { Id = Guid.CreateVersion7(), ProfileId = profileId, CreatedAt = now },
            cancellationToken);

    /// <summary>
    /// Guardado de una sección completa: valida todo antes de tocar la base, comprueba que cada <c>Id</c> recibido es del
    /// perfil (si no, 404), actualiza, crea y borra en una sola unidad de trabajo.
    /// </summary>
    private async Task<Result<BankView>> SaveSectionAsync<TEntity, TInput>(
        IReadOnlyList<TInput>? items,
        int max,
        DbSet<TEntity> set,
        Func<TEntity, Guid> idOf,
        Func<TInput, Guid?> inputIdOf,
        Func<int, TInput, FieldErrors, Action<TEntity, int, DateTimeOffset>> validate,
        Func<Guid, DateTimeOffset, TEntity> create,
        CancellationToken cancellationToken)
        where TEntity : class, IProfileOwned
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var list = items ?? [];
        var errors = new FieldErrors();
        if (list.Count > max)
        {
            errors.Add("items", $"Puede guardar como máximo {max} elementos en esta sección.");
            return HuellaErrors.Invalid(errors.ToDictionary());
        }

        var appliers = list.Select((item, i) => validate(i, item, errors)).ToList();
        if (errors.Any)
        {
            return HuellaErrors.Invalid(errors.ToDictionary());
        }

        var profileId = profile.Value.Id;
        var existing = await set.Where(x => x.ProfileId == profileId).ToListAsync(cancellationToken);
        var byId = existing.ToDictionary(idOf);
        var requested = list.Select(inputIdOf).Where(id => id is not null).Select(id => id!.Value).ToList();
        if (requested.Count != requested.Distinct().Count() || requested.Any(id => !byId.ContainsKey(id)))
        {
            return HuellaErrors.NotFound;
        }

        var now = clock.UtcNow;
        for (var i = 0; i < list.Count; i++)
        {
            var entity = inputIdOf(list[i]) is { } id ? byId[id] : create(profileId, now);
            if (inputIdOf(list[i]) is null)
            {
                set.Add(entity);
            }

            appliers[i](entity, i, now);
        }

        var keep = requested.ToHashSet();
        set.RemoveRange(existing.Where(x => !keep.Contains(idOf(x))));
        owners.Touch(profile.Value);
        await db.SaveChangesAsync(cancellationToken);
        return await ViewAsync(profile.Value, cancellationToken);
    }

    // ───────────────────────────── Logros ─────────────────────────────
    public async Task<Result<BankView>> SaveAchievementsAsync(string kind, Guid parentId, IReadOnlyList<AchievementInput>? items, CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var parent = await FindParentAsync(kind, parentId, profile.Value.Id, cancellationToken);
        if (parent is null)
        {
            return HuellaErrors.NotFound;
        }

        var list = items ?? [];
        var errors = new FieldErrors();
        if (list.Count > MaxAchievementsPerParent)
        {
            errors.Add("items", $"Puede guardar como máximo {MaxAchievementsPerParent} logros por entrada.");
            return HuellaErrors.Invalid(errors.ToDictionary());
        }

        var skillIds = await db.Skills.Where(s => s.ProfileId == profile.Value.Id).Select(s => s.Id).ToListAsync(cancellationToken);
        var ownedSkills = skillIds.ToHashSet();
        for (var i = 0; i < list.Count; i++)
        {
            var item = list[i];
            var prefix = $"items[{i}].";
            errors.RequiredLine(prefix + "shortText", item.ShortText, HuellaLimits.Achievement.ShortText);
            errors.RequiredLine(prefix + "longText", item.LongText, HuellaLimits.Achievement.LongText);
            errors.OptionalLine(prefix + "rawText", item.RawText, HuellaLimits.Achievement.RawText);
            errors.OptionalLine(prefix + "resultValue", item.ResultValue, HuellaLimits.Achievement.ResultValue);
            errors.OptionalLine(prefix + "resultUnit", item.ResultUnit, HuellaLimits.Achievement.ResultUnit);
            errors.OptionalLine(prefix + "resultBaseline", item.ResultBaseline, HuellaLimits.Achievement.ResultBaseline);
            errors.OneOf(prefix + "impactType", item.ImpactType, AchievementRules.ImpactTypes.ToArray(), "other");
            errors.OneOf(prefix + "visibility", item.Visibility, AchievementRules.Visibilities.ToArray(), "both");
            errors.OneOf(prefix + "source", item.Source, Sources, "manual");
            if (item.Strength is < 1 or > 5)
            {
                errors.Add(prefix + "strength", "La fuerza va de 1 a 5.");
            }

            if (item.SkillIds is { } ids && ids.Any(id => !ownedSkills.Contains(id)))
            {
                // Una habilidad ajena al perfil se trata como inexistente.
                return HuellaErrors.NotFound;
            }
        }

        if (errors.Any)
        {
            return HuellaErrors.Invalid(errors.ToDictionary());
        }

        var existing = kind == "projects"
            ? await db.Achievements.Where(a => a.ProjectId == parentId).ToListAsync(cancellationToken)
            : await db.Achievements.Where(a => a.ExperienceId == parentId).ToListAsync(cancellationToken);
        var byId = existing.ToDictionary(a => a.Id);
        var requested = list.Where(x => x.Id is not null).Select(x => x.Id!.Value).ToList();
        if (requested.Count != requested.Distinct().Count() || requested.Any(id => !byId.ContainsKey(id)))
        {
            return HuellaErrors.NotFound;
        }

        var existingIds = existing.Select(a => a.Id).ToList();
        var oldLinks = await db.AchievementSkills.Where(x => existingIds.Contains(x.AchievementId)).ToListAsync(cancellationToken);
        var desiredLinks = new HashSet<(Guid AchievementId, Guid SkillId)>();

        var now = clock.UtcNow;
        for (var i = 0; i < list.Count; i++)
        {
            var item = list[i];
            var a = item.Id is { } id ? byId[id] : new Achievement
            {
                Id = Guid.CreateVersion7(),
                ExperienceId = kind == "projects" ? null : parentId,
                ProjectId = kind == "projects" ? parentId : null,
                CreatedAt = now,
            };
            if (item.Id is null)
            {
                db.Achievements.Add(a);
            }

            a.ShortText = TextInput.CleanLine(item.ShortText);
            a.LongText = TextInput.CleanLine(item.LongText);
            a.RawText = TextInput.CleanLineOptional(item.RawText);
            a.ResultValue = TextInput.CleanLineOptional(item.ResultValue);
            a.ResultUnit = TextInput.CleanLineOptional(item.ResultUnit);
            a.ResultBaseline = TextInput.CleanLineOptional(item.ResultBaseline);
            a.ImpactType = string.IsNullOrWhiteSpace(item.ImpactType) ? "other" : item.ImpactType.Trim();
            a.Strength = (short)(item.Strength ?? 3);
            a.Verified = item.Verified ?? false;
            a.Source = string.IsNullOrWhiteSpace(item.Source) ? "manual" : item.Source.Trim();
            a.Visibility = string.IsNullOrWhiteSpace(item.Visibility) ? "both" : item.Visibility.Trim();
            a.SortOrder = i;
            a.UpdatedAt = now;
            foreach (var skillId in item.SkillIds ?? [])
            {
                desiredLinks.Add((a.Id, skillId));
            }
        }

        // Diferencia de conjuntos: quitar y volver a agregar la misma fila haría que EF rastreara dos instancias con la misma clave.
        var currentLinks = oldLinks.Select(x => (x.AchievementId, x.SkillId)).ToHashSet();
        db.AchievementSkills.RemoveRange(oldLinks.Where(x => !desiredLinks.Contains((x.AchievementId, x.SkillId))));
        foreach (var (achievementId, skillId) in desiredLinks.Where(x => !currentLinks.Contains(x)))
        {
            db.AchievementSkills.Add(new AchievementSkill { AchievementId = achievementId, SkillId = skillId });
        }

        var keep = requested.ToHashSet();
        db.Achievements.RemoveRange(existing.Where(a => !keep.Contains(a.Id)));
        owners.Touch(profile.Value);
        await db.SaveChangesAsync(cancellationToken);
        return await ViewAsync(profile.Value, cancellationToken);
    }

    // ───────────────────────────── Derivación (reglas e IA) ─────────────────────────────
    public async Task<Result<DerivationView>> DeriveAsync(string kind, Guid parentId, CancellationToken cancellationToken)
    {
        var context = await DerivationContextAsync(kind, parentId, cancellationToken);
        if (context.IsFailure)
        {
            return context.Error;
        }

        var (narrative, isProject, skills) = context.Value;
        var vocabulary = TermMatcher.Vocabulary(SkillsOnly(skills));
        var proposals = AchievementDeriver.Derive(narrative, requireVerb: !isProject, vocabulary);
        return new DerivationView("rules", proposals.Select(p => ToView(p, skills)).ToList(), []);
    }

    public async Task<Result<AiPackageView>> AiPackageAsync(string kind, Guid parentId, CancellationToken cancellationToken)
    {
        var context = await DerivationContextAsync(kind, parentId, cancellationToken);
        if (context.IsFailure)
        {
            return context.Error;
        }

        var (narrative, isProject, skills) = context.Value;
        var names = skills.Select(s => s.Name).Concat(TermMatcher.Known.Select(k => k.Term)).Distinct().ToList();
        var package = AiPackages.ForAchievements(narrative, isProject, names);
        return new AiPackageView(package.Task, package.Prompt, package.Schema);
    }

    public async Task<Result<DerivationView>> AiResultAsync(string kind, Guid parentId, AiResultInput input, CancellationToken cancellationToken)
    {
        var context = await DerivationContextAsync(kind, parentId, cancellationToken);
        if (context.IsFailure)
        {
            return context.Error;
        }

        using var json = CvAiResult.TryParse(input.Json);
        if (json is null)
        {
            return HuellaErrors.AiResultInvalid;
        }

        var (narrative, _, skills) = context.Value;
        var names = skills.Select(s => s.Name).Concat(TermMatcher.Known.Select(k => k.Term)).Distinct().ToList();
        var (proposals, rejected) = CvAiResult.ParseAchievements(json, narrative, names);
        return new DerivationView("ai", proposals.Select(p => ToView(p, skills)).ToList(), rejected);
    }

    private async Task<Result<(string Narrative, bool IsProject, List<Skill> Skills)>> DerivationContextAsync(string kind, Guid parentId, CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var parent = await FindParentAsync(kind, parentId, profile.Value.Id, cancellationToken);
        if (parent is null)
        {
            return HuellaErrors.NotFound;
        }

        var skills = await db.Skills.Where(s => s.ProfileId == profile.Value.Id).ToListAsync(cancellationToken);
        return (parent.Value.Narrative, kind == "projects", skills);
    }

    private async Task<(Guid Id, string Narrative)?> FindParentAsync(string kind, Guid parentId, Guid profileId, CancellationToken cancellationToken)
    {
        if (kind == "projects")
        {
            var project = await db.Projects.SingleOrDefaultAsync(p => p.Id == parentId && p.ProfileId == profileId, cancellationToken);
            return project is null ? null : (project.Id, project.Summary + "\n" + project.Approach);
        }

        var experience = await db.Experiences.SingleOrDefaultAsync(e => e.Id == parentId && e.ProfileId == profileId, cancellationToken);
        return experience is null ? null : (experience.Id, experience.Narrative);
    }

    private static BankData SkillsOnly(List<Skill> skills) => new(
        new BankHeader(string.Empty, string.Empty, [], []), string.Empty, [], [],
        skills.Select(s => new BankSkill(s.Name, s.Category, (s.Aliases ?? string.Empty).Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries), s.FirstUsedYear, s.LastUsedYear, 0)).ToList(),
        [], [], [], new BankPrivate(string.Empty, string.Empty, string.Empty, string.Empty, string.Empty), [], string.Empty, 0);

    private static AchievementProposalView ToView(AchievementProposal p, List<Skill> skills)
    {
        var byName = new Dictionary<string, Guid>(StringComparer.Ordinal);
        foreach (var skill in skills)
        {
            byName.TryAdd(TermMatcher.Fold(skill.Name), skill.Id);
        }

        var ids = p.Skills.Where(s => byName.ContainsKey(TermMatcher.Fold(s))).Select(s => byName[TermMatcher.Fold(s)]).Distinct().ToList();
        var unknown = p.Skills.Where(s => !byName.ContainsKey(TermMatcher.Fold(s))).ToList();
        return new AchievementProposalView(p.ShortText, p.LongText, p.RawText, p.ResultValue, p.ResultUnit, p.ImpactType, p.Strength, p.NeedsFigure, ids, unknown);
    }
}
