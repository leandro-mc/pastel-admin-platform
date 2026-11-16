using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Huella.Ai;
using Pastel.Modules.Huella.Cv;
using Pastel.Modules.Huella.Domain;
using Pastel.Modules.Huella.Features.AiTasks;
using Pastel.Modules.Huella.Features.Studio;
using Pastel.Modules.Huella.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Huella.Features.Letters;

internal sealed record LetterSummary(
    Guid Id,
    string Name,
    string Language,
    string Tone,
    string Source,
    DateTimeOffset? SentAt,
    Guid? OfferId,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

internal sealed record LetterView(LetterSummary Summary, LetterDoc Document, bool PdfAvailable);

/// <summary>Edición del texto de una carta: asunto, saludo, párrafos y despedida. Nombre y contacto salen del banco.</summary>
internal sealed record LetterEditInput(string? Subject, string? Greeting, IReadOnlyList<string>? Paragraphs, string? Closing);

/// <summary>
/// Cartas de presentación: redacción con IA desde el banco en crudo y la oferta (las mismas tres vías que el CV), edición
/// validada por el guardián de verdad, envío (que actualiza el historial de la oferta) y descarga en PDF o Word.
/// </summary>
internal sealed class LetterHandler(HuellaDbContext db, OwnerProfiles owners, BankLoader loader, ICvRenderer renderer, OfferTracking tracking, IClock clock)
{
    public const int MaxLetters = 60;

    // ───────────────────────────── Lectura y edición ─────────────────────────────
    public async Task<Result<IReadOnlyList<LetterSummary>>> ListAsync(CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var letters = await db.CoverLetters.Where(l => l.ProfileId == profile.Value.Id).OrderByDescending(l => l.UpdatedAt).ToListAsync(cancellationToken);
        return letters.Select(SummaryOf).ToList();
    }

    public async Task<Result<LetterView>> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var loaded = await LoadAsync(id, cancellationToken);
        return loaded.IsFailure ? loaded.Error : ViewOf(loaded.Value.Letter, loaded.Value.Document);
    }

    public async Task<Result<LetterView>> SaveAsync(Guid id, LetterEditInput input, CancellationToken cancellationToken)
    {
        var loaded = await LoadAsync(id, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var (letter, document) = loaded.Value;
        var errors = new FieldErrors();
        var subject = errors.RequiredLine("subject", input.Subject, LetterLimits.Subject);
        var greeting = errors.RequiredLine("greeting", input.Greeting, LetterLimits.Greeting);
        var closing = errors.RequiredLine("closing", input.Closing, LetterLimits.Closing);
        var paragraphs = new List<string>();
        var source = input.Paragraphs ?? [];
        if (source.Count is < LetterLimits.MinParagraphs or > LetterLimits.MaxParagraphs)
        {
            errors.Add("paragraphs", $"La carta lleva entre {LetterLimits.MinParagraphs} y {LetterLimits.MaxParagraphs} párrafos.");
        }

        for (var i = 0; i < Math.Min(source.Count, LetterLimits.MaxParagraphs); i++)
        {
            paragraphs.Add(errors.RequiredLine($"paragraphs[{i}]", source[i], LetterLimits.Paragraph));
        }

        if (paragraphs.Sum(p => p.Length) > LetterLimits.Total)
        {
            errors.Add("paragraphs", $"La carta excede una página ({LetterLimits.Total} caracteres entre todos los párrafos).");
        }

        if (!errors.Any)
        {
            // Guardián de verdad: ninguna cifra que no esté en el banco o en la oferta.
            var profile = await owners.GetOrCreateAsync(cancellationToken);
            var notes = await owners.GetNotesAsync(profile.Value, cancellationToken);
            var records = await loader.LoadAsync(profile.Value.Id, cancellationToken);
            var bank = new AiBank(profile.Value, notes, records, clock.UtcNow.Year);
            var offerText = letter.JobOfferId is { } offerId
                ? await db.JobOffers.Where(o => o.Id == offerId).Select(o => o.RawText).SingleOrDefaultAsync(cancellationToken) ?? string.Empty
                : string.Empty;
            var known = bank.Numbers.Concat(AchievementRules.Numbers(offerText)).ToHashSet(StringComparer.Ordinal);
            for (var i = 0; i < paragraphs.Count; i++)
            {
                if (CvGuardian.ValidateWritten(paragraphs[i], LetterLimits.Paragraph, known, bank.Data) is { } reason)
                {
                    errors.Add($"paragraphs[{i}]", reason);
                }
            }
        }

        if (errors.Any)
        {
            return HuellaErrors.Invalid(errors.ToDictionary());
        }

        document.Subject = subject;
        document.Greeting = greeting;
        document.Paragraphs = paragraphs;
        document.Closing = closing;
        letter.ContentJson = HuellaJson.Serialize(document);
        letter.Source = "manual";
        letter.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return ViewOf(letter, document);
    }

    public async Task<Result<LetterView>> RenameAsync(Guid id, RenameInput input, CancellationToken cancellationToken)
    {
        var loaded = await LoadAsync(id, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var errors = new FieldErrors();
        var name = errors.RequiredLine("name", input.Name, LetterLimits.Name);
        if (errors.Any)
        {
            return HuellaErrors.Invalid(errors.ToDictionary());
        }

        loaded.Value.Letter.Name = name;
        loaded.Value.Letter.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return ViewOf(loaded.Value.Letter, loaded.Value.Document);
    }

    /// <summary>Marca la carta como enviada (o la desmarca). Enviarla a una oferta guardada la pasa a «postulada».</summary>
    public async Task<Result<LetterView>> SetSentAsync(Guid id, bool sent, CancellationToken cancellationToken)
    {
        var loaded = await LoadAsync(id, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var letter = loaded.Value.Letter;
        letter.SentAt = sent ? clock.UtcNow : null;
        letter.UpdatedAt = clock.UtcNow;
        if (sent)
        {
            await tracking.MarkAppliedAsync(letter.JobOfferId, letter.ProfileId, cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
        return ViewOf(letter, loaded.Value.Document);
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var loaded = await LoadAsync(id, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        db.CoverLetters.Remove(loaded.Value.Letter);
        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    // ───────────────────────────── Descarga ─────────────────────────────
    public async Task<Result<byte[]>> RenderPdfAsync(Guid id, CancellationToken cancellationToken)
    {
        var loaded = await LoadAsync(id, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        return await renderer.RenderLetterPdfAsync(loaded.Value.Document, await PaperAsync(cancellationToken), cancellationToken);
    }

    public async Task<Result<byte[]>> RenderDocxAsync(Guid id, CancellationToken cancellationToken)
    {
        var loaded = await LoadAsync(id, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        return LetterDocx.Build(loaded.Value.Document, await PaperAsync(cancellationToken));
    }

    // ───────────────────────────── IA: redactar la carta ─────────────────────────────
    private sealed record Prepared(Profile Profile, AiBank Bank, JobOffer Offer, LetterRequest Request, CoverLetter? Existing, string? Name);

    private async Task<Result<Prepared>> PrepareAsync(AiTaskInput input, CancellationToken cancellationToken)
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
            return HuellaErrors.LetterRequiresContent;
        }

        CoverLetter? existing = null;
        if (input.VersionId is { } letterId)
        {
            existing = await db.CoverLetters.SingleOrDefaultAsync(l => l.Id == letterId && l.ProfileId == profile.Value.Id, cancellationToken);
            if (existing is null)
            {
                return HuellaErrors.NotFound;
            }
        }

        var errors = new FieldErrors();
        var tone = existing?.Tone ?? errors.OneOf("tone", input.Tone, LetterLimits.Tones.ToArray(), "formal");
        var languages = existing is not null
            ? [existing.Language]
            : (input.Languages ?? []).Select(l => (l ?? string.Empty).Trim().ToLowerInvariant()).Where(l => CvLimits.Languages.Contains(l)).Distinct().ToList();
        if (languages.Count == 0)
        {
            errors.Add("languages", "Elija si quiere la carta en español, en inglés o en ambos.");
        }

        var name = errors.OptionalLine("name", input.Name, LetterLimits.Name);
        var offerId = existing?.JobOfferId ?? input.OfferId;
        if (offerId is null)
        {
            errors.Add("offerId", "Elija la oferta para la que escribe la carta.");
        }

        if (errors.Any)
        {
            return HuellaErrors.Invalid(errors.ToDictionary());
        }

        var offer = await db.JobOffers.SingleOrDefaultAsync(o => o.Id == offerId && o.ProfileId == profile.Value.Id, cancellationToken);
        return offer is null
            ? HuellaErrors.NotFound
            : new Prepared(profile.Value, bank, offer, new LetterRequest(languages, tone), existing, name);
    }

    /// <summary>Prompt de la carta: la oferta y el banco en crudo. Es el mismo texto para el proveedor configurado y para una IA externa.</summary>
    public async Task<Result<AiTaskPackage>> ComposePackageAsync(AiTaskInput input, CancellationToken cancellationToken)
    {
        var prepared = await PrepareAsync(input, cancellationToken);
        if (prepared.IsFailure)
        {
            return prepared.Error;
        }

        var p = prepared.Value;
        var analysis = OfferAnalyzer.Analyze(p.Offer.RawText, isFocus: false, p.Bank.Data);
        var package = LetterAi.BuildPackage(p.Bank, analysis, p.Offer.RawText, p.Offer.Title, p.Offer.Company, p.Request);
        var languages = string.Join("-", p.Request.Languages);
        return new AiTaskPackage(AiTaskHandler.Letter, $"Carta de presentación ({string.Join(" + ", p.Request.Languages.Select(l => l.ToUpperInvariant()))})", $"huella-carta-{languages}", package.Prompt, package.Schema);
    }

    /// <summary>Aplica la respuesta de la IA: una carta por idioma (o reemplaza la indicada), siempre tras el guardián de verdad.</summary>
    public async Task<Result<AiTaskOutcome>> ComposeApplyAsync(AiTaskInput input, string? raw, Error invalid, CancellationToken cancellationToken)
    {
        var prepared = await PrepareAsync(input, cancellationToken);
        if (prepared.IsFailure)
        {
            return prepared.Error;
        }

        var p = prepared.Value;
        var (composed, rejected) = LetterAi.Parse(raw, p.Bank, p.Offer.RawText, p.Offer.Title, p.Request);
        if (composed.Count == 0)
        {
            return rejected.Count == 0 ? invalid : new AiTaskOutcome(AiTaskHandler.Letter, 0, rejected, [], []);
        }

        if (p.Existing is null)
        {
            var count = await db.CoverLetters.CountAsync(l => l.ProfileId == p.Profile.Id, cancellationToken);
            if (count + composed.Count > MaxLetters)
            {
                return HuellaErrors.Invalid(new Dictionary<string, string[]> { ["name"] = [$"Puede guardar hasta {MaxLetters} cartas. Elimine alguna para crear otra."] });
            }
        }

        var now = clock.UtcNow;
        var baseName = p.Name ?? $"Carta · {p.Offer.Title}{(p.Offer.Company is null ? string.Empty : " · " + p.Offer.Company)}";
        var ids = new List<Guid>();
        foreach (var item in composed)
        {
            var letter = p.Existing;
            if (letter is null)
            {
                letter = new CoverLetter
                {
                    Id = Guid.CreateVersion7(),
                    ProfileId = p.Profile.Id,
                    JobOfferId = p.Offer.Id,
                    Name = Trim(composed.Count > 1 ? $"{baseName} · {item.Language.ToUpperInvariant()}" : baseName, LetterLimits.Name),
                    Language = item.Language,
                    Tone = p.Request.Tone,
                    CreatedAt = now,
                };
                db.CoverLetters.Add(letter);
            }

            letter.ContentJson = HuellaJson.Serialize(item.Document);
            letter.Source = "ai";
            letter.UpdatedAt = now;
            ids.Add(letter.Id);
        }

        await db.SaveChangesAsync(cancellationToken);
        return new AiTaskOutcome(AiTaskHandler.Letter, composed.Count, rejected, ids, []);
    }

    // ───────────────────────────── Apoyo ─────────────────────────────
    private async Task<Result<(CoverLetter Letter, LetterDoc Document)>> LoadAsync(Guid id, CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var letter = await db.CoverLetters.SingleOrDefaultAsync(l => l.Id == id && l.ProfileId == profile.Value.Id, cancellationToken);
        var document = letter is null ? null : HuellaJson.Deserialize<LetterDoc>(letter.ContentJson);
        if (letter is null || document is null)
        {
            return HuellaErrors.NotFound;
        }

        return (letter, document);
    }

    private async Task<string> PaperAsync(CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        var notes = profile.IsSuccess ? await owners.GetNotesAsync(profile.Value, cancellationToken) : null;
        return notes is { PreferredPaper.Length: > 0 } ? notes.PreferredPaper : "letter";
    }

    private LetterView ViewOf(CoverLetter letter, LetterDoc document) => new(SummaryOf(letter), document, renderer.IsAvailable);

    private static LetterSummary SummaryOf(CoverLetter l) =>
        new(l.Id, l.Name, l.Language, l.Tone, l.Source, l.SentAt, l.JobOfferId, l.CreatedAt, l.UpdatedAt);

    private static string Trim(string value, int max) => value.Length > max ? value[..max] : value;
}
