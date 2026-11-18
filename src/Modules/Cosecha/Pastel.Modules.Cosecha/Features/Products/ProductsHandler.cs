using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Cosecha.Common;
using Pastel.Modules.Cosecha.Domain;
using Pastel.Modules.Cosecha.Persistence;
using Pastel.SharedKernel;

namespace Pastel.Modules.Cosecha.Features.Products;

internal sealed record ProductRequest(string? Name, bool? IsActive, uint Version);

internal sealed record ProductDto(Guid Id, string Name, string Unit, bool IsActive, uint Version)
{
    public static ProductDto From(Product p) => new(p.Id, p.Name, p.Unit, p.IsActive, p.Version);
}

internal sealed class ProductsHandler(CosechaDbContext db, Stamper stamper)
{
    public async Task<IReadOnlyList<ProductDto>> ListAsync(bool includeInactive, CancellationToken ct) =>
        (await db.Products.AsNoTracking().Where(p => includeInactive || p.IsActive).OrderBy(p => p.Name).ToListAsync(ct)).Select(ProductDto.From).ToList();

    public async Task<Result<ProductDto>> CreateAsync(ProductRequest request, CancellationToken ct)
    {
        var errors = new FieldErrors();
        var name = errors.RequiredText("name", request.Name, 2, 120);
        if (errors.Any)
        {
            return errors.ToError("cosecha.product.invalid");
        }

        var normalized = Texts.Normalize(name!);
        if (await db.Products.AnyAsync(p => p.NormalizedName == normalized, ct))
        {
            return CosechaErrors.ProductNameTaken;
        }

        var product = stamper.Created(new Product { Name = name!, NormalizedName = normalized, Unit = "kg", IsActive = true });
        db.Products.Add(product);
        await db.SaveChangesAsync(ct);
        return ProductDto.From(product);
    }

    public async Task<Result<ProductDto>> UpdateAsync(Guid id, ProductRequest request, CancellationToken ct)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (product is null)
        {
            return CosechaErrors.NotFound;
        }

        var errors = new FieldErrors();
        var name = errors.RequiredText("name", request.Name, 2, 120);
        if (errors.Any)
        {
            return errors.ToError("cosecha.product.invalid");
        }

        var normalized = Texts.Normalize(name!);
        if (await db.Products.AnyAsync(p => p.NormalizedName == normalized && p.Id != id, ct))
        {
            return CosechaErrors.ProductNameTaken;
        }

        db.Expect(product, request.Version);
        product.Name = name!;
        product.NormalizedName = normalized;
        product.IsActive = request.IsActive ?? product.IsActive;
        stamper.Updated(product);
        await db.SaveChangesAsync(ct);
        return ProductDto.From(product);
    }
}
