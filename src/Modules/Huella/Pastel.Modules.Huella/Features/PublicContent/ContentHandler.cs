using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Huella.Ai;
using Pastel.Modules.Huella.Cv;
using Pastel.Modules.Huella.Domain;
using Pastel.Modules.Huella.Features.AiTasks;
using Pastel.Modules.Huella.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Huella.Features.PublicContent;

/// <summary>Estado de una sección: <c>empty</c> (sin contenido), <c>ready</c> (el inglés está al día) o <c>stale</c> (se editó el español y falta reescribir el inglés).</summary>
internal sealed record SectionStatus(string Id, string Status, DateTimeOffset? UpdatedAt);

internal sealed record ContentView(ContentDoc Es, ContentDoc En, IReadOnlyList<SectionStatus> Sections);

/// <summary>
/// Contenido del perfil público. La persona edita el español; el inglés lo reescribe la IA sección por sección. Lo que se
/// edita o se importa se valida contra los máximos de cada sección y contra el banco (los hechos no se pueden cambiar a mano
/// desde aquí: empresa, fechas e institución salen siempre del banco).
/// </summary>
internal sealed class ContentHandler(HuellaDbContext db, OwnerProfiles owners, BankLoader loader, IClock clock)
{
    public async Task<Result<ContentView>> GetAsync(CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var row = await db.ProfileContents.AsNoTracking().SingleOrDefaultAsync(c => c.ProfileId == profile.Value.Id, cancellationToken);
        return row is null ? ViewOf(new ContentDoc(), new ContentDoc(), new Dictionary<string, SectionState>()) : ViewOf(row);
    }

    // ───────────────────────────── Edición en español ─────────────────────────────
    public async Task<Result<ContentView>> SaveSectionAsync(string section, ContentDoc? input, CancellationToken cancellationToken)
    {
        if (!ContentSections.IsValid(section) || input is null)
        {
            return HuellaErrors.NotFound;
        }

        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var records = await loader.LoadAsync(profile.Value.Id, cancellationToken);
        var errors = new FieldErrors();
        var clean = Sanitize(section, input, records, errors);
        if (errors.Any)
        {
            return HuellaErrors.Invalid(errors.ToDictionary());
        }

        var row = await RowAsync(profile.Value, cancellationToken);
        var (es, en, state) = Parse(row);
        ContentSections.Copy(clean, es, section);
        Touch(state, section, ContentSections.Hash(es, section), enFromHash: null);
        Mirror(profile.Value, es);
        Save(row, es, en, state);
        await db.SaveChangesAsync(cancellationToken);
        return ViewOf(row);
    }

    // ───────────────────────────── IA: generar desde el banco ─────────────────────────────
    public async Task<Result<AiTaskPackage>> GeneratePackageAsync(IReadOnlyList<string>? requested, CancellationToken cancellationToken)
    {
        var sections = Resolve(requested);
        if (sections.IsFailure)
        {
            return sections.Error;
        }

        var loaded = await LoadAsync(cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var (profile, bank) = loaded.Value;
        var row = await db.ProfileContents.AsNoTracking().SingleOrDefaultAsync(c => c.ProfileId == profile.Id, cancellationToken);
        var current = row is null ? null : Parse(row).Es;
        var package = ContentAi.BuildGenerate(bank, sections.Value, current is not null && ContentSections.All.Any(s => !ContentSections.IsEmpty(current, s)) ? current : null);
        var label = sections.Value.Count == ContentSections.All.Count ? "todo" : string.Join("-", sections.Value);
        return new AiTaskPackage(AiTaskHandler.Profile, "Perfil público (español e inglés)", $"huella-perfil-{label}", package.Prompt, package.Schema);
    }

    public async Task<Result<AiTaskOutcome>> ApplyGeneratedAsync(IReadOnlyList<string>? requested, string? raw, Error invalid, CancellationToken cancellationToken)
    {
        var sections = Resolve(requested);
        if (sections.IsFailure)
        {
            return sections.Error;
        }

        var loaded = await LoadAsync(cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var (profile, bank) = loaded.Value;
        var outcome = ContentAi.ParseGenerated(raw, bank, sections.Value);
        if (outcome.Applied.Count == 0)
        {
            return outcome.Rejected.Count == 0 ? invalid : new AiTaskOutcome(AiTaskHandler.Profile, 0, outcome.Rejected, [], []);
        }

        var row = await RowAsync(profile, cancellationToken);
        var (es, en, state) = Parse(row);
        foreach (var section in outcome.Applied)
        {
            ContentSections.Copy(outcome.Es, es, section);
            ContentSections.Copy(outcome.En, en, section);
            var hash = ContentSections.Hash(es, section);
            Touch(state, section, hash, enFromHash: hash);
        }

        Mirror(profile, es);
        Save(row, es, en, state);
        await db.SaveChangesAsync(cancellationToken);
        return new AiTaskOutcome(AiTaskHandler.Profile, outcome.Applied.Count, outcome.Rejected, [], outcome.Applied);
    }

    // ───────────────────────────── IA: reescribir el inglés ─────────────────────────────
    public async Task<Result<AiTaskPackage>> TranslatePackageAsync(IReadOnlyList<string>? requested, CancellationToken cancellationToken)
    {
        var prepared = await PrepareTranslationAsync(requested, cancellationToken);
        if (prepared.IsFailure)
        {
            return prepared.Error;
        }

        var (_, es, _, _, sections) = prepared.Value;
        var package = ContentAi.BuildTranslate(sections, es);
        return new AiTaskPackage(AiTaskHandler.ProfileTranslate, "Traducción del perfil al inglés", $"huella-traduccion-{string.Join("-", sections)}", package.Prompt, package.Schema);
    }

    public async Task<Result<AiTaskOutcome>> ApplyTranslationAsync(IReadOnlyList<string>? requested, string? raw, Error invalid, CancellationToken cancellationToken)
    {
        var prepared = await PrepareTranslationAsync(requested, cancellationToken);
        if (prepared.IsFailure)
        {
            return prepared.Error;
        }

        var (row, es, en, state, sections) = prepared.Value;
        var outcome = ContentAi.ParseTranslation(raw, es, sections);
        if (outcome.Applied.Count == 0)
        {
            return outcome.Rejected.Count == 0 ? invalid : new AiTaskOutcome(AiTaskHandler.ProfileTranslate, 0, outcome.Rejected, [], []);
        }

        foreach (var section in outcome.Applied)
        {
            ContentSections.Copy(outcome.En, en, section);
            Touch(state, section, ContentSections.Hash(es, section), enFromHash: ContentSections.Hash(es, section));
        }

        Save(row, es, en, state);
        await db.SaveChangesAsync(cancellationToken);
        return new AiTaskOutcome(AiTaskHandler.ProfileTranslate, outcome.Applied.Count, outcome.Rejected, [], outcome.Applied);
    }

    /// <summary>Secciones a traducir: las pedidas con contenido; si no se piden, las desactualizadas.</summary>
    private async Task<Result<(ProfileContent Row, ContentDoc Es, ContentDoc En, Dictionary<string, SectionState> State, IReadOnlyList<string> Sections)>> PrepareTranslationAsync(
        IReadOnlyList<string>? requested, CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var row = await RowAsync(profile.Value, cancellationToken);
        var (es, en, state) = Parse(row);
        var sections = (requested is { Count: > 0 }
                ? ContentSections.All.Where(s => requested.Contains(s))
                : ContentSections.All.Where(s => StatusOf(es, state, s) == "stale"))
            .Where(s => !ContentSections.IsEmpty(es, s))
            .ToList();
        if (sections.Count == 0)
        {
            return HuellaErrors.Invalid(new Dictionary<string, string[]> { ["sections"] = ["No hay secciones con contenido en español para reescribir en inglés."] });
        }

        return (row, es, en, state, (IReadOnlyList<string>)sections);
    }

    // ───────────────────────────── Apoyo ─────────────────────────────
    private static Result<IReadOnlyList<string>> Resolve(IReadOnlyList<string>? requested)
    {
        var sections = requested is { Count: > 0 } ? ContentSections.All.Where(s => requested.Contains(s)).ToList() : [.. ContentSections.All];
        if (sections.Count == 0)
        {
            return HuellaErrors.Invalid(new Dictionary<string, string[]> { ["sections"] = ["Elija una sección del perfil."] });
        }

        return sections;
    }

    private async Task<Result<(Profile Profile, AiBank Bank)>> LoadAsync(CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var notes = await owners.GetNotesAsync(profile.Value, cancellationToken);
        var records = await loader.LoadAsync(profile.Value.Id, cancellationToken);
        var bank = new AiBank(profile.Value, notes, records, clock.UtcNow.Year);
        if (!bank.HasContent)
        {
            return HuellaErrors.ProfileRequiresContent;
        }

        return (profile.Value, bank);
    }

    private async Task<ProfileContent> RowAsync(Profile profile, CancellationToken cancellationToken)
    {
        var row = await db.ProfileContents.SingleOrDefaultAsync(c => c.ProfileId == profile.Id, cancellationToken);
        if (row is not null)
        {
            return row;
        }

        row = new ProfileContent { Id = Guid.CreateVersion7(), ProfileId = profile.Id, UpdatedAt = clock.UtcNow };
        db.ProfileContents.Add(row);
        return row;
    }

    private static (ContentDoc Es, ContentDoc En, Dictionary<string, SectionState> State) Parse(ProfileContent row) =>
        (HuellaJson.Deserialize<ContentDoc>(row.EsJson) ?? new ContentDoc(),
         HuellaJson.Deserialize<ContentDoc>(row.EnJson) ?? new ContentDoc(),
         HuellaJson.Deserialize<Dictionary<string, SectionState>>(row.StateJson) ?? new Dictionary<string, SectionState>());

    private void Save(ProfileContent row, ContentDoc es, ContentDoc en, Dictionary<string, SectionState> state)
    {
        row.EsJson = HuellaJson.Serialize(es);
        row.EnJson = HuellaJson.Serialize(en);
        row.StateJson = HuellaJson.Serialize(state);
        row.UpdatedAt = clock.UtcNow;
    }

    private void Touch(Dictionary<string, SectionState> state, string section, string esHash, string? enFromHash)
    {
        var current = state.GetValueOrDefault(section) ?? new SectionState();
        current.EsHash = esHash;
        current.EnFromHash = enFromHash ?? current.EnFromHash;
        current.UpdatedAt = clock.UtcNow;
        state[section] = current;
    }

    /// <summary>El titular y el resumen en español también viven en el perfil: así el CV por reglas y la publicación los encuentran.</summary>
    private void Mirror(Profile profile, ContentDoc es)
    {
        if (es.Headline.Length > 0)
        {
            profile.Headline = es.Headline;
        }

        if (es.Summary.Length > 0)
        {
            profile.Summary = es.Summary;
        }

        profile.UpdatedAt = clock.UtcNow;
    }

    private static string StatusOf(ContentDoc es, Dictionary<string, SectionState> state, string section)
    {
        if (ContentSections.IsEmpty(es, section))
        {
            return "empty";
        }

        var current = state.GetValueOrDefault(section);
        return current?.EnFromHash is { } from && from == ContentSections.Hash(es, section) ? "ready" : "stale";
    }

    private static ContentView ViewOf(ProfileContent row)
    {
        var (es, en, state) = Parse(row);
        return ViewOf(es, en, state);
    }

    private static ContentView ViewOf(ContentDoc es, ContentDoc en, Dictionary<string, SectionState> state) =>
        new(es, en, ContentSections.All.Select(s => new SectionStatus(s, StatusOf(es, state, s), state.GetValueOrDefault(s)?.UpdatedAt)).ToList());

    // ───────────────────────────── Validación de lo que escribe la persona ─────────────────────────────
    private static ContentDoc Sanitize(string section, ContentDoc input, BankRecords records, FieldErrors errors)
    {
        var clean = new ContentDoc();
        switch (section)
        {
            case ContentSections.Overview:
                clean.Headline = errors.RequiredLine("headline", input.Headline, ContentCaps.Headline);
                clean.Summary = errors.Text("summary", input.Summary, ContentCaps.Summary);
                Cap(errors, "highlights", input.Highlights.Count, ContentCaps.Highlights, "destacados");
                for (var i = 0; i < Math.Min(input.Highlights.Count, ContentCaps.Highlights); i++)
                {
                    clean.Highlights.Add(new ContentHighlight
                    {
                        Figure = errors.OptionalLine($"highlights[{i}].figure", input.Highlights[i].Figure, ContentCaps.Figure),
                        Text = errors.RequiredLine($"highlights[{i}].text", input.Highlights[i].Text, ContentCaps.HighlightText),
                    });
                }

                break;

            case ContentSections.Experience:
                Cap(errors, "experience", input.Experience.Count, ContentCaps.Experience, "experiencias");
                for (var i = 0; i < Math.Min(input.Experience.Count, ContentCaps.Experience); i++)
                {
                    var item = input.Experience[i];
                    if (records.Experiences.SingleOrDefault(e => e.Id == item.SourceId) is not { } experience)
                    {
                        errors.Add($"experience[{i}]", "Esta experiencia ya no está en su banco.");
                        continue;
                    }

                    var entry = new ContentExperience
                    {
                        SourceId = experience.Id,
                        Role = errors.RequiredLine($"experience[{i}].role", item.Role, ContentCaps.Title),
                        Company = experience.Company,
                        Location = experience.Location,
                        Start = MonthDate.Format(experience.StartDate),
                        End = MonthDate.Format(experience.EndDate),
                    };
                    Cap(errors, $"experience[{i}].bullets", item.Bullets.Count, ContentCaps.ExperienceBullets, "viñetas");
                    for (var b = 0; b < Math.Min(item.Bullets.Count, ContentCaps.ExperienceBullets); b++)
                    {
                        entry.Bullets.Add(errors.RequiredLine($"experience[{i}].bullets[{b}]", item.Bullets[b], ContentCaps.Bullet));
                    }

                    clean.Experience.Add(entry);
                }

                break;

            case ContentSections.Projects:
                Cap(errors, "projects", input.Projects.Count, ContentCaps.Projects, "proyectos");
                for (var i = 0; i < Math.Min(input.Projects.Count, ContentCaps.Projects); i++)
                {
                    var item = input.Projects[i];
                    if (records.Projects.SingleOrDefault(p => p.Id == item.SourceId) is not { } project)
                    {
                        errors.Add($"projects[{i}]", "Este proyecto ya no está en su banco.");
                        continue;
                    }

                    clean.Projects.Add(new ContentProject
                    {
                        SourceId = project.Id,
                        Name = project.Name,
                        Url = project.Url,
                        Stack = project.Stack,
                        Summary = errors.Text($"projects[{i}].summary", item.Summary, ContentCaps.ProjectSummary),
                    });
                }

                break;

            case ContentSections.Skills:
                Cap(errors, "skills", input.Skills.Count, ContentCaps.SkillGroups, "grupos de habilidades");
                var total = 0;
                for (var i = 0; i < Math.Min(input.Skills.Count, ContentCaps.SkillGroups); i++)
                {
                    var group = new ContentSkillGroup { Label = errors.RequiredLine($"skills[{i}].label", input.Skills[i].Label, ContentCaps.SkillLabel) };
                    Cap(errors, $"skills[{i}].items", input.Skills[i].Items.Count, ContentCaps.SkillsPerGroup, "habilidades por grupo");
                    foreach (var raw in input.Skills[i].Items.Take(ContentCaps.SkillsPerGroup))
                    {
                        var name = TextInput.CleanLine(raw);
                        if (name.Length is > 0 and <= ContentCaps.SkillName && !group.Items.Contains(name, StringComparer.OrdinalIgnoreCase))
                        {
                            group.Items.Add(name);
                        }
                    }

                    total += group.Items.Count;
                    if (group.Items.Count > 0)
                    {
                        clean.Skills.Add(group);
                    }
                }

                Cap(errors, "skills", total, ContentCaps.SkillsTotal, "habilidades en total");
                break;

            default:
                Cap(errors, "education", input.Education.Count, ContentCaps.Education, "formaciones");
                for (var i = 0; i < Math.Min(input.Education.Count, ContentCaps.Education); i++)
                {
                    var item = input.Education[i];
                    if (records.Educations.SingleOrDefault(e => e.Id == item.SourceId) is not { } education)
                    {
                        errors.Add($"education[{i}]", "Esta formación ya no está en su banco.");
                        continue;
                    }

                    clean.Education.Add(new ContentEducation
                    {
                        SourceId = education.Id,
                        Degree = errors.RequiredLine($"education[{i}].degree", item.Degree, ContentCaps.Title),
                        Institution = education.Institution,
                        StartYear = education.StartYear,
                        EndYear = education.EndYear,
                        Note = errors.OptionalLine($"education[{i}].note", item.Note, ContentCaps.Note),
                    });
                }

                Cap(errors, "certifications", input.Certifications.Count, ContentCaps.Certifications, "certificaciones");
                for (var i = 0; i < Math.Min(input.Certifications.Count, ContentCaps.Certifications); i++)
                {
                    var item = input.Certifications[i];
                    if (records.Certifications.SingleOrDefault(c => c.Id == item.SourceId) is not { } certification)
                    {
                        errors.Add($"certifications[{i}]", "Esta certificación ya no está en su banco.");
                        continue;
                    }

                    clean.Certifications.Add(new ContentCertification
                    {
                        SourceId = certification.Id,
                        Name = errors.RequiredLine($"certifications[{i}].name", item.Name, ContentCaps.Title),
                        Issuer = certification.Issuer,
                        Year = certification.IssuedYear,
                        Url = certification.CredentialUrl,
                    });
                }

                Cap(errors, "languages", input.Languages.Count, ContentCaps.Languages, "idiomas");
                for (var i = 0; i < Math.Min(input.Languages.Count, ContentCaps.Languages); i++)
                {
                    var item = input.Languages[i];
                    if (records.Languages.SingleOrDefault(l => l.Id == item.SourceId) is not { } spoken)
                    {
                        errors.Add($"languages[{i}]", "Este idioma ya no está en su banco.");
                        continue;
                    }

                    clean.Languages.Add(new ContentLanguage
                    {
                        SourceId = spoken.Id,
                        Language = errors.RequiredLine($"languages[{i}].language", item.Language, ContentCaps.LanguageName),
                        Level = errors.RequiredLine($"languages[{i}].level", item.Level, ContentCaps.LanguageLevel),
                    });
                }

                break;
        }

        return clean;
    }

    private static void Cap(FieldErrors errors, string field, int count, int max, string what)
    {
        if (count > max)
        {
            errors.Add(field, $"Puede mostrar como máximo {max} {what}.");
        }
    }
}
