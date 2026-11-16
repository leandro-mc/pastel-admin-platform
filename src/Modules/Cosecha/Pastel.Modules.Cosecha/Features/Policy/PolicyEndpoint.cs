using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Cosecha.Common;
using Pastel.Platform.Security;

namespace Pastel.Modules.Cosecha.Features.Policy;

/// <summary>
/// <c>/api/cosecha/policy</c>: parámetros del modelo de pago y de la política de reclamos, como configuración versionada
/// (siguen pendientes de validación; no se siembra ningún valor). Lectura con <c>catalog.read</c>; publicar con <c>catalog.manage</c>.
/// </summary>
internal static class PolicyEndpoint
{
    public static void Map(IEndpointRouteBuilder policy)
    {
        policy.MapGet("/", GetAsync).RequirePermission(CosechaPermissions.CatalogRead);
        policy.MapPost("/payment", PublishPaymentAsync).RequirePermission(CosechaPermissions.CatalogManage);
        policy.MapPost("/claims", PublishClaimsAsync).RequirePermission(CosechaPermissions.CatalogManage);
    }

    private static async Task<IResult> GetAsync(PolicyHandler handler, CancellationToken ct) => Results.Json(await handler.GetAsync(ct));

    private static async Task<IResult> PublishPaymentAsync(PaymentPolicyRequest request, PolicyHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.PublishPaymentAsync(request, ct)).ToResponse(http, StatusCodes.Status201Created);

    private static async Task<IResult> PublishClaimsAsync(ClaimsPolicyRequest request, PolicyHandler handler, HttpContext http, CancellationToken ct) =>
        (await handler.PublishClaimsAsync(request, ct)).ToResponse(http, StatusCodes.Status201Created);
}
