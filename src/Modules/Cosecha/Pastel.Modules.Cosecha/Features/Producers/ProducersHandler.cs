using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Cosecha.Common;
using Pastel.Modules.Cosecha.Domain;
using Pastel.Modules.Cosecha.Domain.Rules;
using Pastel.Modules.Cosecha.Persistence;
using Pastel.Platform.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha.Features.Producers;

internal sealed record PhoneInput(string? Phone, string? Label, bool IsPrimary);

internal sealed record ProducerRequest(
    string? Name, string? PickupPoint, decimal? Latitude, decimal? Longitude, string? MapUrl, string? Notes, Guid? UserId, IReadOnlyList<PhoneInput>? Phones, uint Version);

internal sealed record ArchiveRequest(bool Archived, uint Version);

internal sealed record CapacityRequest(decimal? EstimatedCapacityKg, string? Note);

internal sealed record PhoneDto(string Phone, string? Label, bool IsPrimary);

internal sealed record ProducerListItem(Guid Id, string Name, string? PickupPoint, IReadOnlyList<PhoneDto> Phones, bool IsArchived, decimal? CapacityKg, uint Version);

internal sealed record CapacityDto(Guid SeasonId, string SeasonName, decimal EstimatedCapacityKg);

internal sealed record ProducerDetail(
    Guid Id, string Name, string? PickupPoint, decimal? Latitude, decimal? Longitude, string? MapUrl, string? Notes, Guid? UserId, bool IsArchived,
    IReadOnlyList<PhoneDto> Phones, IReadOnlyList<CapacityDto> Capacities, uint Version);

internal sealed class ProducersHandler(CosechaDbContext db, Stamper stamper, ChangeLog changeLog)
{
    private const int MaxPhones = 5;

    public async Task<PagedResult<ProducerListItem>> ListAsync(string? search, bool includeArchived, Guid? seasonId, PageRequest page, CancellationToken ct)
    {
        var query = db.Producers.AsNoTracking().Where(p => includeArchived || p.ArchivedAt == null);
        if (Texts.Clean(search) is { } term)
        {
            var normalized = Texts.Normalize(term);
            var digits = new string(term.Where(char.IsAsciiDigit).ToArray());
            query = digits.Length >= 3
                ? query.Where(p => p.NormalizedName.Contains(normalized) || db.ProducerPhones.Any(ph => ph.ProducerId == p.Id && ph.Phone.Contains(digits)))
                : query.Where(p => p.NormalizedName.Contains(normalized));
        }

        var total = await query.CountAsync(ct);
        var producers = await query.OrderBy(p => p.Name).Skip(page.Skip).Take(page.PageSize).ToListAsync(ct);
        var ids = producers.Select(p => p.Id).ToList();
        var phones = await db.ProducerPhones.AsNoTracking().Where(ph => ids.Contains(ph.ProducerId)).OrderBy(ph => ph.SortOrder).ToListAsync(ct);
        var capacities = seasonId is null
            ? []
            : await db.ProducerCapacities.AsNoTracking().Where(c => c.SeasonId == seasonId && ids.Contains(c.ProducerId)).ToListAsync(ct);

        var items = producers.Select(p => new ProducerListItem(
            p.Id,
            p.Name,
            p.PickupPoint,
            phones.Where(ph => ph.ProducerId == p.Id).Select(ToDto).ToList(),
            p.ArchivedAt is not null,
            capacities.FirstOrDefault(c => c.ProducerId == p.Id)?.EstimatedCapacityKg,
            p.Version)).ToList();
        return new PagedResult<ProducerListItem>(items, page.Page, page.PageSize, total);
    }

    public async Task<Result<ProducerDetail>> GetAsync(Guid id, CancellationToken ct) =>
        await DetailResultAsync(id, ct);

    public async Task<Result<ProducerDetail>> CreateAsync(ProducerRequest request, CancellationToken ct)
    {
        var errors = new FieldErrors();
        var input = Validate(errors, request);
        if (errors.Any)
        {
            return errors.ToError("cosecha.producer.invalid");
        }

        var producer = stamper.Created(new Producer
        {
            Name = input.Name,
            NormalizedName = Texts.Normalize(input.Name),
            PickupPoint = input.PickupPoint,
            Latitude = input.Latitude,
            Longitude = input.Longitude,
            MapUrl = input.MapUrl,
            Notes = input.Notes,
            UserId = request.UserId,
        });
        db.Producers.Add(producer);
        foreach (var phone in input.Phones)
        {
            phone.ProducerId = producer.Id;
            db.ProducerPhones.Add(phone);
        }

        await db.SaveChangesAsync(ct);
        return await DetailResultAsync(producer.Id, ct);
    }

    public async Task<Result<ProducerDetail>> UpdateAsync(Guid id, ProducerRequest request, CancellationToken ct)
    {
        var errors = new FieldErrors();
        var input = Validate(errors, request);
        if (errors.Any)
        {
            return errors.ToError("cosecha.producer.invalid");
        }

        // Teléfonos: se borran y se reinsertan en dos guardados dentro de una transacción, para no chocar con los
        // índices únicos parciales (un solo principal por productor) a mitad del lote.
        var found = await TransactionRunner.RunSerializableAsync(
            db,
            async token =>
            {
                var producer = await db.Producers.FirstOrDefaultAsync(p => p.Id == id, token);
                if (producer is null)
                {
                    return false;
                }

                db.Expect(producer, request.Version);
                producer.Name = input.Name;
                producer.NormalizedName = Texts.Normalize(input.Name);
                producer.PickupPoint = input.PickupPoint;
                producer.Latitude = input.Latitude;
                producer.Longitude = input.Longitude;
                producer.MapUrl = input.MapUrl;
                producer.Notes = input.Notes;
                producer.UserId = request.UserId;
                stamper.Updated(producer);
                db.ProducerPhones.RemoveRange(await db.ProducerPhones.Where(ph => ph.ProducerId == id).ToListAsync(token));
                await db.SaveChangesAsync(token);

                foreach (var phone in input.Phones)
                {
                    phone.ProducerId = id;
                    db.ProducerPhones.Add(phone);
                }

                await db.SaveChangesAsync(token);
                return true;
            },
            ct);
        return found ? await DetailResultAsync(id, ct) : CosechaErrors.NotFound;
    }

    /// <summary>Archiva o restaura. Un productor nunca se borra: su historial de entregas y pagos debe conservarse.</summary>
    public async Task<Result<ProducerDetail>> ArchiveAsync(Guid id, ArchiveRequest request, CancellationToken ct)
    {
        var producer = await db.Producers.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (producer is null)
        {
            return CosechaErrors.NotFound;
        }

        db.Expect(producer, request.Version);
        producer.ArchivedAt = request.Archived ? stamper.Now : null;
        stamper.Updated(producer);
        await db.SaveChangesAsync(ct);
        return await DetailResultAsync(id, ct);
    }

    /// <summary>Capacidad estimada de un productor en una temporada: base del reparto. Cada cambio queda en el registro de cambios.</summary>
    public async Task<Result<CapacityDto>> SetCapacityAsync(Guid producerId, Guid seasonId, CapacityRequest request, CancellationToken ct)
    {
        var errors = new FieldErrors();
        var kg = errors.RequiredDecimal("estimatedCapacityKg", request.EstimatedCapacityKg, 0m, 10_000_000m);
        var note = errors.OptionalText("note", request.Note, 500);
        if (errors.Any)
        {
            return errors.ToError("cosecha.producer.invalid");
        }

        var season = await db.Seasons.AsNoTracking().FirstOrDefaultAsync(s => s.Id == seasonId, ct);
        if (season is null || !await db.Producers.AnyAsync(p => p.Id == producerId, ct))
        {
            return CosechaErrors.NotFound;
        }

        var existing = await db.ProducerCapacities.FirstOrDefaultAsync(c => c.ProducerId == producerId && c.SeasonId == seasonId, ct);
        if (existing is null)
        {
            db.ProducerCapacities.Add(new ProducerSeasonCapacity
            {
                ProducerId = producerId,
                SeasonId = seasonId,
                EstimatedCapacityKg = kg!.Value,
                UpdatedAt = stamper.Now,
                UpdatedBy = stamper.UserId,
            });
        }
        else
        {
            changeLog.Record(nameof(Producer), producerId, Texts.Truncate($"Capacidad estimada ({season.Name})", 60), existing.EstimatedCapacityKg, kg, note);
            existing.EstimatedCapacityKg = kg!.Value;
            existing.UpdatedAt = stamper.Now;
            existing.UpdatedBy = stamper.UserId;
        }

        await db.SaveChangesAsync(ct);
        return new CapacityDto(seasonId, season.Name, kg.Value);
    }

    private async Task<Result<ProducerDetail>> DetailResultAsync(Guid id, CancellationToken ct) =>
        await DetailAsync(id, ct) is { } detail ? detail : CosechaErrors.NotFound;

    private async Task<ProducerDetail?> DetailAsync(Guid id, CancellationToken ct)
    {
        var p = await db.Producers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p is null)
        {
            return null;
        }

        var phones = await db.ProducerPhones.AsNoTracking().Where(ph => ph.ProducerId == id).OrderBy(ph => ph.SortOrder).ToListAsync(ct);
        var capacities = await db.ProducerCapacities.AsNoTracking().Where(c => c.ProducerId == id).ToListAsync(ct);
        var seasons = await db.Seasons.AsNoTracking().ToDictionaryAsync(s => s.Id, s => s.Name, ct);
        return new ProducerDetail(
            p.Id,
            p.Name,
            p.PickupPoint,
            p.Latitude,
            p.Longitude,
            p.MapUrl,
            p.Notes,
            p.UserId,
            p.ArchivedAt is not null,
            phones.Select(ToDto).ToList(),
            capacities.Select(c => new CapacityDto(c.SeasonId, seasons.GetValueOrDefault(c.SeasonId) ?? string.Empty, c.EstimatedCapacityKg)).OrderBy(c => c.SeasonName).ToList(),
            p.Version);
    }

    private static PhoneDto ToDto(ProducerPhone ph) => new(ph.Phone, ph.Label, ph.IsPrimary);

    private static ProducerInput Validate(FieldErrors errors, ProducerRequest request)
    {
        var name = errors.RequiredText("name", request.Name, 2, 150);
        var pickup = errors.OptionalText("pickupPoint", request.PickupPoint, 200);
        var (latitude, longitude) = errors.OptionalCoordinates(request.Latitude, request.Longitude);
        var mapUrl = errors.OptionalHttpUrl("mapUrl", request.MapUrl, 500);
        var notes = errors.OptionalText("notes", request.Notes, 1000);
        var phones = ParsePhones(errors, request.Phones);
        return new ProducerInput(name ?? string.Empty, pickup, latitude, longitude, mapUrl, notes, phones);
    }

    private static List<ProducerPhone> ParsePhones(FieldErrors errors, IReadOnlyList<PhoneInput>? inputs)
    {
        var rows = new List<ProducerPhone>();
        if (inputs is null || inputs.Count == 0)
        {
            errors.Add("phones", "Agregue al menos un teléfono.");
            return rows;
        }

        if (inputs.Count > MaxPhones)
        {
            errors.Add("phones", $"Se admiten hasta {MaxPhones} teléfonos.");
            return rows;
        }

        for (var i = 0; i < inputs.Count; i++)
        {
            if (!CostaRicaPhone.TryNormalize(inputs[i].Phone, out var phone))
            {
                errors.Add($"phones[{i}]", "Use 8 dígitos de Costa Rica (por ejemplo 8888 1234).");
                continue;
            }

            if (rows.Any(r => r.Phone == phone))
            {
                errors.Add($"phones[{i}]", "Este teléfono está repetido.");
                continue;
            }

            rows.Add(new ProducerPhone { ProducerId = Guid.Empty, Phone = phone, Label = errors.OptionalText($"phones[{i}].label", inputs[i].Label, 40), IsPrimary = inputs[i].IsPrimary, SortOrder = i });
        }

        if (rows.Count(r => r.IsPrimary) > 1)
        {
            errors.Add("phones", "Solo un teléfono puede ser el principal.");
        }
        else if (rows.Count > 0 && !rows.Any(r => r.IsPrimary))
        {
            rows[0].IsPrimary = true;
        }

        return rows;
    }

    private sealed record ProducerInput(
        string Name, string? PickupPoint, decimal? Latitude, decimal? Longitude, string? MapUrl, string? Notes, List<ProducerPhone> Phones);
}
