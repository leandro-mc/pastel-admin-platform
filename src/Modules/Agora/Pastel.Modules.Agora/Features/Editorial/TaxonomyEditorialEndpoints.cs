using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Pastel.Modules.Agora.Common;
using Pastel.Modules.Agora.Domain;
using Pastel.Modules.Agora.Persistence;
using Pastel.Platform.Errors;

namespace Pastel.Modules.Agora.Features.Editorial;

internal sealed record TaxonomyInput(string? Name, string? Description, int? SortOrder);

/// <summary>Categoría o serie para el panel: lleva el <c>id</c> que necesita el editor de piezas.</summary>
internal sealed record TaxonomyItemDto(Guid Id, string Slug, string Name, string? Description, int SortOrder, int ArticleCount);

internal sealed record EditorialTaxonomyDto(IReadOnlyList<TaxonomyItemDto> Categories, IReadOnlyList<TaxonomyItemDto> Series);

/// <summary>
/// Categorías y series (<c>agora.content.manage</c>). El <c>slug</c> sale del nombre al crear y no cambia al renombrar, para no
/// romper enlaces. No se borran: una categoría con piezas no puede desaparecer.
/// </summary>
internal static class TaxonomyEditorialEndpoints
{
    public static void Map(IEndpointRouteBuilder editorial)
    {
        EditorialSupport.Manage(editorial.MapGet("/taxonomy", ListAsync));
        EditorialSupport.Manage(editorial.MapPost("/categories", CreateCategoryAsync));
        EditorialSupport.Manage(editorial.MapPut("/categories/{id:guid}", UpdateCategoryAsync));
        EditorialSupport.Manage(editorial.MapPost("/series", CreateSeriesAsync));
        EditorialSupport.Manage(editorial.MapPut("/series/{id:guid}", UpdateSeriesAsync));
    }

    private static async Task<IResult> ListAsync(AgoraDbContext db, CancellationToken cancellationToken)
    {
        var categories = await ArticleProjection.CategoriesAsync(db, cancellationToken);
        var series = await ArticleProjection.SeriesAsync(db, cancellationToken);
        var categoryRows = await db.Categories.AsNoTracking().ToListAsync(cancellationToken);
        var seriesRows = await db.Series.AsNoTracking().ToListAsync(cancellationToken);
        var dto = new EditorialTaxonomyDto(
            categories.Select(c => Item(categoryRows.First(r => r.Slug == c.Slug), c.ArticleCount)).ToList(),
            series.Select(s => Item(seriesRows.First(r => r.Slug == s.Slug), s.ArticleCount)).ToList());
        return Results.Json(dto);
    }

    private static TaxonomyItemDto Item(Category c, int count) => new(c.Id, c.Slug, c.Name, c.Description, c.SortOrder, count);

    private static TaxonomyItemDto Item(Series s, int count) => new(s.Id, s.Slug, s.Name, s.Description, s.SortOrder, count);

    private static Pastel.SharedKernel.Error? Validate(TaxonomyInput input, int maxName, out string name, out string? description)
    {
        name = (input.Name ?? string.Empty).Trim();
        description = string.IsNullOrWhiteSpace(input.Description) ? null : input.Description.Trim();
        var errors = new FieldErrors();
        if (name.Length < 2 || name.Length > maxName)
        {
            errors.Add("name", $"El nombre debe tener entre 2 y {maxName} caracteres.");
        }

        if (description is { Length: > 300 })
        {
            errors.Add("description", "La descripción admite hasta 300 caracteres.");
        }

        return errors.Any ? errors.ToError("agora.taxonomy.invalid") : null;
    }

    private static async Task<IResult> CreateCategoryAsync(TaxonomyInput input, AgoraDbContext db, HttpContext http, CancellationToken cancellationToken)
    {
        if (Validate(input, 80, out var name, out var description) is { } invalid)
        {
            return PastelProblem.From(invalid, http);
        }

        var slug = Slugs.From(name, 80);
        if (await db.Categories.AnyAsync(c => c.Slug == slug, cancellationToken))
        {
            return PastelProblem.From(AgoraErrors.TaxonomyNameTaken, http);
        }

        var category = new Category { Slug = slug, Name = name, Description = description, SortOrder = input.SortOrder ?? 0 };
        db.Categories.Add(category);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Json(Item(category, 0), statusCode: StatusCodes.Status201Created);
    }

    private static async Task<IResult> UpdateCategoryAsync(Guid id, TaxonomyInput input, AgoraDbContext db, HttpContext http, CancellationToken cancellationToken)
    {
        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (category is null)
        {
            return PastelProblem.From(AgoraErrors.CategoryNotFound, http);
        }

        if (Validate(input, 80, out var name, out var description) is { } invalid)
        {
            return PastelProblem.From(invalid, http);
        }

        var slug = Slugs.From(name, 80);
        if (await db.Categories.AnyAsync(c => c.Slug == slug && c.Id != id, cancellationToken))
        {
            return PastelProblem.From(AgoraErrors.TaxonomyNameTaken, http);
        }

        category.Name = name;
        category.Description = description;
        category.SortOrder = input.SortOrder ?? category.SortOrder;
        await db.SaveChangesAsync(cancellationToken);
        var count = await db.Articles.CountAsync(a => a.CategoryId == id && a.Status == ArticleStatus.Published, cancellationToken);
        return Results.Json(Item(category, count));
    }

    private static async Task<IResult> CreateSeriesAsync(TaxonomyInput input, AgoraDbContext db, HttpContext http, CancellationToken cancellationToken)
    {
        if (Validate(input, 100, out var name, out var description) is { } invalid)
        {
            return PastelProblem.From(invalid, http);
        }

        var slug = Slugs.From(name, 80);
        if (await db.Series.AnyAsync(s => s.Slug == slug, cancellationToken))
        {
            return PastelProblem.From(AgoraErrors.TaxonomyNameTaken, http);
        }

        var series = new Series { Slug = slug, Name = name, Description = description, SortOrder = input.SortOrder ?? 0 };
        db.Series.Add(series);
        await db.SaveChangesAsync(cancellationToken);
        return Results.Json(Item(series, 0), statusCode: StatusCodes.Status201Created);
    }

    private static async Task<IResult> UpdateSeriesAsync(Guid id, TaxonomyInput input, AgoraDbContext db, HttpContext http, CancellationToken cancellationToken)
    {
        var series = await db.Series.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (series is null)
        {
            return PastelProblem.From(AgoraErrors.SeriesNotFound, http);
        }

        if (Validate(input, 100, out var name, out var description) is { } invalid)
        {
            return PastelProblem.From(invalid, http);
        }

        var slug = Slugs.From(name, 80);
        if (await db.Series.AnyAsync(s => s.Slug == slug && s.Id != id, cancellationToken))
        {
            return PastelProblem.From(AgoraErrors.TaxonomyNameTaken, http);
        }

        series.Name = name;
        series.Description = description;
        series.SortOrder = input.SortOrder ?? series.SortOrder;
        await db.SaveChangesAsync(cancellationToken);
        var count = await db.Articles.CountAsync(a => a.SeriesId == id && a.Status == ArticleStatus.Published, cancellationToken);
        return Results.Json(Item(series, count));
    }
}
