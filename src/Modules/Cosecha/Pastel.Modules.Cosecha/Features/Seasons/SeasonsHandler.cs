using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Cosecha.Common;
using Pastel.Modules.Cosecha.Domain;
using Pastel.Modules.Cosecha.Persistence;
using Pastel.Platform.Auditing;
using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha.Features.Seasons;

internal sealed record SeasonRequest(string? Name, Guid? ProductId, DateOnly? StartsOn, DateOnly? EndsOn, decimal? DefaultProducerPricePerKg, string? Note, uint Version);

internal sealed record SeasonStatusRequest(string? Status, uint Version);

internal sealed record SeasonDto(
    Guid Id, string Name, Guid ProductId, string ProductName, DateOnly StartsOn, DateOnly EndsOn, string Status, decimal DefaultProducerPricePerKg, uint Version);

internal sealed class SeasonsHandler(CosechaDbContext db, Stamper stamper, ChangeLog changeLog, IAuditTrail audit)
{
    public async Task<IReadOnlyList<SeasonDto>> ListAsync(CancellationToken ct)
    {
        var products = await db.Products.AsNoTracking().ToDictionaryAsync(p => p.Id, p => p.Name, ct);
        var seasons = await db.Seasons.AsNoTracking().OrderByDescending(s => s.StartsOn).ThenBy(s => s.Name).ToListAsync(ct);
        return seasons.Select(s => ToDto(s, products.GetValueOrDefault(s.ProductId) ?? string.Empty)).ToList();
    }

    public async Task<Result<SeasonDto>> CreateAsync(SeasonRequest request, CancellationToken ct)
    {
        var errors = new FieldErrors();
        var input = Validate(errors, request);
        if (errors.Any)
        {
            return errors.ToError("cosecha.season.invalid");
        }

        var product = await db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == input.ProductId, ct);
        if (product is null || !product.IsActive)
        {
            errors.Add("productId", "Elija un producto activo.");
            return errors.ToError("cosecha.season.invalid");
        }

        var normalized = Texts.Normalize(input.Name);
        if (await db.Seasons.AnyAsync(s => s.NormalizedName == normalized, ct))
        {
            return CosechaErrors.SeasonNameTaken;
        }

        var season = stamper.Created(new Season
        {
            Name = input.Name,
            NormalizedName = normalized,
            ProductId = product.Id,
            StartsOn = input.StartsOn,
            EndsOn = input.EndsOn,
            Status = SeasonStatus.Active,
            DefaultProducerPricePerKg = input.Price,
        });
        db.Seasons.Add(season);
        await db.SaveChangesAsync(ct);
        return ToDto(season, product.Name);
    }

    public async Task<Result<SeasonDto>> UpdateAsync(Guid id, SeasonRequest request, CancellationToken ct)
    {
        var season = await db.Seasons.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (season is null)
        {
            return CosechaErrors.NotFound;
        }

        var errors = new FieldErrors();
        var input = Validate(errors, request with { ProductId = season.ProductId });
        if (errors.Any)
        {
            return errors.ToError("cosecha.season.invalid");
        }

        var normalized = Texts.Normalize(input.Name);
        if (await db.Seasons.AnyAsync(s => s.NormalizedName == normalized && s.Id != id, ct))
        {
            return CosechaErrors.SeasonNameTaken;
        }

        var previousPrice = season.DefaultProducerPricePerKg;
        db.Expect(season, request.Version);
        season.Name = input.Name;
        season.NormalizedName = normalized;
        season.StartsOn = input.StartsOn;
        season.EndsOn = input.EndsOn;
        season.DefaultProducerPricePerKg = input.Price;
        stamper.Updated(season);
        changeLog.Record(nameof(Season), season.Id, nameof(Season.DefaultProducerPricePerKg), previousPrice, input.Price, request.Note);
        await db.SaveChangesAsync(ct);

        if (previousPrice != input.Price)
        {
            await audit.WriteAsync(
                new AuditRecord("cosecha.season.price_changed", "cosecha", stamper.UserId, Target: season.Name, Before: new { previousPrice }, After: new { price = input.Price }), ct);
        }

        var productName = await db.Products.AsNoTracking().Where(p => p.Id == season.ProductId).Select(p => p.Name).FirstOrDefaultAsync(ct);
        return ToDto(season, productName ?? string.Empty);
    }

    /// <summary>Cierra o reabre la temporada. Una temporada cerrada no admite pedidos ni envíos nuevos.</summary>
    public async Task<Result<SeasonDto>> SetStatusAsync(Guid id, SeasonStatusRequest request, CancellationToken ct)
    {
        if (!Enum.TryParse<SeasonStatus>(request.Status, ignoreCase: true, out var status) || !Enum.IsDefined(status))
        {
            return new FieldErrors().Add("status", "Indique Active o Closed.").ToError("cosecha.season.invalid");
        }

        var season = await db.Seasons.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (season is null)
        {
            return CosechaErrors.NotFound;
        }

        var previous = season.Status;
        db.Expect(season, request.Version);
        season.Status = status;
        stamper.Updated(season);
        await db.SaveChangesAsync(ct);

        if (previous != status)
        {
            await audit.WriteAsync(
                new AuditRecord(status == SeasonStatus.Closed ? "cosecha.season.closed" : "cosecha.season.reopened", "cosecha", stamper.UserId, Target: season.Name), ct);
        }

        var productName = await db.Products.AsNoTracking().Where(p => p.Id == season.ProductId).Select(p => p.Name).FirstOrDefaultAsync(ct);
        return ToDto(season, productName ?? string.Empty);
    }

    private static SeasonInput Validate(FieldErrors errors, SeasonRequest request)
    {
        var name = errors.RequiredText("name", request.Name, 2, 120);
        var startsOn = errors.RequiredDate("startsOn", request.StartsOn);
        var endsOn = errors.RequiredDate("endsOn", request.EndsOn);
        if (startsOn is not null && endsOn is not null && endsOn < startsOn)
        {
            errors.Add("endsOn", "La fecha de fin no puede ser anterior a la de inicio.");
        }

        var price = errors.RequiredDecimal("defaultProducerPricePerKg", request.DefaultProducerPricePerKg, 0m, 1_000_000m);
        if (request.ProductId is null)
        {
            errors.Add("productId", "Elija un producto.");
        }

        return errors.Any
            ? new SeasonInput(string.Empty, Guid.Empty, default, default, 0m)
            : new SeasonInput(name!, request.ProductId!.Value, startsOn!.Value, endsOn!.Value, price!.Value);
    }

    private static SeasonDto ToDto(Season s, string productName) =>
        new(s.Id, s.Name, s.ProductId, productName, s.StartsOn, s.EndsOn, s.Status.ToString(), s.DefaultProducerPricePerKg, s.Version);

    private sealed record SeasonInput(string Name, Guid ProductId, DateOnly StartsOn, DateOnly EndsOn, decimal Price);
}
