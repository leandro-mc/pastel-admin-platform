using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Huella.Ai;
using Pastel.Modules.Huella.Cv;
using Pastel.Modules.Huella.Domain;
using Pastel.Modules.Huella.Features.AiTasks;
using Pastel.Modules.Huella.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Huella.Features.Studio;

/// <summary>
/// Estudio de CV: ofertas, generación determinista desde el banco, edición validada por el guardián de verdad,
/// versiones, y la redacción del CV con IA (la IA solo devuelve JSON; nada de lo que llega se guarda sin validar).
/// </summary>
internal sealed class StudioHandler(HuellaDbContext db, OwnerProfiles owners, BankLoader loader, ICvRenderer renderer, OfferTracking tracking, AiAssistant ai, IClock clock)
{
    public const int MaxOffers = 50;
    public const int MaxVersions = 300;

    // ───────────────────────────── Ofertas ─────────────────────────────
    public async Task<Result<IReadOnlyList<OfferSummary>>> ListOffersAsync(CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var offers = await db.JobOffers.Where(o => o.ProfileId == profile.Value.Id).OrderByDescending(o => o.CreatedAt).ToListAsync(cancellationToken);
        var bank = await LoadBankAsync(profile.Value, cancellationToken);
        return offers.Select(o => SummaryOf(o, bank.Data)).ToList();
    }

    /// <summary>Actualiza el seguimiento de una oferta: estado, fecha de postulación, día de seguimiento y notas.</summary>
    public async Task<Result<OfferSummary>> UpdateTrackingAsync(Guid offerId, OfferTrackingInput input, CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var offer = await db.JobOffers.SingleOrDefaultAsync(o => o.Id == offerId && o.ProfileId == profile.Value.Id, cancellationToken);
        if (offer is null)
        {
            return HuellaErrors.NotFound;
        }

        var errors = new FieldErrors();
        var status = errors.OneOf("status", input.Status, OfferStatus.All.ToArray(), offer.Status);
        var notes = errors.Text("notes", input.Notes, HuellaLimits.JobOffer.Notes);
        if (errors.Any)
        {
            return HuellaErrors.Invalid(errors.ToDictionary());
        }

        var now = clock.UtcNow;
        if (status != offer.Status)
        {
            offer.StatusUpdatedAt = now;
        }

        offer.Status = status;
        offer.Notes = notes;
        offer.FollowUpAt = input.FollowUpAt;
        // Volver a «guardada» borra la fecha de postulación; cualquier estado posterior a postular la conserva o la fija hoy.
        offer.AppliedAt = status == OfferStatus.Saved ? null : input.AppliedAt ?? offer.AppliedAt ?? (OfferStatus.WasApplied(status) ? now : null);
        offer.UpdatedAt = now;
        await db.SaveChangesAsync(cancellationToken);
        var bank = await LoadBankAsync(profile.Value, cancellationToken);
        return SummaryOf(offer, bank.Data);
    }

    private static OfferSummary SummaryOf(JobOffer o, BankData bank)
    {
        var must = OfferAnalyzer.Evidence(OfferAnalyzer.Analyze(o.RawText, isFocus: false, bank), bank).Where(e => e.Weight >= 3).ToList();
        return new OfferSummary(
            o.Id, o.Title, o.Company, o.SourceUrl, o.CreatedAt, o.Status, o.StatusUpdatedAt, o.AppliedAt, o.FollowUpAt, o.Notes,
            new OfferCoverage(must.Count(e => e.Status != "gap"), must.Count));
    }

    public async Task<Result<OfferView>> CreateOfferAsync(OfferInput input, CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var errors = new FieldErrors();
        var raw = errors.Text("rawText", input.RawText, HuellaLimits.JobOffer.RawText);
        if (raw.Length < 40)
        {
            errors.Add("rawText", "Pegue el texto completo de la oferta (al menos unas líneas).");
        }

        var company = errors.OptionalLine("company", input.Company, HuellaLimits.JobOffer.Company);
        var sourceUrl = errors.OptionalLink("sourceUrl", input.SourceUrl);
        var typedTitle = errors.OptionalLine("title", input.Title, HuellaLimits.JobOffer.Title);
        if (errors.Any)
        {
            return HuellaErrors.Invalid(errors.ToDictionary());
        }

        var count = await db.JobOffers.CountAsync(o => o.ProfileId == profile.Value.Id, cancellationToken);
        if (count >= MaxOffers)
        {
            errors.Add("rawText", $"Puede guardar hasta {MaxOffers} ofertas. Elimine alguna para agregar otra.");
            return HuellaErrors.Invalid(errors.ToDictionary());
        }

        var bank = await LoadBankAsync(profile.Value, cancellationToken);
        var analysis = OfferAnalyzer.Analyze(raw, isFocus: false, bank.Data);
        var title = typedTitle ?? analysis.Title;
        var now = clock.UtcNow;
        var offer = new JobOffer
        {
            Id = Guid.CreateVersion7(),
            ProfileId = profile.Value.Id,
            Title = title.Length > HuellaLimits.JobOffer.Title ? title[..HuellaLimits.JobOffer.Title] : title,
            Company = company,
            SourceUrl = sourceUrl,
            RawText = raw,
            TextHash = PublicProfileBuilder.Hash(raw),
            AnalysisJson = HuellaJson.Serialize(analysis),
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.JobOffers.Add(offer);
        await db.SaveChangesAsync(cancellationToken);
        return OfferViewOf(offer, analysis, bank.Data);
    }

    public async Task<Result<OfferView>> GetOfferAsync(Guid offerId, CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var offer = await db.JobOffers.SingleOrDefaultAsync(o => o.Id == offerId && o.ProfileId == profile.Value.Id, cancellationToken);
        if (offer is null)
        {
            return HuellaErrors.NotFound;
        }

        // El análisis se recalcula contra el banco de hoy: la evidencia cambia cuando el banco cambia.
        var bank = await LoadBankAsync(profile.Value, cancellationToken);
        return OfferViewOf(offer, OfferAnalyzer.Analyze(offer.RawText, isFocus: false, bank.Data), bank.Data);
    }

    public async Task<Result> DeleteOfferAsync(Guid offerId, CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var offer = await db.JobOffers.SingleOrDefaultAsync(o => o.Id == offerId && o.ProfileId == profile.Value.Id, cancellationToken);
        if (offer is null)
        {
            return HuellaErrors.NotFound;
        }

        // Las versiones generadas conservan su contenido: solo se suelta la referencia a la oferta.
        var versions = await db.CvVersions.Where(v => v.JobOfferId == offer.Id).ToListAsync(cancellationToken);
        foreach (var version in versions)
        {
            version.JobOfferId = null;
        }

        db.JobOffers.Remove(offer);
        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    private static OfferView OfferViewOf(JobOffer offer, OfferAnalysis analysis, BankData bank) =>
        new(offer.Id, offer.Title, offer.Company, offer.SourceUrl, offer.RawText, analysis,
            OfferAnalyzer.Evidence(analysis, bank), OfferAnalyzer.HardFilters(offer.RawText, bank), offer.CreatedAt);

    // ───────────────────────────── Versiones ─────────────────────────────
    public async Task<Result<IReadOnlyList<CvVersionSummary>>> ListVersionsAsync(CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var versions = await db.CvVersions.Where(v => v.ProfileId == profile.Value.Id).OrderByDescending(v => v.UpdatedAt).ToListAsync(cancellationToken);
        return versions.Select(SummaryOf).ToList();
    }

    public async Task<Result<CvVersionView>> GetVersionAsync(Guid versionId, CancellationToken cancellationToken)
    {
        var loaded = await LoadVersionAsync(versionId, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        return await ViewAsync(loaded.Value.Version, loaded.Value.Document, ReportOf(loaded.Value.Version), cancellationToken);
    }

    public async Task<Result<CvVersionView>> GenerateAsync(GenerateCvInput input, CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var notes = await owners.GetNotesAsync(profile.Value, cancellationToken);
        var errors = new FieldErrors();
        var bank = await LoadBankAsync(profile.Value, cancellationToken);
        var level = errors.OneOf("level", input.Level, CvLimits.Levels.ToArray(), CvLimits.SuggestLevel(bank.Data.ProfessionalYears()));
        var paper = errors.OneOf("paper", input.Paper, CvLimits.Papers.ToArray(), notes.PreferredPaper.Length > 0 ? notes.PreferredPaper : "letter");
        var language = errors.OneOf("language", input.Language, CvLimits.Languages.ToArray(), "es");
        var focus = errors.OptionalLine("focus", input.Focus, HuellaLimits.CvVersion.Focus);
        var name = errors.OptionalLine("name", input.Name, HuellaLimits.CvVersion.Name);
        if (errors.Any)
        {
            return HuellaErrors.Invalid(errors.ToDictionary());
        }

        if (!bank.Data.AllAchievements().Any())
        {
            return HuellaErrors.CvRequiresAchievements;
        }

        var versionCount = await db.CvVersions.CountAsync(v => v.ProfileId == profile.Value.Id, cancellationToken);
        if (versionCount >= MaxVersions)
        {
            errors.Add("name", $"Puede guardar hasta {MaxVersions} versiones. Elimine alguna para crear otra.");
            return HuellaErrors.Invalid(errors.ToDictionary());
        }

        JobOffer? offer = null;
        string analysisText;
        var isFocus = false;
        if (input.OfferId is { } offerId)
        {
            offer = await db.JobOffers.SingleOrDefaultAsync(o => o.Id == offerId && o.ProfileId == profile.Value.Id, cancellationToken);
            if (offer is null)
            {
                return HuellaErrors.NotFound;
            }

            analysisText = offer.RawText;
        }
        else
        {
            analysisText = focus ?? string.Empty;
            isFocus = true;
        }

        var analysis = OfferAnalyzer.Analyze(analysisText, isFocus, bank.Data);
        var limits = CvLimits.For(level, paper);
        var document = CvComposer.Compose(bank.Data, new CvRequestOptions(level, paper, language), analysis, limits);
        var report = BuildReport(document, bank.Data, limits, language, analysis, analysisText, CvLayout.Fit(document, limits));

        var now = clock.UtcNow;
        var defaultName = offer is not null ? $"{offer.Title}{(offer.Company is null ? string.Empty : " · " + offer.Company)}" : (focus ?? "CV general");
        var version = new CvVersion
        {
            Id = Guid.CreateVersion7(),
            ProfileId = profile.Value.Id,
            PairId = await AcceptPairAsync(input.PairId, profile.Value.Id, cancellationToken),
            JobOfferId = offer?.Id,
            Name = Trim(name ?? defaultName, HuellaLimits.CvVersion.Name),
            Level = level,
            Paper = paper,
            Language = language,
            Mode = offer is not null ? "offer" : "general",
            Focus = focus,
            Source = "rules",
            CreatedAt = now,
            UpdatedAt = now,
        };
        Apply(version, document, report, limits);
        db.CvVersions.Add(version);
        await db.SaveChangesAsync(cancellationToken);
        return await ViewAsync(version, document, report, cancellationToken);
    }

    public async Task<Result<CvVersionView>> EditLineAsync(Guid versionId, EditLineInput input, CancellationToken cancellationToken)
    {
        var loaded = await LoadVersionAsync(versionId, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var (version, document) = loaded.Value;
        var before = HuellaJson.Deserialize<CvDocument>(version.ContentJson)!;
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        var bank = await LoadBankAsync(profile.Value, cancellationToken);
        var limits = CvLimits.For(version.Level, version.Paper, version.Format);
        var text = TextInput.CleanLine(input.Text);

        if (input.Target == "summary")
        {
            if (CvGuardian.ValidateSummary(text, bank.Data, limits) is { } reason)
            {
                return HuellaErrors.LineRejected(reason);
            }

            document.Summary = text;
        }
        else if (input.Target == "bullet")
        {
            var entries = input.Section switch { "experience" => document.Experience, "projects" => document.Projects, _ => null };
            if (entries is null || input.Entry is not { } entryIndex || entryIndex < 0 || entryIndex >= entries.Count
                || input.Index is not { } bulletIndex || bulletIndex < 0 || bulletIndex >= entries[entryIndex].Bullets.Count)
            {
                return HuellaErrors.NotFound;
            }

            var ids = (input.SourceIds ?? []).Distinct().ToList();
            var bullet = entries[entryIndex].Bullets[bulletIndex];
            if (ids.Count == 0)
            {
                ids = bullet.SourceIds;
            }

            if (CvGuardian.ValidateBullet(text, ids, bank.Data, limits) is { } reason)
            {
                return HuellaErrors.LineRejected(reason);
            }

            bullet.Text = text;
            bullet.SourceIds = ids;
        }
        else
        {
            return HuellaErrors.Invalid(new Dictionary<string, string[]> { ["target"] = ["Indique qué línea editar."] });
        }

        var previous = ReportOf(version);
        var report = new CvReport(CvGuardian.Checks(document, bank.Data, limits, version.Language), previous.FitLog, previous.Evidence, previous.HardFilters);
        version.Source = version.Source == "ai" ? "ai" : "manual";
        await RecordPairAsync(version, before, document, cancellationToken);
        Apply(version, document, report, limits);
        version.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return await ViewAsync(version, document, report, cancellationToken);
    }

    /// <summary>
    /// Edición libre: reemplaza el documento por el que la persona dejó (<see cref="CvFreeEdit"/>), sin tope de caracteres, de
    /// viñetas ni de páginas y sin el guardián de cifras. El PDF y el Word salen de este documento tal cual. Las
    /// comprobaciones del reporte se recalculan (son informativas).
    /// </summary>
    public async Task<Result<CvVersionView>> SaveDocumentAsync(Guid versionId, CvDocumentInput input, CancellationToken cancellationToken)
    {
        var loaded = await LoadVersionAsync(versionId, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var (version, current) = loaded.Value;
        var built = CvFreeEdit.Build(input, current);
        if (built.IsFailure)
        {
            return built.Error;
        }

        var document = built.Value;
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        var bank = await LoadBankAsync(profile.Value, cancellationToken);
        var limits = CvLimits.For(version.Level, version.Paper, version.Format);
        var previous = ReportOf(version);
        var fitLog = previous.FitLog.Where(line => line != FreeEditNote).Append(FreeEditNote).ToList();
        var report = new CvReport(CvGuardian.Checks(document, bank.Data, limits, version.Language), fitLog, previous.Evidence, previous.HardFilters);
        version.Source = version.Source == "ai" ? "ai" : "manual";
        await RecordPairAsync(version, current, document, cancellationToken);
        Apply(version, document, report, limits);
        version.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return await ViewAsync(version, document, report, cancellationToken);
    }

    private const string FreeEditNote = "Edición libre: el contenido lo decide la persona; no se aplicó el ajuste automático de páginas ni el tope de caracteres.";

    public async Task<Result<CvVersionView>> RenameAsync(Guid versionId, RenameInput input, CancellationToken cancellationToken)
    {
        var loaded = await LoadVersionAsync(versionId, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var errors = new FieldErrors();
        var name = errors.RequiredLine("name", input.Name, HuellaLimits.CvVersion.Name);
        if (errors.Any)
        {
            return HuellaErrors.Invalid(errors.ToDictionary());
        }

        loaded.Value.Version.Name = name;
        loaded.Value.Version.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return await ViewAsync(loaded.Value.Version, loaded.Value.Document, ReportOf(loaded.Value.Version), cancellationToken);
    }

    /// <summary>Marca una versión como el CV público (solo una a la vez) o la desmarca.</summary>
    public async Task<Result<CvVersionView>> SetPublicAsync(Guid versionId, bool isPublic, CancellationToken cancellationToken)
    {
        var loaded = await LoadVersionAsync(versionId, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var version = loaded.Value.Version;
        if (isPublic)
        {
            var others = await db.CvVersions.Where(v => v.ProfileId == version.ProfileId && v.IsPublic && v.Id != version.Id).ToListAsync(cancellationToken);
            foreach (var other in others)
            {
                other.IsPublic = false;
            }
        }

        version.IsPublic = isPublic;
        version.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return await ViewAsync(version, loaded.Value.Document, ReportOf(version), cancellationToken);
    }

    /// <summary>Marca una versión como enviada (o la desmarca). Enviarla a una oferta guardada la pasa a «postulada».</summary>
    public async Task<Result<CvVersionView>> SetSentAsync(Guid versionId, bool sent, CancellationToken cancellationToken)
    {
        var loaded = await LoadVersionAsync(versionId, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var version = loaded.Value.Version;
        version.SentAt = sent ? clock.UtcNow : null;
        version.UpdatedAt = clock.UtcNow;
        if (sent)
        {
            await tracking.MarkAppliedAsync(version.JobOfferId, version.ProfileId, cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
        return await ViewAsync(version, loaded.Value.Document, ReportOf(version), cancellationToken);
    }

    public async Task<Result> DeleteVersionAsync(Guid versionId, CancellationToken cancellationToken)
    {
        var loaded = await LoadVersionAsync(versionId, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        db.CvVersions.Remove(loaded.Value.Version);
        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    // ───────────────────────────── CV con IA desde el banco ─────────────────────────────
    private sealed record ComposeContext(
        Profile Profile,
        AiBank Bank,
        CvComposeRequest Request,
        CvVersion? Existing,
        JobOffer? Offer,
        string? Focus,
        string? Name);

    private async Task<Result<ComposeContext>> PrepareComposeAsync(AiTaskInput input, CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var loaded = await LoadBankAsync(profile.Value, cancellationToken);
        if (!loaded.Bank.HasContent)
        {
            return HuellaErrors.CvRequiresContent;
        }

        var errors = new FieldErrors();
        CvVersion? existing = null;
        if (input.VersionId is { } versionId)
        {
            existing = await db.CvVersions.SingleOrDefaultAsync(v => v.Id == versionId && v.ProfileId == profile.Value.Id, cancellationToken);
            if (existing is null)
            {
                return HuellaErrors.NotFound;
            }
        }

        string level;
        string paper;
        string format;
        List<string> languages;
        if (existing is not null)
        {
            (level, paper, format, languages) = (existing.Level, existing.Paper, existing.Format, [existing.Language]);
        }
        else
        {
            var notes = await owners.GetNotesAsync(profile.Value, cancellationToken);
            level = errors.OneOf("level", input.Level, CvLimits.Levels.ToArray(), CvLimits.SuggestLevel(loaded.Data.ProfessionalYears()));
            paper = errors.OneOf("paper", input.Paper, CvLimits.Papers.ToArray(), notes.PreferredPaper.Length > 0 ? notes.PreferredPaper : "letter");
            format = errors.OneOf("format", input.Format, CvFormats.All.ToArray(), CvFormats.Standard);
            languages = (input.Languages ?? [])
                .Select(l => (l ?? string.Empty).Trim().ToLowerInvariant())
                .Where(l => CvLimits.Languages.Contains(l))
                .Distinct()
                .ToList();
            if (languages.Count == 0)
            {
                errors.Add("languages", "Elija si quiere el CV en español, en inglés o en ambos.");
            }
        }

        var focus = existing is not null ? existing.Focus : errors.OptionalLine("focus", input.Focus, HuellaLimits.CvVersion.Focus);
        var name = errors.OptionalLine("name", input.Name, HuellaLimits.CvVersion.Name);
        if (errors.Any)
        {
            return HuellaErrors.Invalid(errors.ToDictionary());
        }

        JobOffer? offer = null;
        if ((existing?.JobOfferId ?? input.OfferId) is { } offerId)
        {
            offer = await db.JobOffers.SingleOrDefaultAsync(o => o.Id == offerId && o.ProfileId == profile.Value.Id, cancellationToken);
            if (offer is null)
            {
                return HuellaErrors.NotFound;
            }
        }

        return new ComposeContext(profile.Value, loaded.Bank, new CvComposeRequest(level, paper, languages, format, CvPolish.MentionsAi(offer?.RawText ?? focus)), existing, offer, offer is null ? focus : null, name);
    }

    /// <summary>Prompt del CV: oferta (o enfoque) y banco en crudo. Es el mismo texto para el proveedor configurado y para una IA externa.</summary>
    public async Task<Result<AiTaskPackage>> ComposePackageAsync(AiTaskInput input, CancellationToken cancellationToken)
    {
        var context = await PrepareComposeAsync(input, cancellationToken);
        if (context.IsFailure)
        {
            return context.Error;
        }

        var c = context.Value;
        var analysis = OfferAnalyzer.Analyze(c.Offer?.RawText ?? c.Focus ?? string.Empty, isFocus: c.Offer is null, c.Bank.Data);
        var package = CvAiCompose.BuildPackage(c.Bank, analysis, c.Offer?.RawText, c.Focus, c.Request);
        var languages = string.Join("-", c.Request.Languages);
        return new AiTaskPackage("cv", $"CV ({string.Join(" + ", c.Request.Languages.Select(l => l.ToUpperInvariant()))})", $"huella-cv-{c.Request.Level}-{languages}", package.Prompt, package.Schema);
    }

    /// <summary>Aplica la respuesta de la IA: crea una versión por idioma (o reemplaza la versión indicada), siempre tras el guardián y el ajuste a página.</summary>
    public async Task<Result<AiTaskOutcome>> ComposeApplyAsync(AiTaskInput input, string? raw, Error invalid, CancellationToken cancellationToken)
    {
        var context = await PrepareComposeAsync(input, cancellationToken);
        if (context.IsFailure)
        {
            return context.Error;
        }

        var c = context.Value;
        var analysisText = c.Offer?.RawText ?? c.Focus ?? string.Empty;
        var analysis = OfferAnalyzer.Analyze(analysisText, isFocus: c.Offer is null, c.Bank.Data);
        var (composed, rejected) = CvAiCompose.Parse(raw, c.Bank, c.Request, analysis);
        if (composed.Count == 0)
        {
            return rejected.Count == 0 ? invalid : new AiTaskOutcome("cv", 0, rejected, [], []);
        }

        if (c.Existing is null)
        {
            var versionCount = await db.CvVersions.CountAsync(v => v.ProfileId == c.Profile.Id, cancellationToken);
            if (versionCount + composed.Count > MaxVersions)
            {
                return HuellaErrors.Invalid(new Dictionary<string, string[]> { ["name"] = [$"Puede guardar hasta {MaxVersions} versiones. Elimine alguna para crear otra."] });
            }
        }

        var limits = CvLimits.For(c.Request.Level, c.Request.Paper, c.Request.Format);
        var now = clock.UtcNow;
        var defaultName = c.Offer is not null ? $"{c.Offer.Title}{(c.Offer.Company is null ? string.Empty : " · " + c.Offer.Company)}" : (c.Focus ?? "CV general");
        if (c.Request.IsCompetencies)
        {
            defaultName += " · Competencias";
        }
        else if (c.Request.IsCombined)
        {
            defaultName += " · Competencias y habilidades";
        }

        var ids = new List<Guid>();
        // Las dos versiones (español e inglés) que se generan juntas quedan emparejadas para mantenerse al día entre sí.
        Guid? pairId = c.Existing is null && composed.Count == 2 ? Guid.CreateVersion7() : null;
        foreach (var item in composed)
        {
            var log = CvLayout.Fit(item.Document, limits);
            var report = BuildReport(item.Document, c.Bank.Data, limits, item.Language, analysis, analysisText, log);
            var version = c.Existing;
            if (version is null)
            {
                var baseName = c.Name ?? defaultName;
                version = new CvVersion
                {
                    Id = Guid.CreateVersion7(),
                    ProfileId = c.Profile.Id,
                    PairId = pairId,
                    JobOfferId = c.Offer?.Id,
                    Name = Trim(composed.Count > 1 ? $"{baseName} · {item.Language.ToUpperInvariant()}" : baseName, HuellaLimits.CvVersion.Name),
                    Level = c.Request.Level,
                    Paper = c.Request.Paper,
                    Language = item.Language,
                    Format = c.Request.Format,
                    Mode = c.Offer is not null ? "offer" : "general",
                    Focus = c.Focus,
                    CreatedAt = now,
                };
                db.CvVersions.Add(version);
            }

            version.Source = "ai";
            version.UpdatedAt = now;
            Apply(version, item.Document, report, limits);
            ids.Add(version.Id);
        }

        await db.SaveChangesAsync(cancellationToken);
        return new AiTaskOutcome("cv", composed.Count, rejected, ids, []);
    }

    // ───────────────────────────── PDF (CCR-2) ─────────────────────────────
    public async Task<Result<byte[]>> RenderPdfAsync(Guid versionId, CancellationToken cancellationToken)
    {
        var loaded = await LoadVersionAsync(versionId, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var (version, document) = loaded.Value;
        return await renderer.RenderPdfAsync(document, new CvRequestOptions(version.Level, version.Paper, version.Language), cancellationToken);
    }

    // ───────────────────────────── Word (.docx) ─────────────────────────────
    /// <summary>El mismo CV como archivo Word. No depende del motor del PDF: siempre está disponible.</summary>
    public async Task<Result<byte[]>> RenderDocxAsync(Guid versionId, CancellationToken cancellationToken)
    {
        var loaded = await LoadVersionAsync(versionId, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var (version, document) = loaded.Value;
        return CvDocx.Build(document, new CvRequestOptions(version.Level, version.Paper, version.Language));
    }

    // ───────────────────────────── Apoyo ─────────────────────────────
    private sealed record LoadedBank(BankData Data, AiBank Bank);

    private async Task<LoadedBank> LoadBankAsync(Profile profile, CancellationToken cancellationToken)
    {
        var notes = await owners.GetNotesAsync(profile, cancellationToken);
        var records = await loader.LoadAsync(profile.Id, cancellationToken);
        var bank = new AiBank(profile, notes, records, clock.UtcNow.Year, DateOnly.FromDateTime(clock.UtcNow.UtcDateTime));
        return new LoadedBank(bank.Data, bank);
    }

    private async Task<Result<(CvVersion Version, CvDocument Document)>> LoadVersionAsync(Guid versionId, CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var version = await db.CvVersions.SingleOrDefaultAsync(v => v.Id == versionId && v.ProfileId == profile.Value.Id, cancellationToken);
        var document = version is null ? null : HuellaJson.Deserialize<CvDocument>(version.ContentJson);
        return version is null || document is null ? HuellaErrors.NotFound : (version, document);
    }

    private static CvReport BuildReport(CvDocument document, BankData bank, CvLimits limits, string language, OfferAnalysis analysis, string text, IReadOnlyList<string> log) =>
        new(CvGuardian.Checks(document, bank, limits, language), log, OfferAnalyzer.Evidence(analysis, bank), OfferAnalyzer.HardFilters(text, bank));

    private static void Apply(CvVersion version, CvDocument document, CvReport report, CvLimits limits)
    {
        version.ContentJson = HuellaJson.Serialize(document);
        version.ReportJson = HuellaJson.Serialize(report);
        version.Pages = (short)CvLayout.EstimatedPages(document, limits);
        version.LinesUsed = (decimal)CvLayout.Total(document, limits);
        version.LineBudget = limits.CapacityLu;
    }

    private static CvReport ReportOf(CvVersion version) =>
        HuellaJson.Deserialize<CvReport>(version.ReportJson) ?? new CvReport([], [], [], []);

    private async Task<CvVersionView> ViewAsync(CvVersion version, CvDocument document, CvReport report, CancellationToken cancellationToken)
    {
        CvPairView? pair = null;
        if (version.PairId is { } pairId)
        {
            var twin = await db.CvVersions.AsNoTracking()
                .Where(v => v.ProfileId == version.ProfileId && v.PairId == pairId && v.Id != version.Id)
                .Select(v => new { v.Id, v.Language, v.Name, v.PairPendingJson })
                .FirstOrDefaultAsync(cancellationToken);
            if (twin is not null)
            {
                pair = new CvPairView(twin.Id, twin.Language, twin.Name, !string.IsNullOrEmpty(version.PairPendingJson), !string.IsNullOrEmpty(twin.PairPendingJson));
            }
        }

        return new(SummaryOf(version), document, report, CvGuardian.AtsText(document, version.Language), renderer.IsAvailable, pair);
    }

    // ───────────────────────────── Versiones emparejadas (español / inglés) ─────────────────────────────
    /// <summary>Acepta el id de pareja de una generación en dos idiomas solo si aún no tiene las dos versiones.</summary>
    private async Task<Guid?> AcceptPairAsync(Guid? pairId, Guid profileId, CancellationToken cancellationToken) =>
        pairId is { } id && await db.CvVersions.CountAsync(v => v.ProfileId == profileId && v.PairId == id, cancellationToken) < 2 ? id : null;

    /// <summary>
    /// Anota en la versión hermana (si la hay) las secciones que esta edición cambió. Se guarda con el mismo
    /// <c>SaveChanges</c> que el cambio; la IA las refleja después (<see cref="SyncPairAsync"/>).
    /// </summary>
    private async Task RecordPairAsync(CvVersion version, CvDocument before, CvDocument after, CancellationToken cancellationToken)
    {
        if (version.PairId is not { } pairId)
        {
            return;
        }

        var twin = await db.CvVersions.FirstOrDefaultAsync(v => v.ProfileId == version.ProfileId && v.PairId == pairId && v.Id != version.Id, cancellationToken);
        if (twin is not null)
        {
            twin.PairPendingJson = CvPairSync.WritePending(CvPairSync.Record(CvPairSync.ReadPending(twin.PairPendingJson), before, after));
        }
    }

    /// <summary>
    /// Pone al día esta versión con lo que se cambió en su pareja (la generada junta en el otro idioma): la IA configurada
    /// deja las secciones afectadas como traducción fiel de las del origen y conserva el resto tal cual. Todo se valida
    /// (misma estructura, ninguna cifra nueva); lo que no pasa se rechaza y queda pendiente para reintentar.
    /// </summary>
    public async Task<Result<AiTaskOutcome>> SyncPairAsync(Guid versionId, CancellationToken cancellationToken)
    {
        var loaded = await LoadVersionAsync(versionId, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var (target, targetDoc) = loaded.Value;
        var pending = CvPairSync.ReadPending(target.PairPendingJson);
        if (target.PairId is not { } pairId || pending.Count == 0)
        {
            return HuellaErrors.PairNothingPending;
        }

        var source = await db.CvVersions.FirstOrDefaultAsync(v => v.ProfileId == target.ProfileId && v.PairId == pairId && v.Id != target.Id, cancellationToken);
        var sourceDoc = source is null ? null : HuellaJson.Deserialize<CvDocument>(source.ContentJson);
        if (source is null || sourceDoc is null)
        {
            target.PairId = null;
            target.PairPendingJson = null;
            await db.SaveChangesAsync(cancellationToken);
            return HuellaErrors.PairMissing;
        }

        var plan = CvPairSync.Plan(sourceDoc, targetDoc, pending, source.Language, target.Language);
        string? raw = null;
        if (plan.Prompt is not null)
        {
            var profile = await owners.GetOrCreateAsync(cancellationToken);
            if (profile.IsFailure)
            {
                return profile.Error;
            }

            var answer = await ai.RunAsync(profile.Value, plan.Prompt, cancellationToken);
            if (answer.IsFailure)
            {
                return answer.Error;
            }

            raw = answer.Value;
        }

        var result = CvPairSync.Apply(plan, raw);
        if (result.Applied.Count == 0)
        {
            return new AiTaskOutcome("cv-sync", 0, result.Rejected, [], []);
        }

        var built = CvFreeEdit.Build(result.Input, targetDoc);
        if (built.IsFailure)
        {
            return new AiTaskOutcome("cv-sync", 0, [..result.Rejected, "El resultado no pasó la limpieza del texto."], [], []);
        }

        var document = built.Value;
        var ownerProfile = await owners.GetOrCreateAsync(cancellationToken);
        var bank = await LoadBankAsync(ownerProfile.Value, cancellationToken);
        var limits = CvLimits.For(target.Level, target.Paper, target.Format);
        var previous = ReportOf(target);
        var fitLog = previous.FitLog.Where(line => line != FreeEditNote).Append(FreeEditNote).ToList();
        var report = new CvReport(CvGuardian.Checks(document, bank.Data, limits, target.Language), fitLog, previous.Evidence, previous.HardFilters);
        Apply(target, document, report, limits);
        target.PairPendingJson = CvPairSync.WritePending(result.Remaining);
        target.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return new AiTaskOutcome("cv-sync", result.Applied.Count, result.Rejected, [target.Id], result.Applied);
    }

    private static CvVersionSummary SummaryOf(CvVersion v) =>
        new(v.Id, v.Name, v.Level, v.Paper, v.Language, v.Format, v.Mode, v.Source, v.Pages, v.LinesUsed, v.LineBudget, v.IsPublic, v.SentAt, v.JobOfferId, v.CreatedAt, v.UpdatedAt);

    private static string Trim(string value, int max) => value.Length > max ? value[..max] : value;
}
