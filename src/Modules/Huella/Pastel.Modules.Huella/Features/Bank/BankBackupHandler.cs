using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Huella.Domain;
using Pastel.Modules.Huella.Features.MyProfile;
using Pastel.Modules.Huella.Persistence;
using Pastel.Platform.Auditing;
using Pastel.Platform.Security;
using Pastel.SharedKernel;

namespace Pastel.Modules.Huella.Features.Bank;

/// <summary>
/// Respaldo del banco: exportar a un documento JSON portable e importarlo (en otra computadora o tras una pérdida).
/// <para>
/// <b>Importar reemplaza</b> el perfil y el banco actuales por los del archivo, y lo hace <b>todo o nada</b>: se reutilizan
/// los guardados por sección de <see cref="BankHandler"/> y <see cref="ProfileHandler"/> (mismas validaciones, mismos máximos,
/// mismo aislamiento del propietario) dentro de una sola transacción; si cualquiera falla, se deshace todo y el banco
/// queda como estaba. Los ids del archivo que ya existen en este perfil se conservan (lo que los cita sigue valiendo); los
/// demás se crean nuevos.
/// </para>
/// </summary>
internal sealed class BankBackupHandler(
    HuellaDbContext db,
    OwnerProfiles owners,
    BankHandler bank,
    ProfileHandler profiles,
    IAuditTrail audit,
    ICurrentUser currentUser,
    IClock clock)
{
    // ───────────────────────────── Exportar ─────────────────────────────
    public async Task<Result<BankBackupExport>> ExportAsync(CancellationToken cancellationToken)
    {
        var view = await bank.GetAsync(cancellationToken);
        if (view.IsFailure)
        {
            return view.Error;
        }

        var profile = await profiles.GetAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var p = profile.Value;
        var input = new ProfileInput(
            p.DisplayName, p.Headline, p.Summary, p.Location, p.Availability, p.ContactEmail, p.ContactPhone,
            p.ShowContactEmail, p.ShowContactPhone, p.ShowLocation, p.ShowAvailability,
            p.Links.Select(l => new ProfileLinkInput(l.Id, l.Kind, l.Label, l.Url, l.IsPublic, l.Icon)).ToList());

        var export = new BankBackupExport(BankBackupRules.FormatName, BankBackupRules.CurrentVersion, clock.UtcNow, input, view.Value);
        await AuditAsync("huella.bank.exported", Counts(view.Value, profileUpdated: false), cancellationToken);
        return export;
    }

    // ───────────────────────────── Importar ─────────────────────────────
    public async Task<Result<BankImportView>> ImportAsync(BankBackup? file, CancellationToken cancellationToken)
    {
        if (BankBackupRules.CheckEnvelope(file) is { } envelope)
        {
            return envelope;
        }

        var owner = await owners.GetOrCreateAsync(cancellationToken);
        if (owner.IsFailure)
        {
            return owner.Error;
        }

        // Una sola unidad de trabajo: si algo falla (validación, 404 o una excepción) la transacción no se confirma.
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var applied = await ApplyAsync(owner.Value, file!, cancellationToken);
        if (applied.IsFailure)
        {
            await transaction.RollbackAsync(cancellationToken);
            db.ChangeTracker.Clear();
            return applied.Error;
        }

        await transaction.CommitAsync(cancellationToken);
        await AuditAsync("huella.bank.imported", applied.Value, cancellationToken);
        return applied.Value;
    }

    private async Task<Result<BankImportView>> ApplyAsync(Profile owner, BankBackup file, CancellationToken cancellationToken)
    {
        var data = file.Bank!;
        var profileId = owner.Id;
        var free = await FreeIdsAsync(BankBackupRules.FileIds(data), cancellationToken);
        bank.AllowRestoredIds(free);

        // 1. Perfil y enlaces.
        if (file.Profile is { } profileInput)
        {
            var linkIds = await db.ProfileLinks.Where(l => l.ProfileId == profileId).Select(l => l.Id).ToListAsync(cancellationToken);
            var existing = linkIds.ToHashSet();
            var used = new HashSet<Guid>();
            var links = profileInput.Links?.Select(l => l with { Id = BankBackupRules.KeepId(l.Id, existing, used) }).ToList();
            var saved = await profiles.SaveAsync(profileInput with { Links = links }, cancellationToken);
            if (saved.IsFailure)
            {
                return Located("profile", saved.Error);
            }
        }

        // 2. Notas privadas.
        if (data.Notes is { } notes)
        {
            var saved = await bank.SaveNotesAsync(notes, cancellationToken);
            if (saved.IsFailure)
            {
                return Located("notes", saved.Error);
            }
        }

        // 3. Habilidades primero: los logros las citan por id. El mapa lleva cada id del archivo al que quedó en el banco.
        var skillIds = Usable(await db.Skills.Where(s => s.ProfileId == profileId).Select(s => s.Id).ToListAsync(cancellationToken), free);
        var skills = data.Skills ?? [];
        var usedSkills = new HashSet<Guid>();
        var skillSaved = await bank.SaveSkillsAsync(skills.Select(s => s with { Id = BankBackupRules.KeepId(s.Id, skillIds, usedSkills) }).ToList(), cancellationToken);
        if (skillSaved.IsFailure)
        {
            return Located("skills", skillSaved.Error);
        }

        var skillMap = new Dictionary<Guid, Guid>();
        for (var i = 0; i < skills.Count && i < skillSaved.Value.Skills.Count; i++)
        {
            if (skills[i].Id is { } original)
            {
                skillMap.TryAdd(original, skillSaved.Value.Skills[i].Id);
            }
        }

        // 4. Secciones sin referencias entre sí.
        var competencies = await SaveSimpleAsync("competencies", free, data.Competencies, db.Competencies, c => c.Id, i => i.Id, (i, id) => i with { Id = id }, bank.SaveCompetenciesAsync, cancellationToken);
        if (competencies is not null)
        {
            return competencies;
        }

        var educations = await SaveSimpleAsync("educations", free, data.Educations, db.Educations, c => c.Id, i => i.Id, (i, id) => i with { Id = id }, bank.SaveEducationsAsync, cancellationToken);
        if (educations is not null)
        {
            return educations;
        }

        var certifications = await SaveSimpleAsync("certifications", free, data.Certifications, db.Certifications, c => c.Id, i => i.Id, (i, id) => i with { Id = id }, bank.SaveCertificationsAsync, cancellationToken);
        if (certifications is not null)
        {
            return certifications;
        }

        var languages = await SaveSimpleAsync("languages", free, data.Languages, db.LanguageSkills, c => c.Id, i => i.Id, (i, id) => i with { Id = id }, bank.SaveLanguagesAsync, cancellationToken);
        if (languages is not null)
        {
            return languages;
        }

        // 5. Experiencias y proyectos, cada uno con sus logros.
        var experienceIds = Usable(await db.Experiences.Where(e => e.ProfileId == profileId).Select(e => e.Id).ToListAsync(cancellationToken), free);
        var experiences = data.Experiences ?? [];
        var usedExperiences = new HashSet<Guid>();
        var experienceSaved = await bank.SaveExperiencesAsync(
            experiences.Select(e => new ExperienceInput(
                BankBackupRules.KeepId(e.Id, experienceIds, usedExperiences), e.Role, e.MarketRole, e.Company, e.Location, e.EmploymentType,
                e.WorkMode, e.Start, e.End, e.Narrative, e.CompanyContext, e.TeamSize, e.IsVisible)).ToList(),
            cancellationToken);
        if (experienceSaved.IsFailure)
        {
            return Located("experiences", experienceSaved.Error);
        }

        for (var i = 0; i < experiences.Count; i++)
        {
            var achieved = await SaveAchievementsAsync($"experiences[{i}]", "experiences", experienceSaved.Value.Experiences[i].Id, experiences[i].Achievements, skillMap, free, cancellationToken);
            if (achieved is not null)
            {
                return achieved;
            }
        }

        var projectIds = Usable(await db.Projects.Where(p => p.ProfileId == profileId).Select(p => p.Id).ToListAsync(cancellationToken), free);
        var projects = data.Projects ?? [];
        var usedProjects = new HashSet<Guid>();
        var projectSaved = await bank.SaveProjectsAsync(
            projects.Select(p => new ProjectInput(
                BankBackupRules.KeepId(p.Id, projectIds, usedProjects), p.Name, p.Url, p.Summary, p.Approach, p.Stack, p.StartYear, p.EndYear, p.IsVisible)).ToList(),
            cancellationToken);
        if (projectSaved.IsFailure)
        {
            return Located("projects", projectSaved.Error);
        }

        for (var i = 0; i < projects.Count; i++)
        {
            var achieved = await SaveAchievementsAsync($"projects[{i}]", "projects", projectSaved.Value.Projects[i].Id, projects[i].Achievements, skillMap, free, cancellationToken);
            if (achieved is not null)
            {
                return achieved;
            }
        }

        var final = await bank.GetAsync(cancellationToken);
        return final.IsFailure ? final.Error : Counts(final.Value, profileUpdated: file.Profile is not null);
    }

    /// <summary>
    /// Guarda una sección sin referencias (competencias, educación, certificaciones, idiomas): conserva los ids que ya
    /// existen en el perfil y deja que el servidor cree los demás. Devuelve el error ya ubicado, o <c>null</c> si salió bien.
    /// </summary>
    private async Task<Result<BankImportView>?> SaveSimpleAsync<TEntity, TInput>(
        string section,
        IReadOnlySet<Guid> free,
        IReadOnlyList<TInput>? items,
        DbSet<TEntity> set,
        Func<TEntity, Guid> idOf,
        Func<TInput, Guid?> inputIdOf,
        Func<TInput, Guid?, TInput> withId,
        Func<IReadOnlyList<TInput>?, CancellationToken, Task<Result<BankView>>> save,
        CancellationToken cancellationToken)
        where TEntity : class, IProfileOwned
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        var existing = Usable((await set.Where(x => x.ProfileId == profile.Value.Id).ToListAsync(cancellationToken)).Select(idOf), free);
        var used = new HashSet<Guid>();
        var list = (items ?? []).Select(i => withId(i, BankBackupRules.KeepId(inputIdOf(i), existing, used))).ToList();
        var saved = await save(list, cancellationToken);
        if (saved.IsFailure)
        {
            return Located(section, saved.Error);
        }

        return null;
    }

    private async Task<Result<BankImportView>?> SaveAchievementsAsync(
        string at,
        string kind,
        Guid parentId,
        IReadOnlyList<AchievementInput>? items,
        IReadOnlyDictionary<Guid, Guid> skillMap,
        IReadOnlySet<Guid> free,
        CancellationToken cancellationToken)
    {
        var existing = Usable(
            kind == "projects"
                ? await db.Achievements.Where(a => a.ProjectId == parentId).Select(a => a.Id).ToListAsync(cancellationToken)
                : await db.Achievements.Where(a => a.ExperienceId == parentId).Select(a => a.Id).ToListAsync(cancellationToken),
            free);
        var used = new HashSet<Guid>();
        var list = new List<AchievementInput>();
        var errors = new Dictionary<string, string[]>();
        var all = items ?? [];
        for (var j = 0; j < all.Count; j++)
        {
            var item = all[j];
            if (!BankBackupRules.TryMapSkills(item.SkillIds, skillMap, out var mapped))
            {
                errors[$"{at}.achievements[{j}].skillIds"] = ["El logro cita una habilidad que no está en el archivo."];
                continue;
            }

            list.Add(item with { Id = BankBackupRules.KeepId(item.Id, existing, used), SkillIds = mapped });
        }

        if (errors.Count > 0)
        {
            return HuellaErrors.BankBackupInvalid(errors);
        }

        var saved = await bank.SaveAchievementsAsync(kind, parentId, list, cancellationToken);
        if (saved.IsFailure)
        {
            return Located($"{at}.achievements", saved.Error);
        }

        return null;
    }

    /// <summary>Los ids de este perfil más los libres del archivo: los que un guardado por sección puede conservar.</summary>
    private static HashSet<Guid> Usable(IEnumerable<Guid> mine, IReadOnlySet<Guid> free)
    {
        var usable = mine.ToHashSet();
        usable.UnionWith(free);
        return usable;
    }

    /// <summary>Ids del archivo que no existen en ninguna fila de ningún perfil: se pueden crear con ese mismo id.</summary>
    private async Task<HashSet<Guid>> FreeIdsAsync(HashSet<Guid> fileIds, CancellationToken cancellationToken)
    {
        var all = fileIds.ToList();
        var taken = new HashSet<Guid>();
        taken.UnionWith(await db.Skills.Where(x => all.Contains(x.Id)).Select(x => x.Id).ToListAsync(cancellationToken));
        taken.UnionWith(await db.Competencies.Where(x => all.Contains(x.Id)).Select(x => x.Id).ToListAsync(cancellationToken));
        taken.UnionWith(await db.Educations.Where(x => all.Contains(x.Id)).Select(x => x.Id).ToListAsync(cancellationToken));
        taken.UnionWith(await db.Certifications.Where(x => all.Contains(x.Id)).Select(x => x.Id).ToListAsync(cancellationToken));
        taken.UnionWith(await db.LanguageSkills.Where(x => all.Contains(x.Id)).Select(x => x.Id).ToListAsync(cancellationToken));
        taken.UnionWith(await db.Experiences.Where(x => all.Contains(x.Id)).Select(x => x.Id).ToListAsync(cancellationToken));
        taken.UnionWith(await db.Projects.Where(x => all.Contains(x.Id)).Select(x => x.Id).ToListAsync(cancellationToken));
        taken.UnionWith(await db.Achievements.Where(x => all.Contains(x.Id)).Select(x => x.Id).ToListAsync(cancellationToken));
        return all.Where(id => !taken.Contains(id)).ToHashSet();
    }

    /// <summary>Convierte el error de un guardado por sección en uno del respaldo, con la sección y el campo (<c>skills.items[3].name</c>).</summary>
    private static Error Located(string section, Error error)
    {
        var details = new Dictionary<string, string[]>();
        if (error.Details is { Count: > 0 })
        {
            foreach (var (key, messages) in error.Details)
            {
                details[$"{section}.{key}"] = messages;
            }
        }
        else
        {
            details[section] = [error.Message];
        }

        return HuellaErrors.BankBackupInvalid(details);
    }

    private static BankImportView Counts(BankView view, bool profileUpdated) => new(
        profileUpdated,
        view.Experiences.Count,
        view.Projects.Count,
        view.Experiences.Sum(e => e.Achievements.Count) + view.Projects.Sum(p => p.Achievements.Count),
        view.Skills.Count,
        view.Competencies.Count,
        view.Educations.Count,
        view.Certifications.Count,
        view.Languages.Count);

    /// <summary>Quién y cuántos elementos; nunca el contenido del banco.</summary>
    private Task AuditAsync(string action, BankImportView counts, CancellationToken cancellationToken) =>
        audit.WriteAsync(new AuditRecord(action, HuellaPermissions.Code, currentUser.UserId, Target: "huella.bank", After: counts), cancellationToken);
}
