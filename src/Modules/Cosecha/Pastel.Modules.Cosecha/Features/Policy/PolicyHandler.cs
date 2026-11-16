using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Cosecha.Common;
using Pastel.Modules.Cosecha.Domain;
using Pastel.Modules.Cosecha.Domain.Rules;
using Pastel.Modules.Cosecha.Persistence;
using Pastel.Platform.Auditing;
using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha.Features.Policy;

internal sealed record PaymentPolicyRequest(
    DateOnly? EffectiveFrom, decimal? AdvancePct, decimal? ReferencePricePerKg, decimal? GradeBWeightPct, decimal? FundPct,
    decimal? ManagementPct, decimal? MaxAdvancePct, short? PaymentWeekday, bool Ratified, string? Note);

internal sealed record ClaimsPolicyRequest(
    DateOnly? EffectiveFrom, int? ClaimWindowHours, short? RequiredPhotos, decimal? TolerancePct, decimal? MajorClaimPct, decimal? CreditPctRot,
    decimal? CreditPctDiscoloration, int? AckHours, int? ResolutionDays, int? MajorResolutionDays, bool Ratified, string? Note);

internal sealed record PaymentPolicyDto(
    Guid Id, DateOnly EffectiveFrom, decimal? AdvancePct, decimal? ReferencePricePerKg, decimal? GradeBWeightPct, decimal? FundPct,
    decimal? ManagementPct, decimal? MaxAdvancePct, short? PaymentWeekday, bool Ratified, string? Note, DateTimeOffset CreatedAt, string? CreatedByName)
{
    public static PaymentPolicyDto From(PaymentPolicyVersion v) => new(
        v.Id, v.EffectiveFrom, v.AdvancePct, v.ReferencePricePerKg, v.GradeBWeightPct, v.FundPct, v.ManagementPct, v.MaxAdvancePct,
        v.PaymentWeekday, v.Ratified, v.Note, v.CreatedAt, v.CreatedByName);
}

internal sealed record ClaimsPolicyDto(
    Guid Id, DateOnly EffectiveFrom, int? ClaimWindowHours, short? RequiredPhotos, decimal? TolerancePct, decimal? MajorClaimPct, decimal? CreditPctRot,
    decimal? CreditPctDiscoloration, int? AckHours, int? ResolutionDays, int? MajorResolutionDays, bool Ratified, string? Note, DateTimeOffset CreatedAt, string? CreatedByName)
{
    public static ClaimsPolicyDto From(ClaimsPolicyVersion v) => new(
        v.Id, v.EffectiveFrom, v.ClaimWindowHours, v.RequiredPhotos, v.TolerancePct, v.MajorClaimPct, v.CreditPctRot, v.CreditPctDiscoloration,
        v.AckHours, v.ResolutionDays, v.MajorResolutionDays, v.Ratified, v.Note, v.CreatedAt, v.CreatedByName);
}

/// <summary>Vigente = la versión más reciente cuya vigencia ya empezó. <c>Payment</c> y <c>Claims</c> son <c>null</c> mientras nadie registre valores: no se asume ninguno.</summary>
internal sealed record PolicyOverview(
    PaymentPolicyDto? Payment, IReadOnlyList<PaymentPolicyDto> PaymentHistory, ClaimsPolicyDto? Claims, IReadOnlyList<ClaimsPolicyDto> ClaimsHistory);

internal sealed class PolicyHandler(CosechaDbContext db, Stamper stamper, IAuditTrail audit)
{
    private const int HistoryLimit = 50;

    public async Task<PolicyOverview> GetAsync(CancellationToken ct)
    {
        var today = CostaRicaTime.Today(stamper.Now);
        var payment = await db.PaymentPolicies.AsNoTracking().OrderByDescending(v => v.EffectiveFrom).ThenByDescending(v => v.CreatedAt).Take(HistoryLimit).ToListAsync(ct);
        var claims = await db.ClaimsPolicies.AsNoTracking().OrderByDescending(v => v.EffectiveFrom).ThenByDescending(v => v.CreatedAt).Take(HistoryLimit).ToListAsync(ct);
        return new PolicyOverview(
            payment.Where(v => v.EffectiveFrom <= today).Select(PaymentPolicyDto.From).FirstOrDefault(),
            payment.Select(PaymentPolicyDto.From).ToList(),
            claims.Where(v => v.EffectiveFrom <= today).Select(ClaimsPolicyDto.From).FirstOrDefault(),
            claims.Select(ClaimsPolicyDto.From).ToList());
    }

    /// <summary>Publica una versión nueva de los parámetros de pago. Las versiones no se editan: se agrega otra con su vigencia.</summary>
    public async Task<Result<PaymentPolicyDto>> PublishPaymentAsync(PaymentPolicyRequest request, CancellationToken ct)
    {
        var errors = new FieldErrors();
        var effectiveFrom = CheckCommon(errors, request.EffectiveFrom, request.Ratified, request.Note, out var note, out var early);
        var advance = errors.OptionalDecimal("advancePct", request.AdvancePct, 0m, 100m);
        var reference = errors.OptionalDecimal("referencePricePerKg", request.ReferencePricePerKg, 0m, 1_000_000m);
        var gradeB = errors.OptionalDecimal("gradeBWeightPct", request.GradeBWeightPct, 0m, 100m);
        var fund = errors.OptionalDecimal("fundPct", request.FundPct, 0m, 100m);
        var management = errors.OptionalDecimal("managementPct", request.ManagementPct, 0m, 100m);
        var maxAdvance = errors.OptionalDecimal("maxAdvancePct", request.MaxAdvancePct, 0m, 100m);
        if (request.PaymentWeekday is < 1 or > 7)
        {
            errors.Add("paymentWeekday", "Indique un día de 1 (lunes) a 7 (domingo).");
        }

        if (early is not null)
        {
            return early;
        }

        if (errors.Any)
        {
            return errors.ToError("cosecha.policy.invalid");
        }

        var version = new PaymentPolicyVersion
        {
            EffectiveFrom = effectiveFrom!.Value,
            AdvancePct = advance,
            ReferencePricePerKg = reference,
            GradeBWeightPct = gradeB,
            FundPct = fund,
            ManagementPct = management,
            MaxAdvancePct = maxAdvance,
            PaymentWeekday = request.PaymentWeekday,
            Ratified = request.Ratified,
            Note = note,
            CreatedAt = stamper.Now,
            CreatedBy = stamper.UserId,
            CreatedByName = stamper.UserName is { } name ? Texts.Truncate(name, 100) : null,
        };
        db.PaymentPolicies.Add(version);
        await db.SaveChangesAsync(ct);
        var dto = PaymentPolicyDto.From(version);
        await audit.WriteAsync(new AuditRecord("cosecha.policy.payment_published", "cosecha", stamper.UserId, Target: version.Id.ToString(), After: dto), ct);
        return dto;
    }

    public async Task<Result<ClaimsPolicyDto>> PublishClaimsAsync(ClaimsPolicyRequest request, CancellationToken ct)
    {
        var errors = new FieldErrors();
        var effectiveFrom = CheckCommon(errors, request.EffectiveFrom, request.Ratified, request.Note, out var note, out var early);
        var window = CheckWhole(errors, "claimWindowHours", request.ClaimWindowHours, 1, 720);
        var photos = CheckWhole(errors, "requiredPhotos", request.RequiredPhotos, 0, 10);
        var tolerance = errors.OptionalDecimal("tolerancePct", request.TolerancePct, 0m, 100m);
        var major = errors.OptionalDecimal("majorClaimPct", request.MajorClaimPct, 0m, 100m);
        var rot = errors.OptionalDecimal("creditPctRot", request.CreditPctRot, 0m, 100m);
        var discoloration = errors.OptionalDecimal("creditPctDiscoloration", request.CreditPctDiscoloration, 0m, 100m);
        var ack = CheckWhole(errors, "ackHours", request.AckHours, 1, 720);
        var resolution = CheckWhole(errors, "resolutionDays", request.ResolutionDays, 1, 90);
        var majorResolution = CheckWhole(errors, "majorResolutionDays", request.MajorResolutionDays, 1, 90);
        if (tolerance is not null && major is not null && tolerance > major)
        {
            errors.Add("tolerancePct", "La tolerancia no puede superar el umbral de reclamo mayor.");
        }

        if (early is not null)
        {
            return early;
        }

        if (errors.Any)
        {
            return errors.ToError("cosecha.policy.invalid");
        }

        var version = new ClaimsPolicyVersion
        {
            EffectiveFrom = effectiveFrom!.Value,
            ClaimWindowHours = window,
            RequiredPhotos = (short?)photos,
            TolerancePct = tolerance,
            MajorClaimPct = major,
            CreditPctRot = rot,
            CreditPctDiscoloration = discoloration,
            AckHours = ack,
            ResolutionDays = resolution,
            MajorResolutionDays = majorResolution,
            Ratified = request.Ratified,
            Note = note,
            CreatedAt = stamper.Now,
            CreatedBy = stamper.UserId,
            CreatedByName = stamper.UserName is { } name ? Texts.Truncate(name, 100) : null,
        };
        db.ClaimsPolicies.Add(version);
        await db.SaveChangesAsync(ct);
        var dto = ClaimsPolicyDto.From(version);
        await audit.WriteAsync(new AuditRecord("cosecha.policy.claims_published", "cosecha", stamper.UserId, Target: version.Id.ToString(), After: dto), ct);
        return dto;
    }

    /// <summary>Vigencia no anterior a hoy (no se reescribe lo ya calculado) y nota obligatoria si se declara ratificado.</summary>
    private DateOnly? CheckCommon(FieldErrors errors, DateOnly? effectiveFrom, bool ratified, string? rawNote, out string? note, out Error? early)
    {
        early = null;
        note = errors.OptionalText("note", rawNote, 500);
        if (errors.RequiredDate("effectiveFrom", effectiveFrom) is { } date && date < CostaRicaTime.Today(stamper.Now))
        {
            early = CosechaErrors.PolicyBackdated;
        }

        if (ratified && note is null)
        {
            early ??= CosechaErrors.PolicyRatificationNoteRequired;
        }

        return effectiveFrom;
    }

    private static int? CheckWhole(FieldErrors errors, string field, int? value, int min, int max)
    {
        if (value is { } number && (number < min || number > max))
        {
            errors.Add(field, $"Indique un número entre {min} y {max}.");
            return null;
        }

        return value;
    }
}

/// <summary>Consulta compartida de la política de pago vigente (la usa la recepción para fijar la fecha prevista de pago).</summary>
internal static class PolicyQueries
{
    public static Task<PaymentPolicyVersion?> CurrentPaymentAsync(CosechaDbContext db, DateOnly today, CancellationToken ct) =>
        db.PaymentPolicies.AsNoTracking().Where(v => v.EffectiveFrom <= today).OrderByDescending(v => v.EffectiveFrom).ThenByDescending(v => v.CreatedAt).FirstOrDefaultAsync(ct);
}
