using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Cosecha.Common;
using Pastel.Platform.Security;

namespace Pastel.Modules.Cosecha.Features.Products;

/// <summary><c>/api/cosecha/products</c>: productos que se venden. Lectura con <c>catalog.read</c>; altas y cambios con <c>catalog.manage</c>.</summary>
internal static class ProductsEndpoint
{
    public static void Map(IEndpointRouteBuilder products)
    {
        products.MapGet("/", ListAsync).RequirePermission(CosechaPermissions.CatalogRead);
        products.MapPost("/", CreateAsync).RequirePermission(CosechaPermissions.CatalogManage);
        products.MapPut("/{id:guid}", UpdateAsync).RequirePermission(CosechaPermissions.CatalogManage);
    }

    private static async Task<IResult> ListAsync(bool? includeInactive, ProductsHandler handler, CancellationToken ct) =>
        Results.Json(await handler.ListAsync(includeInactive ?? false, ct));

    private static async Task<IResult> CreateAsync(ProductRequest request, ProductsHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.CreateAsync(request, ct)).ToResponse(http, StatusCodes.Status201Created);

    private static async Task<IResult> UpdateAsync(Guid id, ProductRequest request, ProductsHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.UpdateAsync(id, request, ct)).ToResponse(http);
}
