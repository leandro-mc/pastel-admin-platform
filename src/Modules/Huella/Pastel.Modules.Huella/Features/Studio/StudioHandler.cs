using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Huella.Ai;
using Pastel.Modules.Huella.Cv;
using Pastel.Modules.Huella.Domain;
using Pastel.Modules.Huella.Features.Bank;
using Pastel.Modules.Huella.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Huella.Features.Studio;

/// <summary>
/// Estudio de CV: ofertas, generación determinista desde el banco, edición validada por el guardián de verdad,
/// versiones, y los paquetes de IA en modo manual. La IA solo devuelve JSON; nada de lo que llega se guarda sin validar.
/// </summary>
internal sealed class StudioHandler(HuellaDbContext db, OwnerProfiles owners, BankLoader loader, ICvRenderer renderer, AiAssistant ai, IClock clock)
{
    public const int MaxOffers = 50;
    public const int MaxVersions = 60;

    // ───────────────────────────── Ofertas ─────────────────────────────
    public async Task<Result<IReadOnlyList<OfferSummary>>> ListOffersAsync(CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var offers = await db.JobOffers.Where(o => o.ProfileId == profile.Value.Id).OrderByDescending(o => o.CreatedAt).ToListAsync(cancellationToken);
        return offers.Select(o => new OfferSummary(o.Id, o.Title, o.Company, o.CreatedAt)).ToList();
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
        return loaded.IsFailure ? loaded.Error : ViewOf(loaded.Value.Version, loaded.Value.Document, ReportOf(loaded.Value.Version));
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
        var language = errors.OneOf("language", input.Language, CvLimits.Languages.ToArray(), notes.PreferredLanguage.Length > 0 ? notes.PreferredLanguage : "es");
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
        return ViewOf(version, document, report);
    }

    public async Task<Result<CvVersionView>> EditLineAsync(Guid versionId, EditLineInput input, CancellationToken cancellationToken)
    {
        var loaded = await LoadVersionAsync(versionId, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var (version, document) = loaded.Value;
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        var bank = await LoadBankAsync(profile.Value, cancellationToken);
        var limits = CvLimits.For(version.Level, version.Paper);
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
        Apply(version, document, report, limits);
        version.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return ViewOf(version, document, report);
    }

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
        return ViewOf(loaded.Value.Version, loaded.Value.Document, ReportOf(loaded.Value.Version));
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
        return ViewOf(version, loaded.Value.Document, ReportOf(version));
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

    // ───────────────────────────── IA en modo manual ─────────────────────────────
    public async Task<Result<AiPackageView>> AiPackageAsync(Guid versionId, CancellationToken cancellationToken)
    {
        var loaded = await LoadVersionAsync(versionId, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var (version, document) = loaded.Value;
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        var bank = await LoadBankAsync(profile.Value, cancellationToken);
        var (analysis, _) = await AnalysisOfAsync(version, bank.Data, cancellationToken);
        var package = AiPackages.ForCvDraft(document, bank.Data, analysis, CvLimits.For(version.Level, version.Paper), version.Language);
        return new AiPackageView(package.Task, package.Prompt, package.Schema);
    }

    public async Task<Result<AiApplyView>> ApplyAiResultAsync(Guid versionId, AiResultInput input, CancellationToken cancellationToken)
    {
        var loaded = await LoadVersionAsync(versionId, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var profile = await owners.GetOrCreateAsync(cancellationToken);
        return await ApplyAsync(loaded.Value.Version, loaded.Value.Document, profile.Value, input.Json, HuellaErrors.AiResultInvalid, cancellationToken);
    }

    /// <summary>IA automática: arma el mismo paquete que el modo manual, lo envía al proveedor activo y aplica la respuesta validada.</summary>
    public async Task<Result<AiApplyView>> RunAiAsync(Guid versionId, CancellationToken cancellationToken)
    {
        var package = await AiPackageAsync(versionId, cancellationToken);
        if (package.IsFailure)
        {
            return package.Error;
        }

        var profile = await owners.GetOrCreateAsync(cancellationToken);
        var answer = await ai.RunAsync(profile.Value, package.Value.Prompt, cancellationToken);
        if (answer.IsFailure)
        {
            return answer.Error;
        }

        var loaded = await LoadVersionAsync(versionId, cancellationToken);
        return loaded.IsFailure
            ? loaded.Error
            : await ApplyAsync(loaded.Value.Version, loaded.Value.Document, profile.Value, answer.Value, HuellaErrors.AiProviderInvalidJson, cancellationToken);
    }

    private async Task<Result<AiApplyView>> ApplyAsync(CvVersion version, CvDocument document, Profile profile, string? raw, Error invalid, CancellationToken cancellationToken)
    {
        using var json = CvAiResult.TryParse(raw);
        if (json is null)
        {
            return invalid;
        }

        var bank = await LoadBankAsync(profile, cancellationToken);
        var limits = CvLimits.For(version.Level, version.Paper);
        var outcome = CvAiResult.ApplyDraft(json, document, bank.Data, limits);
        if (outcome.Accepted == 0)
        {
            return new AiApplyView(ViewOf(version, document, ReportOf(version)), 0, outcome.Rejected);
        }

        var (analysis, text) = await AnalysisOfAsync(version, bank.Data, cancellationToken);
        var log = CvLayout.Fit(document, limits);
        var report = BuildReport(document, bank.Data, limits, version.Language, analysis, text, log);
        version.Source = "ai";
        Apply(version, document, report, limits);
        version.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return new AiApplyView(ViewOf(version, document, report), outcome.Accepted, outcome.Rejected);
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

    // ───────────────────────────── Apoyo ─────────────────────────────
    private sealed record LoadedBank(BankData Data);

    private async Task<LoadedBank> LoadBankAsync(Profile profile, CancellationToken cancellationToken)
    {
        var notes = await owners.GetNotesAsync(profile, cancellationToken);
        var records = await loader.LoadAsync(profile.Id, cancellationToken);
        return new LoadedBank(BankLoader.ToBankData(profile, notes, records, clock.UtcNow.Year));
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

    /// <summary>Análisis de la oferta (o del enfoque) con que se generó una versión, vuelto a calcular contra el banco actual.</summary>
    private async Task<(OfferAnalysis Analysis, string Text)> AnalysisOfAsync(CvVersion version, BankData bank, CancellationToken cancellationToken)
    {
        var text = version.Focus ?? string.Empty;
        var isFocus = true;
        if (version.JobOfferId is { } offerId)
        {
            var offer = await db.JobOffers.SingleOrDefaultAsync(o => o.Id == offerId && o.ProfileId == version.ProfileId, cancellationToken);
            if (offer is not null)
            {
                text = offer.RawText;
                isFocus = false;
            }
        }

        return (OfferAnalyzer.Analyze(text, isFocus, bank), text);
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

    private CvVersionView ViewOf(CvVersion version, CvDocument document, CvReport report) =>
        new(SummaryOf(version), document, report, CvGuardian.AtsText(document, version.Language), renderer.IsAvailable);

    private static CvVersionSummary SummaryOf(CvVersion v) =>
        new(v.Id, v.Name, v.Level, v.Paper, v.Language, v.Mode, v.Source, v.Pages, v.LinesUsed, v.LineBudget, v.IsPublic, v.JobOfferId, v.CreatedAt, v.UpdatedAt);

    private static string Trim(string value, int max) => value.Length > max ? value[..max] : value;
}
