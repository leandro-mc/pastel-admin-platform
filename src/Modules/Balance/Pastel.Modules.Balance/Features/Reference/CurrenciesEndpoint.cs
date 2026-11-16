using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Pastel.Modules.Balance.Common;
using Pastel.Modules.Balance.Domain;
using Pastel.Platform.Security;

namespace Pastel.Modules.Balance.Features.Reference;

/// <summary><c>GET /api/balance/currencies</c>: el catálogo de monedas (fuente única para la interfaz).</summary>
internal static class CurrenciesEndpoint
{
    private static readonly IReadOnlyList<CurrencyDto> Catalog =
    [
        .. CurrencyCatalog.All.Select(c => new CurrencyDto(c.Code, c.Name, c.Symbol, c.Decimals, c.SortOrder <= CurrencyCatalog.FeaturedCount)),
    ];

    public static void Map(IEndpointRouteBuilder api) =>
        api.MapGet("/currencies", () => Results.Json(Catalog)).RequirePermission(BalancePermissions.Access);
}
