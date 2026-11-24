using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Huella.Ai;
using Pastel.Modules.Huella.Cv;
using Pastel.Modules.Huella.Domain;
using Pastel.Modules.Huella.Features.AiTasks;
using Pastel.Modules.Huella.Features.Studio;
using Pastel.Modules.Huella.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Huella.Features.Emails;

internal sealed record EmailSummary(
    Guid Id,
    string Name,
    string Language,
    string Tone,
    string Source,
    DateTimeOffset? SentAt,
    Guid? OfferId,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

/// <summary><c>Body</c> es el cuerpo completo en texto plano (saludo, párrafos, despedida y firma), tal como se copia o se envía.</summary>
internal sealed record EmailView(EmailSummary Summary, EmailDoc Document, string Body);

/// <summary>Edición de un correo: destinatario (opcional), asunto, saludo, párrafos y despedida. La firma sale del banco.</summary>
internal sealed record EmailEditInput(
    string? To,
    string? Subject,
    string? Greeting,
    IReadOnlyList<string>? Paragraphs,
    string? Closing);

/// <summary>
/// Correos de postulación: redacción con IA desde el banco en crudo y la oferta (las mismas tres vías que el CV y la carta),
/// edición validada por el guardián de verdad y envío (que actualiza el historial de la oferta). El CV siempre va adjunto.
/// </summary>
internal sealed class EmailHandler(HuellaDbContext db, OwnerProfiles owners, BankLoader loader, OfferTracking tracking, IClock clock)
{
    public const int MaxEmails = 150;

    /// <summary>Tope duro del cuerpo al editar a mano; el recomendado (<see cref="EmailLimits.MaxTotal"/>) solo lo aplica la IA.</summary>
    private const int HardTotal = 2000;

    // ───────────────────────────── Lectura y edición ─────────────────────────────
    public async Task<Result<IReadOnlyList<EmailSummary>>> ListAsync(CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var emails = await db.ApplicationEmails.Where(e => e.ProfileId == profile.Value.Id).OrderByDescending(e => e.UpdatedAt).ToListAsync(cancellationToken);
        return emails.Select(SummaryOf).ToList();
    }

    public async Task<Result<EmailView>> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var loaded = await LoadAsync(id, cancellationToken);
        return loaded.IsFailure ? loaded.Error : ViewOf(loaded.Value.Email, loaded.Value.Document);
    }

    public async Task<Result<EmailView>> SaveAsync(Guid id, EmailEditInput input, CancellationToken cancellationToken)
    {
        var loaded = await LoadAsync(id, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var (email, document) = loaded.Value;
        var errors = new FieldErrors();
        var subject = errors.RequiredLine("subject", input.Subject, EmailLimits.Subject);
        var greeting = errors.RequiredLine("greeting", input.Greeting, EmailLimits.Greeting);
        var closing = errors.RequiredLine("closing", input.Closing, EmailLimits.Closing);
        var to = errors.OptionalLine("to", input.To, EmailLimits.Address) ?? string.Empty;
        if (to.Length > 0 && !EmailFormat.IsAddress(to))
        {
            errors.Add("to", "Escriba un correo válido (por ejemplo, seleccion@empresa.com) o déjelo vacío.");
        }

        var paragraphs = new List<string>();
        var source = input.Paragraphs ?? [];
        if (source.Count is < EmailLimits.MinParagraphs or > EmailLimits.MaxParagraphs)
        {
            errors.Add("paragraphs", $"El correo lleva entre {EmailLimits.MinParagraphs} y {EmailLimits.MaxParagraphs} párrafos.");
        }

        for (var i = 0; i < Math.Min(source.Count, EmailLimits.MaxParagraphs); i++)
        {
            paragraphs.Add(errors.RequiredLine($"paragraphs[{i}]", source[i], EmailLimits.Paragraph));
        }

        if (!errors.Any && paragraphs.Sum(p => p.Length) > HardTotal)
        {
            errors.Add("paragraphs", $"El correo es demasiado largo: acórtelo (hasta unos {EmailLimits.MaxTotal} caracteres entre todos los párrafos se lee mejor).");
        }

        if (!errors.Any)
        {
            // Guardián de verdad: ninguna cifra que no esté en el banco o en la oferta.
            var profile = await owners.GetOrCreateAsync(cancellationToken);
            var notes = await owners.GetNotesAsync(profile.Value, cancellationToken);
            var records = await loader.LoadAsync(profile.Value.Id, cancellationToken);
            var bank = new AiBank(profile.Value, notes, records, clock.UtcNow.Year);
            var offerText = email.JobOfferId is { } offerId
                ? await db.JobOffers.Where(o => o.Id == offerId).Select(o => o.RawText).SingleOrDefaultAsync(cancellationToken) ?? string.Empty
                : string.Empty;
            var known = bank.Numbers.Concat(AchievementRules.Numbers(offerText)).ToHashSet(StringComparer.Ordinal);
            for (var i = 0; i < paragraphs.Count; i++)
            {
                if (CvGuardian.ValidateWritten(paragraphs[i], EmailLimits.Paragraph, known, bank.Data) is { } reason)
                {
                    errors.Add($"paragraphs[{i}]", reason);
                }
            }
        }

        if (errors.Any)
        {
            return HuellaErrors.Invalid(errors.ToDictionary());
        }

        document.To = to;
        document.Subject = subject;
        document.Greeting = greeting;
        document.Paragraphs = paragraphs;
        document.Closing = closing;
        email.ContentJson = HuellaJson.Serialize(document);
        email.Source = "manual";
        email.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return ViewOf(email, document);
    }

    public async Task<Result<EmailView>> RenameAsync(Guid id, RenameInput input, CancellationToken cancellationToken)
    {
        var loaded = await LoadAsync(id, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var errors = new FieldErrors();
        var name = errors.RequiredLine("name", input.Name, EmailLimits.Name);
        if (errors.Any)
        {
            return HuellaErrors.Invalid(errors.ToDictionary());
        }

        loaded.Value.Email.Name = name;
        loaded.Value.Email.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return ViewOf(loaded.Value.Email, loaded.Value.Document);
    }

    /// <summary>Marca el correo como enviado (o lo desmarca). Enviarlo a una oferta guardada la pasa a «postulada».</summary>
    public async Task<Result<EmailView>> SetSentAsync(Guid id, bool sent, CancellationToken cancellationToken)
    {
        var loaded = await LoadAsync(id, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        var email = loaded.Value.Email;
        email.SentAt = sent ? clock.UtcNow : null;
        email.UpdatedAt = clock.UtcNow;
        if (sent)
        {
            await tracking.MarkAppliedAsync(email.JobOfferId, email.ProfileId, cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
        return ViewOf(email, loaded.Value.Document);
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var loaded = await LoadAsync(id, cancellationToken);
        if (loaded.IsFailure)
        {
            return loaded.Error;
        }

        db.ApplicationEmails.Remove(loaded.Value.Email);
        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    // ───────────────────────────── IA: redactar el correo ─────────────────────────────
    private sealed record Prepared(Profile Profile, AiBank Bank, JobOffer Offer, EmailRequest Request, ApplicationEmail? Existing, string? Name);

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
            return HuellaErrors.EmailRequiresContent;
        }

        ApplicationEmail? existing = null;
        if (input.VersionId is { } emailId)
        {
            existing = await db.ApplicationEmails.SingleOrDefaultAsync(e => e.Id == emailId && e.ProfileId == profile.Value.Id, cancellationToken);
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
            errors.Add("languages", "Elija si quiere el correo en español, en inglés o en ambos.");
        }

        var name = errors.OptionalLine("name", input.Name, EmailLimits.Name);
        var offerId = existing?.JobOfferId ?? input.OfferId;
        if (offerId is null)
        {
            errors.Add("offerId", "Elija la oferta a la que se postula con el correo.");
        }

        if (errors.Any)
        {
            return HuellaErrors.Invalid(errors.ToDictionary());
        }

        var offer = await db.JobOffers.SingleOrDefaultAsync(o => o.Id == offerId && o.ProfileId == profile.Value.Id, cancellationToken);
        return offer is null
            ? HuellaErrors.NotFound
            : new Prepared(profile.Value, bank, offer, new EmailRequest(languages, tone), existing, name);
    }

    /// <summary>Prompt del correo: la oferta y el banco en crudo. Es el mismo texto para el proveedor configurado y para una IA externa.</summary>
    public async Task<Result<AiTaskPackage>> ComposePackageAsync(AiTaskInput input, CancellationToken cancellationToken)
    {
        var prepared = await PrepareAsync(input, cancellationToken);
        if (prepared.IsFailure)
        {
            return prepared.Error;
        }

        var p = prepared.Value;
        var analysis = OfferAnalyzer.Analyze(p.Offer.RawText, isFocus: false, p.Bank.Data);
        var package = EmailAi.BuildPackage(p.Bank, analysis, p.Offer.RawText, p.Offer.Title, p.Offer.Company, p.Request);
        var languages = string.Join("-", p.Request.Languages);
        return new AiTaskPackage(AiTaskHandler.Email, $"Correo de postulación ({string.Join(" + ", p.Request.Languages.Select(l => l.ToUpperInvariant()))})", $"huella-correo-{languages}", package.Prompt, package.Schema);
    }

    /// <summary>Aplica la respuesta de la IA: un correo por idioma (o reemplaza el indicado), siempre tras el guardián de verdad.</summary>
    public async Task<Result<AiTaskOutcome>> ComposeApplyAsync(AiTaskInput input, string? raw, Error invalid, CancellationToken cancellationToken)
    {
        var prepared = await PrepareAsync(input, cancellationToken);
        if (prepared.IsFailure)
        {
            return prepared.Error;
        }

        var p = prepared.Value;
        var (composed, rejected) = EmailAi.Parse(raw, p.Bank, p.Offer.RawText, p.Offer.Title, p.Offer.Company, p.Request);
        if (composed.Count == 0)
        {
            return rejected.Count == 0 ? invalid : new AiTaskOutcome(AiTaskHandler.Email, 0, rejected, [], []);
        }

        if (p.Existing is null)
        {
            var count = await db.ApplicationEmails.CountAsync(e => e.ProfileId == p.Profile.Id, cancellationToken);
            if (count + composed.Count > MaxEmails)
            {
                return HuellaErrors.Invalid(new Dictionary<string, string[]> { ["name"] = [$"Puede guardar hasta {MaxEmails} correos. Elimine alguno para crear otro."] });
            }
        }

        var now = clock.UtcNow;
        var baseName = p.Name ?? $"Correo · {p.Offer.Title}{(p.Offer.Company is null ? string.Empty : " · " + p.Offer.Company)}";
        var ids = new List<Guid>();
        foreach (var item in composed)
        {
            var email = p.Existing;
            if (email is null)
            {
                email = new ApplicationEmail
                {
                    Id = Guid.CreateVersion7(),
                    ProfileId = p.Profile.Id,
                    JobOfferId = p.Offer.Id,
                    Name = Trim(composed.Count > 1 ? $"{baseName} · {item.Language.ToUpperInvariant()}" : baseName, EmailLimits.Name),
                    Language = item.Language,
                    Tone = p.Request.Tone,
                    CreatedAt = now,
                };
                db.ApplicationEmails.Add(email);
            }

            email.ContentJson = HuellaJson.Serialize(item.Document);
            email.Source = "ai";
            email.UpdatedAt = now;
            ids.Add(email.Id);
        }

        await db.SaveChangesAsync(cancellationToken);
        return new AiTaskOutcome(AiTaskHandler.Email, composed.Count, rejected, ids, []);
    }

    // ───────────────────────────── Apoyo ─────────────────────────────
    private async Task<Result<(ApplicationEmail Email, EmailDoc Document)>> LoadAsync(Guid id, CancellationToken cancellationToken)
    {
        var profile = await owners.GetOrCreateAsync(cancellationToken);
        if (profile.IsFailure)
        {
            return profile.Error;
        }

        var email = await db.ApplicationEmails.SingleOrDefaultAsync(e => e.Id == id && e.ProfileId == profile.Value.Id, cancellationToken);
        var document = email is null ? null : HuellaJson.Deserialize<EmailDoc>(email.ContentJson);
        if (email is null || document is null)
        {
            return HuellaErrors.NotFound;
        }

        return (email, document);
    }

    private static EmailView ViewOf(ApplicationEmail email, EmailDoc document) => new(SummaryOf(email), document, EmailFormat.BodyText(document));

    private static EmailSummary SummaryOf(ApplicationEmail e) =>
        new(e.Id, e.Name, e.Language, e.Tone, e.Source, e.SentAt, e.JobOfferId, e.CreatedAt, e.UpdatedAt);

    private static string Trim(string value, int max) => value.Length > max ? value[..max] : value;
}
