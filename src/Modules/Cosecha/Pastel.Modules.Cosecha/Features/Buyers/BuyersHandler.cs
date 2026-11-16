using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Cosecha.Common;
using Pastel.Modules.Cosecha.Domain;
using Pastel.Modules.Cosecha.Domain.Rules;
using Pastel.Modules.Cosecha.Features.Producers;
using Pastel.Modules.Cosecha.Persistence;
using Pastel.Platform.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha.Features.Buyers;

internal sealed record ContactInput(string? Name, string? Phone, string? RoleTitle, bool IsPrimary);

/// <summary>
/// <c>UserId</c> vincula la cuenta de un comprador (solo lectura de sus pedidos). Se escribe tal cual: Cosecha no consulta a Identity
/// (sin claves ni joins entre esquemas), así que el identificador lo entrega quien administra las cuentas.
/// </summary>
internal sealed record BuyerRequest(
    string? Name, string? Address, string? Zone, decimal? Latitude, decimal? Longitude, string? MapUrl, string? DeliveryConditions, string? Notes,
    Guid? UserId, IReadOnlyList<ContactInput>? Contacts, uint Version);

internal sealed record ContactDto(string Name, string? Phone, string? RoleTitle, bool IsPrimary);

internal sealed record BuyerListItem(Guid Id, string Name, string? Zone, ContactDto? PrimaryContact, bool IsArchived, uint Version);

internal sealed record BuyerDetail(
    Guid Id, string Name, string? Address, string? Zone, decimal? Latitude, decimal? Longitude, string? MapUrl, string? DeliveryConditions, string? Notes,
    Guid? UserId, bool IsArchived, IReadOnlyList<ContactDto> Contacts, uint Version);

internal sealed class BuyersHandler(CosechaDbContext db, Stamper stamper)
{
    private const int MaxContacts = 10;

    public async Task<PagedResult<BuyerListItem>> ListAsync(string? search, bool includeArchived, PageRequest page, CancellationToken ct)
    {
        var query = db.Buyers.AsNoTracking().Where(b => includeArchived || b.ArchivedAt == null);
        if (Texts.Clean(search) is { } term)
        {
            var normalized = Texts.Normalize(term);
            query = query.Where(b => b.NormalizedName.Contains(normalized));
        }

        var total = await query.CountAsync(ct);
        var buyers = await query.OrderBy(b => b.Name).Skip(page.Skip).Take(page.PageSize).ToListAsync(ct);
        var ids = buyers.Select(b => b.Id).ToList();
        var contacts = await db.BuyerContacts.AsNoTracking().Where(c => ids.Contains(c.BuyerId)).OrderBy(c => c.SortOrder).ToListAsync(ct);
        var items = buyers.Select(b =>
        {
            var own = contacts.Where(c => c.BuyerId == b.Id).ToList();
            var primary = own.FirstOrDefault(c => c.IsPrimary) ?? own.FirstOrDefault();
            return new BuyerListItem(b.Id, b.Name, b.Zone, primary is null ? null : ToDto(primary), b.ArchivedAt is not null, b.Version);
        }).ToList();
        return new PagedResult<BuyerListItem>(items, page.Page, page.PageSize, total);
    }

    public async Task<Result<BuyerDetail>> GetAsync(Guid id, CancellationToken ct) =>
        await DetailResultAsync(id, ct);

    public async Task<Result<BuyerDetail>> CreateAsync(BuyerRequest request, CancellationToken ct)
    {
        var errors = new FieldErrors();
        var input = Validate(errors, request);
        if (errors.Any)
        {
            return errors.ToError("cosecha.buyer.invalid");
        }

        var buyer = stamper.Created(new Buyer
        {
            Name = input.Name,
            NormalizedName = Texts.Normalize(input.Name),
            Address = input.Address,
            Zone = input.Zone,
            Latitude = input.Latitude,
            Longitude = input.Longitude,
            MapUrl = input.MapUrl,
            DeliveryConditions = input.DeliveryConditions,
            Notes = input.Notes,
            UserId = request.UserId,
        });
        db.Buyers.Add(buyer);
        foreach (var contact in input.Contacts)
        {
            contact.BuyerId = buyer.Id;
            db.BuyerContacts.Add(contact);
        }

        await db.SaveChangesAsync(ct);
        return await DetailResultAsync(buyer.Id, ct);
    }

    public async Task<Result<BuyerDetail>> UpdateAsync(Guid id, BuyerRequest request, CancellationToken ct)
    {
        var errors = new FieldErrors();
        var input = Validate(errors, request);
        if (errors.Any)
        {
            return errors.ToError("cosecha.buyer.invalid");
        }

        var found = await TransactionRunner.RunSerializableAsync(
            db,
            async token =>
            {
                var buyer = await db.Buyers.FirstOrDefaultAsync(b => b.Id == id, token);
                if (buyer is null)
                {
                    return false;
                }

                db.Expect(buyer, request.Version);
                buyer.Name = input.Name;
                buyer.NormalizedName = Texts.Normalize(input.Name);
                buyer.Address = input.Address;
                buyer.Zone = input.Zone;
                buyer.Latitude = input.Latitude;
                buyer.Longitude = input.Longitude;
                buyer.MapUrl = input.MapUrl;
                buyer.DeliveryConditions = input.DeliveryConditions;
                buyer.Notes = input.Notes;
                buyer.UserId = request.UserId;
                stamper.Updated(buyer);
                db.BuyerContacts.RemoveRange(await db.BuyerContacts.Where(c => c.BuyerId == id).ToListAsync(token));
                await db.SaveChangesAsync(token);

                foreach (var contact in input.Contacts)
                {
                    contact.BuyerId = id;
                    db.BuyerContacts.Add(contact);
                }

                await db.SaveChangesAsync(token);
                return true;
            },
            ct);
        return found ? await DetailResultAsync(id, ct) : CosechaErrors.NotFound;
    }

    public async Task<Result<BuyerDetail>> ArchiveAsync(Guid id, ArchiveRequest request, CancellationToken ct)
    {
        var buyer = await db.Buyers.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (buyer is null)
        {
            return CosechaErrors.NotFound;
        }

        db.Expect(buyer, request.Version);
        buyer.ArchivedAt = request.Archived ? stamper.Now : null;
        stamper.Updated(buyer);
        await db.SaveChangesAsync(ct);
        return await DetailResultAsync(id, ct);
    }

    private async Task<Result<BuyerDetail>> DetailResultAsync(Guid id, CancellationToken ct) =>
        await DetailAsync(id, ct) is { } detail ? detail : CosechaErrors.NotFound;

    private async Task<BuyerDetail?> DetailAsync(Guid id, CancellationToken ct)
    {
        var b = await db.Buyers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (b is null)
        {
            return null;
        }

        var contacts = await db.BuyerContacts.AsNoTracking().Where(c => c.BuyerId == id).OrderBy(c => c.SortOrder).ToListAsync(ct);
        return new BuyerDetail(
            b.Id, b.Name, b.Address, b.Zone, b.Latitude, b.Longitude, b.MapUrl, b.DeliveryConditions, b.Notes, b.UserId, b.ArchivedAt is not null,
            contacts.Select(ToDto).ToList(), b.Version);
    }

    private static ContactDto ToDto(BuyerContact c) => new(c.Name, c.Phone, c.RoleTitle, c.IsPrimary);

    private static BuyerInput Validate(FieldErrors errors, BuyerRequest request)
    {
        var name = errors.RequiredText("name", request.Name, 2, 150);
        var address = errors.OptionalText("address", request.Address, 300);
        var zone = errors.OptionalText("zone", request.Zone, 100);
        var (latitude, longitude) = errors.OptionalCoordinates(request.Latitude, request.Longitude);
        var mapUrl = errors.OptionalHttpUrl("mapUrl", request.MapUrl, 500);
        var conditions = errors.OptionalText("deliveryConditions", request.DeliveryConditions, 500);
        var notes = errors.OptionalText("notes", request.Notes, 1000);
        var contacts = ParseContacts(errors, request.Contacts);
        return new BuyerInput(name ?? string.Empty, address, zone, latitude, longitude, mapUrl, conditions, notes, contacts);
    }

    private static List<BuyerContact> ParseContacts(FieldErrors errors, IReadOnlyList<ContactInput>? inputs)
    {
        var rows = new List<BuyerContact>();
        if (inputs is null || inputs.Count == 0)
        {
            errors.Add("contacts", "Agregue al menos un contacto.");
            return rows;
        }

        if (inputs.Count > MaxContacts)
        {
            errors.Add("contacts", $"Se admiten hasta {MaxContacts} contactos.");
            return rows;
        }

        for (var i = 0; i < inputs.Count; i++)
        {
            var name = errors.RequiredText($"contacts[{i}].name", inputs[i].Name, 2, 150);
            string? phone = null;
            if (Texts.Clean(inputs[i].Phone) is { } rawPhone)
            {
                if (CostaRicaPhone.TryNormalize(rawPhone, out var normalized))
                {
                    phone = normalized;
                }
                else
                {
                    errors.Add($"contacts[{i}].phone", "Use 8 dígitos de Costa Rica (por ejemplo 8888 1234).");
                }
            }

            var role = errors.OptionalText($"contacts[{i}].roleTitle", inputs[i].RoleTitle, 100);
            rows.Add(new BuyerContact { BuyerId = Guid.Empty, Name = name ?? string.Empty, Phone = phone, RoleTitle = role, IsPrimary = inputs[i].IsPrimary, SortOrder = i });
        }

        if (rows.Count(r => r.IsPrimary) > 1)
        {
            errors.Add("contacts", "Solo un contacto puede ser el principal.");
        }
        else if (rows.Count > 0 && !rows.Any(r => r.IsPrimary))
        {
            rows[0].IsPrimary = true;
        }

        return rows;
    }

    private sealed record BuyerInput(
        string Name, string? Address, string? Zone, decimal? Latitude, decimal? Longitude, string? MapUrl, string? DeliveryConditions, string? Notes,
        List<BuyerContact> Contacts);
}
