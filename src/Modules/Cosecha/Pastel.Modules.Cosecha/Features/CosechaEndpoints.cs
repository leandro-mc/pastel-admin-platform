using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Pastel.Modules.Cosecha.Common;
using Pastel.Modules.Cosecha.Documents;
using Pastel.Modules.Cosecha.Features.Buyers;
using Pastel.Modules.Cosecha.Features.Orders;
using Pastel.Modules.Cosecha.Features.Policy;
using Pastel.Modules.Cosecha.Features.Producers;
using Pastel.Modules.Cosecha.Features.Reports;
using Pastel.Modules.Cosecha.Features.Settlements;
using Pastel.Modules.Cosecha.Features.Shipments;
using Pastel.Modules.Cosecha.Features.Today;
using Pastel.Modules.Cosecha.Features.Products;
using Pastel.Modules.Cosecha.Features.Seasons;
using Pastel.Platform.Errors;

namespace Pastel.Modules.Cosecha.Features;

/// <summary>
/// Punto único donde se enlazan los recursos de <c>Features/</c> con las rutas <c>/api/cosecha/*</c>. Cada recurso expone
/// <c>Map(IEndpointRouteBuilder)</c> y su manejador se registra en <see cref="AddCosechaFeatures"/>.
/// </summary>
internal static class CosechaEndpoints
{
    public static IServiceCollection AddCosechaFeatures(this IServiceCollection services)
    {
        services.AddScoped<Stamper>();
        services.AddScoped<ChangeLog>();
        services.AddSingleton<IUniqueViolationSource, CosechaUniqueViolations>();
        services.AddSingleton<ICosechaDocuments, UnavailableCosechaDocuments>();
        services.AddScoped<ProductsHandler>();
        services.AddScoped<SeasonsHandler>();
        services.AddScoped<PolicyHandler>();
        services.AddScoped<ProducersHandler>();
        services.AddScoped<BuyersHandler>();
        services.AddScoped<OrderQueries>();
        services.AddScoped<OrdersHandler>();
        services.AddScoped<MyOrdersHandler>();
        services.AddScoped<ShipmentQueries>();
        services.AddScoped<ShipmentsHandler>();
        services.AddScoped<AllocationHandler>();
        services.AddScoped<ReceptionHandler>();
        services.AddScoped<SettlementsHandler>();
        services.AddScoped<ReportsHandler>();
        services.AddScoped<TodayHandler>();
        return services;
    }

    public static void Map(IEndpointRouteBuilder api)
    {
        ProductsEndpoint.Map(api.MapGroup("/products"));
        SeasonsEndpoint.Map(api.MapGroup("/seasons"));
        PolicyEndpoint.Map(api.MapGroup("/policy"));
        ProducersEndpoint.Map(api.MapGroup("/producers"));
        BuyersEndpoint.Map(api.MapGroup("/buyers"));
        OrdersEndpoint.Map(api.MapGroup("/orders"));
        MyOrdersEndpoint.Map(api.MapGroup("/my"));
        ShipmentsEndpoint.Map(api.MapGroup("/shipments"));
        SettlementsEndpoint.Map(api.MapGroup("/settlements"));
        ReportsEndpoint.Map(api.MapGroup("/reports"));
        TodayEndpoint.Map(api);
    }
}

/// <summary>Índices únicos de Cosecha que la persona usuaria puede provocar, con el campo y el mensaje que se le muestran.</summary>
internal sealed class CosechaUniqueViolations : IUniqueViolationSource
{
    public void Register(UniqueViolationMap map)
    {
        map.Register("ux_products_normalized_name", "name", "Ya existe un producto con ese nombre.");
        map.Register("ux_seasons_normalized_name", "name", "Ya existe una temporada con ese nombre.");
    }
}
